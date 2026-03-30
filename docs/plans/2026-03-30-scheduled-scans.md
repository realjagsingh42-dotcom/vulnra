# Scheduled Scans Implementation Plan

## Current State

**Already Implemented:**
- ✅ Sentinel Monitoring (`/api/monitor`) - continuous endpoint monitoring with alerts
- ✅ Celery beat tasks for periodic scans
- ✅ Webhooks for scan events

**Not Yet Implemented:**
- ❌ Scheduled one-time scans (run at specific time)
- ❌ Recurring scan schedules (more flexible than Sentinel)
- ❌ Cron-based scheduling
- ❌ Scan queue management

---

## Use Cases

1. **One-time scheduled scan** - Run a scan tomorrow at 9 AM
2. **Weekly security audit** - Scan every Monday at 9 AM
3. **Before deployment** - Schedule a scan to run before a deployment (via API)
4. **Scan chains** - Run multiple scans in sequence

---

## Database Schema

```sql
-- Scheduled scans table
CREATE TABLE IF NOT EXISTS public.scheduled_scans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  target_url      TEXT        NOT NULL,
  scan_type       TEXT        NOT NULL DEFAULT 'standard' -- 'standard', 'multi-turn', 'mcp'
  tier            TEXT        NOT NULL DEFAULT 'free',
  
  -- Schedule configuration
  schedule_type    TEXT        NOT NULL CHECK (schedule_type IN ('one-time', 'recurring', 'cron'))
  cron_expression  TEXT,       -- e.g., '0 9 * * 1' for Monday 9 AM
  run_at          TIMESTAMPTZ, -- For one-time schedules
  interval_hours  INTEGER,     -- For recurring (e.g., 24 = daily)
  
  -- Scan configuration (same as /scan endpoint)
  probes          JSONB,
  vulnerability_types JSONB,
  attack_type     TEXT,
  
  -- Status
  status          TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  next_run_at     TIMESTAMPTZ,
  last_run_at     TIMESTAMPTZ,
  last_scan_id    UUID,
  last_risk_score FLOAT,
  
  -- Notifications
  notify_on_complete BOOLEAN DEFAULT true,
  notify_email       TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- Run history
CREATE TABLE IF NOT EXISTS public.scheduled_scan_runs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_scan_id UUID      NOT NULL REFERENCES public.scheduled_scans(id) ON DELETE CASCADE,
  scan_id         UUID,       -- The actual scan ID
  status          TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  risk_score      FLOAT,
  findings_count  INTEGER,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT
);

-- Indexes
CREATE INDEX idx_scheduled_scans_user    ON public.scheduled_scans (user_id);
CREATE INDEX idx_scheduled_scans_org     ON public.scheduled_scans (org_id);
CREATE INDEX idx_scheduled_scans_next    ON public.scheduled_scans (next_run_at) WHERE status = 'active';
CREATE INDEX idx_scheduled_scan_runs_ssid ON public.scheduled_scan_runs (scheduled_scan_id);
```

---

## Backend Components

### 1. Service Layer (`app/services/scheduled_scan_service.py`)
- `create_scheduled_scan()` - Create new schedule
- `update_scheduled_scan()` - Modify schedule
- `delete_scheduled_scan()` - Cancel and delete
- `pause_scheduled_scan()` - Pause without deleting
- `resume_scheduled_scan()` - Resume paused schedule
- `get_scheduled_scans()` - List user's schedules
- `get_due_scheduled_scans()` - Get scans ready to run

### 2. API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scheduled-scans` | List scheduled scans |
| POST | `/api/scheduled-scans` | Create scheduled scan |
| GET | `/api/scheduled-scans/{id}` | Get schedule details |
| PUT | `/api/scheduled-scans/{id}` | Update schedule |
| DELETE | `/api/scheduled-scans/{id}` | Delete/cancel schedule |
| POST | `/api/scheduled-scans/{id}/pause` | Pause schedule |
| POST | `/api/scheduled-scans/{id}/resume` | Resume schedule |
| POST | `/api/scheduled-scans/{id}/run-now` | Trigger immediate run |

### 3. Celery Tasks
```python
# Check for due scheduled scans (runs every minute)
@app.task
def check_due_scheduled_scans():
    due = get_due_scheduled_scans()
    for schedule in due:
        run_scheduled_scan.delay(schedule["id"])

# Execute a scheduled scan
@app.task
def run_scheduled_scan(schedule_id):
    # Load schedule config
    # Run scan via existing scan service
    # Update last_run_at, next_run_at
    # Send notifications
```

---

## Cron Expression Support

| Expression | Meaning |
|------------|---------|
| `0 9 * * *` | Every day at 9 AM |
| `0 9 * * 1` | Every Monday at 9 AM |
| `0 0 1 * *` | First day of every month |
| `0 */6 * * *` | Every 6 hours |

Use `croniter` library for parsing:
```python
from croniter import croniter

def get_next_run(cron_expr: str, base=None):
    cron = croniter(cron_expr, base or datetime.utcnow())
    return cron.get_next(datetime)
```

---

## Request/Response Models

### Create Scheduled Scan Request
```python
class CreateScheduledScanRequest(BaseModel):
    target_url: HttpUrl
    scan_type: str = "standard"  # standard, multi-turn, mcp
    tier: str = "free"
    
    # Schedule (one of these required)
    schedule_type: str  # one-time, recurring, cron
    run_at: Optional[datetime] = None  # for one-time
    cron_expression: Optional[str] = None  # for cron
    interval_hours: Optional[int] = None  # for recurring
    
    # Scan config
    probes: Optional[list[str]] = None
    vulnerability_types: Optional[list[str]] = None
    attack_type: Optional[str] = None
    
    # Notifications
    notify_on_complete: bool = True
    notify_email: Optional[EmailStr] = None
```

### Response
```json
{
  "id": "uuid",
  "target_url": "https://api.openai.com/v1/chat/completions",
  "schedule_type": "recurring",
  "interval_hours": 24,
  "next_run_at": "2026-03-31T09:00:00Z",
  "status": "active",
  "last_risk_score": 0.15,
  "created_at": "2026-03-30T10:00:00Z"
}
```

---

## Frontend

### New Page: `/scanner/scheduled`
- List all scheduled scans
- Create new schedule (form)
- Edit/pause/resume/delete controls
- View run history

### Components
- `ScheduledScanList` - Table of schedules
- `ScheduledScanForm` - Create/edit form
- `ScheduleCard` - Individual schedule display

---

## Tier-Based Limits

| Tier | Max Schedules | Min Interval |
|------|--------------|--------------|
| Free | 0 | N/A |
| Pro | 10 | 1 hour |
| Enterprise | 100 | 15 minutes |

---

## Notifications

When a scheduled scan completes:
1. **Email** - Send to `notify_email` if specified
2. **Webhook** - Fire `scheduled_scan.complete` webhook
3. **In-app** - Show in notifications (future)

---

## Implementation Order

1. Database migration
2. Service layer
3. API endpoints
4. Celery tasks
5. Frontend page
6. Notifications (email + webhooks)
7. Tests

---

## Estimated Effort

| Task | Hours |
|------|-------|
| Database schema | 1 |
| Service layer | 2 |
| API endpoints | 2 |
| Celery tasks | 2 |
| Frontend UI | 3 |
| Notifications | 1 |
| Testing | 2 |
| **Total** | **~13 hours** |
