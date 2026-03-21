// ── API response types ────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  code?: string;
  status?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// ── Share link ────────────────────────────────────────────────────────────────

export interface ShareLinkResponse {
  url: string;
  token: string;
  expires_at: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  score: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface AnalyticsSummary {
  total_scans: number;
  avg_risk_score: number;
  total_findings: number;
  critical_findings: number;
  trend_30d: TrendPoint[];
  top_categories: CategoryCount[];
  most_scanned_url: string | null;
  score_change: number | null;
}

// ── API keys ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export interface ApiKeyCreateResponse extends ApiKey {
  /** Full key — shown once at creation, never again */
  key: string;
}

// ── Sentinel (monitoring) ─────────────────────────────────────────────────────

export interface SentinelWatch {
  id: string;
  target_url: string;
  interval_hours: number;
  last_checked_at: string | null;
  last_risk_score: number | null;
  status: "active" | "paused" | "error";
  alert_threshold?: number;
}
