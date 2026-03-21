// ── Scan domain types ─────────────────────────────────────────────────────────

export type Tier = "free" | "pro" | "enterprise";
export type AttackType = "crescendo" | "goat";
export type ScanMode = "standard" | "deep" | "stealth";
export type ScanStatus = "queued" | "scanning" | "running" | "complete" | "failed";
export type FindingType =
  | "jailbreak_success"
  | "prompt_injection"
  | "encoding_bypass"
  | "data_leakage"
  | "endpoint_error"
  | "info";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export type ComplianceStatus = "pass" | "fail" | "partial" | "unknown";

// ── Request shapes ────────────────────────────────────────────────────────────

export interface ScanRequest {
  url: string;
  tier: Tier;
  attack_type?: AttackType;
  scan_mode?: ScanMode;
  probes?: string[];
  vulnerability_types?: string[];
}

export interface MultiTurnScanRequest {
  url: string;
  tier: Tier;
  attack_type: AttackType;
}

// ── Finding ───────────────────────────────────────────────────────────────────

export interface ScanFinding {
  /** Zero-based turn index for multi-turn scans; absent for standard scans */
  turn?: number;
  type?: FindingType;
  category?: string;
  severity?: Severity;
  detail?: string;
  hit_rate?: number;
  hits?: number;
  total?: number;
  prompt?: string;
  response?: string;
  owasp_category?: string;
  owasp_name?: string;
  mitre_atlas?: string;
  remediation?: string;
  fix_effort?: "low" | "medium" | "high";
  context_explanation?: string;
  adversarial_prompt?: string;
  model_response?: string;
  reasoning?: string;
  blurred?: boolean;
  compliance?: {
    mitre_atlas?: {
      techniques?: string[];
      tactics?: string[];
    };
  };
}

// ── Category scores ───────────────────────────────────────────────────────────

export interface CategoryScores {
  injection: number;
  jailbreak: number;
  leakage: number;
  compliance: number;
}

// ── Compliance frameworks ─────────────────────────────────────────────────────

export interface ComplianceFramework {
  status: ComplianceStatus;
  score: number;
  findings: string[];
}

export interface ComplianceResult {
  eu_ai_act: ComplianceFramework;
  nist_ai_rmf: ComplianceFramework;
  owasp_llm: ComplianceFramework;
  india_dpdp: ComplianceFramework;
}

// ── Scan result ───────────────────────────────────────────────────────────────

export interface ScanResult {
  scan_id: string;
  status: ScanStatus;
  target_url: string;
  tier: Tier;
  risk_score: number;
  findings: ScanFinding[];
  compliance: ComplianceResult | null;
  completed_at: string | null;
  category_scores: CategoryScores;
  prev_risk_score: number | null;
  attack_type?: AttackType;
  scan_engine?: string;
  warning?: string;
  conversation?: MultiTurnTurn[];
}

export interface MultiTurnTurn {
  turn: number;
  user: string;
  assistant: string;
}

// ── Scan start response ───────────────────────────────────────────────────────

export interface ScanStartResponse {
  scan_id: string;
  status: ScanStatus;
}
