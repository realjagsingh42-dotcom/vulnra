-- ─────────────────────────────────────────────────────────────────────────────
-- VULNRA — Scheduled Scans Schema Migration
-- Apply via: Supabase Dashboard → SQL Editor → paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 1 — TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Scheduled scans table
CREATE TABLE IF NOT EXISTS public.scheduled_scans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id              UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  target_url          TEXT        NOT NULL,
  scan_type           TEXT        NOT NULL DEFAULT 'standard'
                         CHECK (scan_type IN ('standard', 'multi-turn', 'mcp')),
  tier                TEXT        NOT NULL DEFAULT 'free',
  
  -- Schedule configuration
  schedule_type       TEXT        NOT NULL CHECK (schedule_type IN ('one-time', 'recurring', 'cron'))
                         DEFAULT 'one-time',
  cron_expression     TEXT,
  run_at              TIMESTAMPTZ,
  interval_hours      INTEGER,
  
  -- Scan configuration
  probes              JSONB,
  vulnerability_types JSONB,
  attack_type         TEXT,
  
  -- Status
  status              TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  next_run_at         TIMESTAMPTZ,
  last_run_at         TIMESTAMPTZ,
  last_scan_id        UUID,
  last_risk_score    FLOAT,
  
  -- Notifications
  notify_on_complete  BOOLEAN     DEFAULT true,
  notify_email        TEXT,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

-- Run history
CREATE TABLE IF NOT EXISTS public.scheduled_scan_runs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_scan_id   UUID        NOT NULL REFERENCES public.scheduled_scans(id) ON DELETE CASCADE,
  scan_id             UUID,
  status              TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  risk_score          FLOAT,
  findings_count      INTEGER,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at        TIMESTAMPTZ,
  error_message       TEXT
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_scheduled_scans_user     ON public.scheduled_scans (user_id);
CREATE INDEX idx_scheduled_scans_org      ON public.scheduled_scans (org_id);
CREATE INDEX idx_scheduled_scans_next     ON public.scheduled_scans (next_run_at) 
  WHERE status = 'active';
CREATE INDEX idx_scheduled_scans_status   ON public.scheduled_scans (status);
CREATE INDEX idx_scheduled_scan_runs_ssid ON public.scheduled_scan_runs (scheduled_scan_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 2 — ENABLE RLS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.scheduled_scans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_scan_runs   ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS 3 — RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- scheduled_scans: users can manage their own
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scans' AND policyname='scheduled_scans_select_user') THEN
    CREATE POLICY "scheduled_scans_select_user" ON public.scheduled_scans FOR SELECT
      USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scans' AND policyname='scheduled_scans_insert_user') THEN
    CREATE POLICY "scheduled_scans_insert_user" ON public.scheduled_scans FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scans' AND policyname='scheduled_scans_update_user') THEN
    CREATE POLICY "scheduled_scans_update_user" ON public.scheduled_scans FOR UPDATE
      USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ))
      WITH CHECK (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scans' AND policyname='scheduled_scans_delete_user') THEN
    CREATE POLICY "scheduled_scans_delete_user" ON public.scheduled_scans FOR DELETE
      USING (user_id = auth.uid() OR org_id IN (
        SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      ));
  END IF;
END $$;

-- scheduled_scan_runs: users can read their own
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scan_runs' AND policyname='scheduled_scan_runs_select_user') THEN
    CREATE POLICY "scheduled_scan_runs_select_user" ON public.scheduled_scan_runs FOR SELECT
      USING (scheduled_scan_id IN (
        SELECT id FROM public.scheduled_scans WHERE user_id = auth.uid()
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scheduled_scan_runs' AND policyname='scheduled_scan_runs_insert_service') THEN
    CREATE POLICY "scheduled_scan_runs_insert_service" ON public.scheduled_scan_runs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get due scheduled scans
CREATE OR REPLACE FUNCTION public.get_due_scheduled_scans()
RETURNS TABLE (
  id              UUID,
  user_id         UUID,
  org_id          UUID,
  target_url      TEXT,
  scan_type       TEXT,
  tier            TEXT,
  probes          JSONB,
  vulnerability_types JSONB,
  attack_type     TEXT,
  notify_on_complete BOOLEAN,
  notify_email    TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.user_id,
    ss.org_id,
    ss.target_url,
    ss.scan_type,
    ss.tier,
    ss.probes,
    ss.vulnerability_types,
    ss.attack_type,
    ss.notify_on_complete,
    ss.notify_email
  FROM public.scheduled_scans ss
  WHERE ss.status = 'active'
    AND ss.next_run_at IS NOT NULL
    AND ss.next_run_at <= now()
    AND ss.deleted_at IS NULL;
END;
$$;

-- Update scheduled scan after run
CREATE OR REPLACE FUNCTION public.update_scheduled_scan_after_run(
  p_scan_id UUID,
  p_new_risk_score FLOAT,
  p_findings_count INTEGER,
  p_status TEXT
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_schedule RECORD;
  v_next_run TIMESTAMPTZ;
BEGIN
  -- Get the scheduled scan record
  SELECT * INTO v_schedule FROM public.scheduled_scans WHERE id = p_scan_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate next run time
  IF v_schedule.schedule_type = 'one-time' THEN
    v_next_run := NULL;
    UPDATE public.scheduled_scans 
    SET status = 'completed',
        last_run_at = now(),
        last_scan_id = p_scan_id,
        last_risk_score = p_new_risk_score,
        updated_at = now()
    WHERE id = p_scan_id;
    
  ELSIF v_schedule.schedule_type = 'recurring' AND v_schedule.interval_hours IS NOT NULL THEN
    v_next_run := now() + (v_schedule.interval_hours || ' hours')::interval;
    UPDATE public.scheduled_scans 
    SET last_run_at = now(),
        last_scan_id = p_scan_id,
        last_risk_score = p_new_risk_score,
        next_run_at = v_next_run,
        updated_at = now()
    WHERE id = p_scan_id;
    
  ELSIF v_schedule.schedule_type = 'cron' AND v_schedule.cron_expression IS NOT NULL THEN
    -- For cron, we'll calculate next run in the worker
    UPDATE public.scheduled_scans 
    SET last_run_at = now(),
        last_scan_id = p_scan_id,
        last_risk_score = p_new_risk_score,
        updated_at = now()
    WHERE id = p_scan_id;
  END IF;
END;
$$;
