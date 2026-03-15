"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Shield, TrendingDown, TrendingUp, Minus,
  AlertTriangle, CheckCircle2, Loader2, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiffFinding {
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  hit_rate?: number;
  hits?: number;
  total?: number;
  owasp_category?: string;
  owasp_name?: string;
  remediation?: string;
}

interface DiffResult {
  scan_id: string;
  baseline_id: string;
  current_url: string;
  baseline_url: string;
  current_risk: number;
  baseline_risk: number;
  risk_delta: number;
  risk_delta_pct: number;
  new: DiffFinding[];
  fixed: DiffFinding[];
  unchanged: DiffFinding[];
  summary: {
    new_count: number;
    fixed_count: number;
    unchanged_count: number;
    total_current: number;
    high_fixed: number;
    has_regressions: boolean;
  };
}

type Tab = "all" | "new" | "fixed" | "unchanged";

// ── Severity badge ─────────────────────────────────────────────────────────────

const SEV_CLS: Record<string, string> = {
  CRITICAL: "text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/8",
  HIGH:     "text-v-red   border-v-red/40   bg-v-red/8",
  MEDIUM:   "text-v-amber border-v-amber/40 bg-v-amber/8",
  LOW:      "text-[#4db8ff] border-[#4db8ff]/40 bg-[#4db8ff]/8",
};

function SevBadge({ sev }: { sev: string }) {
  return (
    <span className={cn(
      "shrink-0 text-[7px] font-mono font-bold px-1.5 py-[3px] rounded border tracking-widest leading-none",
      SEV_CLS[sev] ?? SEV_CLS.LOW,
    )}>
      {sev}
    </span>
  );
}

// ── Finding row ────────────────────────────────────────────────────────────────

function FindingRow({
  finding,
  status,
}: {
  finding: DiffFinding;
  status: "new" | "fixed" | "unchanged";
}) {
  const pct = Math.round((finding.hit_rate ?? 0) * 100);

  const leftBorder =
    status === "new"       ? "border-l-2 border-l-v-red"  :
    status === "fixed"     ? "border-l-2 border-l-acid"   :
    "border-l-2 border-l-transparent";

  const statusBadge =
    status === "new"   ? (
      <span className="text-[7px] font-mono font-bold px-1.5 py-[3px] rounded border tracking-widest text-v-red border-v-red/40 bg-v-red/8 leading-none">
        NEW
      </span>
    ) : status === "fixed" ? (
      <span className="text-[7px] font-mono font-bold px-1.5 py-[3px] rounded border tracking-widest text-acid border-acid/40 bg-acid/8 leading-none">
        FIXED
      </span>
    ) : null;

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 border-b border-v-border2 last:border-0 font-mono",
      status === "unchanged" ? "opacity-50" : "",
      leftBorder,
    )}>
      {statusBadge && <div className="mt-0.5">{statusBadge}</div>}
      {!statusBadge && <div className="w-[38px]" />}

      <SevBadge sev={finding.severity ?? "LOW"} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn(
            "text-[10px] font-bold tracking-wider",
            status === "fixed" ? "line-through text-v-muted2" : "text-foreground/90",
          )}>
            {finding.category?.replace(/_/g, " ")}
          </span>
          {finding.owasp_category && (
            <span className="text-[7.5px] text-v-muted2 border border-v-border px-1.5 py-[2px] rounded-[2px] tracking-wider">
              {finding.owasp_category} · {finding.owasp_name}
            </span>
          )}
        </div>

        {finding.hits !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  status === "new"   ? "bg-v-red"  :
                  status === "fixed" ? "bg-acid"   : "bg-white/20"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] text-v-muted2 tabular-nums">
              {pct}% · {finding.hits}/{finding.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Score card ─────────────────────────────────────────────────────────────────

function ScoreCard({ label, scanId, risk }: { label: string; scanId: string; risk: number }) {
  const pct = Math.round(risk * 10);
  const color = pct >= 70 ? "text-v-red" : pct >= 40 ? "text-v-amber" : "text-acid";
  return (
    <div className="flex-1 bg-v-bg2 border border-v-border rounded-sm px-4 py-3">
      <p className="text-[8px] font-mono tracking-widest text-v-muted2 uppercase mb-1">{label}</p>
      <p className="text-[10px] font-mono text-v-muted mb-2">
        {scanId.slice(0, 8)}
        <span className="text-v-muted2 ml-1">···</span>
      </p>
      <p className={cn("text-2xl font-mono font-bold tabular-nums", color)}>{pct}</p>
      <p className="text-[8px] text-v-muted2 font-mono">/ 100</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DiffLayout() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const supabase      = createClient();

  const scanId    = searchParams.get("a") ?? "";
  const baselineId = searchParams.get("b") ?? "";

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [diff,    setDiff]    = useState<DiffResult | null>(null);
  const [tab,     setTab]     = useState<Tab>("all");

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!scanId || !baselineId) {
      setError("Missing scan IDs. Please select two scans from history.");
      setLoading(false);
      return;
    }

    async function fetchDiff() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }

        const resp = await fetch(
          `${API}/scan/${scanId}/diff?baseline=${baselineId}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.detail ?? `Error ${resp.status}`);
        }

        setDiff(await resp.json());
      } catch (e: any) {
        setError(e.message ?? "Failed to load diff.");
      } finally {
        setLoading(false);
      }
    }

    fetchDiff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtered findings for active tab ────────────────────────────────────────
  const allFindings: { finding: DiffFinding; status: "new" | "fixed" | "unchanged" }[] = diff
    ? [
        ...diff.new.map(f      => ({ finding: f, status: "new"       as const })),
        ...diff.fixed.map(f    => ({ finding: f, status: "fixed"     as const })),
        ...diff.unchanged.map(f => ({ finding: f, status: "unchanged" as const })),
      ]
    : [];

  const tabFindings =
    tab === "new"       ? allFindings.filter(x => x.status === "new")       :
    tab === "fixed"     ? allFindings.filter(x => x.status === "fixed")     :
    tab === "unchanged" ? allFindings.filter(x => x.status === "unchanged") :
    allFindings;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans">
      {/* Background ambience */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/4 rounded-full blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#4db8ff]/4 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-14">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-10">
          <button
            onClick={() => router.push("/scanner/history")}
            className="flex items-center gap-1.5 text-xs font-mono text-v-muted2 hover:text-v-muted transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to history
          </button>
          <div className="flex items-center gap-2">
            {diff && (
              <a
                href={`/scanner?scan_id=${diff.scan_id}`}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded border border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted transition-colors"
              >
                <ExternalLink className="w-3 h-3" /> View scan
              </a>
            )}
            <div className="flex items-center gap-2 text-sm font-mono font-bold tracking-wider">
              <div className="w-6 h-6 rounded bg-acid flex items-center justify-center">
                <Shield className="w-3 h-3 text-black" />
              </div>
              VULNRA
            </div>
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-24 text-v-muted2 font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-acid" />
            LOADING_DIFF...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-v-red/5 border border-v-red/25 rounded-sm font-mono text-sm text-v-red">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {diff && (
          <>
            {/* ── Header ── */}
            <div className="mb-8">
              <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
                // Regression Analysis
              </span>
              <h1 className="text-2xl font-bold text-foreground mt-2 truncate">
                {diff.current_url}
              </h1>
              <p className="text-xs text-v-muted2 font-mono mt-1">
                Scan <span className="text-v-muted">{diff.scan_id.slice(0, 8)}</span>
                {" "}vs. baseline <span className="text-v-muted">{diff.baseline_id.slice(0, 8)}</span>
              </p>
            </div>

            {/* ── Summary banner ── */}
            {diff.summary.has_regressions ? (
              <div className="flex items-start gap-3 px-4 py-3.5 bg-v-red/5 border border-v-red/25 rounded-sm mb-6">
                <AlertTriangle className="w-4 h-4 text-v-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-mono font-bold text-v-red tracking-wide">
                    REGRESSIONS DETECTED — {diff.summary.new_count} new finding{diff.summary.new_count !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[11px] font-mono text-v-muted mt-0.5">
                    Risk score {Math.round(diff.baseline_risk * 10)} → {Math.round(diff.current_risk * 10)}
                    {diff.risk_delta_pct !== 0 && (
                      <span className="text-v-red ml-1">
                        (+{diff.risk_delta_pct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3.5 bg-acid/5 border border-acid/25 rounded-sm mb-6">
                <CheckCircle2 className="w-4 h-4 text-acid shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-mono font-bold text-acid tracking-wide">
                    {diff.summary.fixed_count > 0
                      ? `IMPROVED — Eliminated ${diff.summary.fixed_count} finding${diff.summary.fixed_count !== 1 ? "s" : ""}${diff.summary.high_fixed > 0 ? ` (${diff.summary.high_fixed} HIGH)` : ""}`
                      : "NO REGRESSIONS — Scan matches baseline"
                    }
                  </p>
                  <p className="text-[11px] font-mono text-v-muted mt-0.5">
                    Risk score {Math.round(diff.baseline_risk * 10)} → {Math.round(diff.current_risk * 10)}
                    {diff.risk_delta_pct !== 0 && (
                      <span className={cn("ml-1", diff.risk_delta_pct < 0 ? "text-acid" : "text-v-red")}>
                        ({diff.risk_delta_pct > 0 ? "+" : ""}{diff.risk_delta_pct}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ── Score cards ── */}
            <div className="flex gap-4 mb-8">
              <ScoreCard label="Current scan"  scanId={diff.scan_id}     risk={diff.current_risk}  />
              <div className="flex items-center justify-center px-2">
                {diff.risk_delta < -0.05 ? (
                  <TrendingDown className="w-5 h-5 text-acid" />
                ) : diff.risk_delta > 0.05 ? (
                  <TrendingUp className="w-5 h-5 text-v-red" />
                ) : (
                  <Minus className="w-5 h-5 text-v-muted2" />
                )}
              </div>
              <ScoreCard label="Baseline scan" scanId={diff.baseline_id} risk={diff.baseline_risk} />
            </div>

            {/* ── Tab bar ── */}
            <div className="flex gap-1 mb-4 border-b border-v-border2 pb-0">
              {([
                ["all",       "ALL",       allFindings.length],
                ["new",       "NEW",       diff.summary.new_count],
                ["fixed",     "FIXED",     diff.summary.fixed_count],
                ["unchanged", "UNCHANGED", diff.summary.unchanged_count],
              ] as const).map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "px-3 py-2 text-[9px] font-mono tracking-widest border-b-2 transition-colors -mb-[1px]",
                    tab === key
                      ? key === "new"   ? "border-v-red text-v-red"
                        : key === "fixed" ? "border-acid text-acid"
                        : "border-acid text-acid"
                      : "border-transparent text-v-muted2 hover:text-v-muted",
                  )}
                >
                  {label}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              ))}
            </div>

            {/* ── Findings list ── */}
            <div className="rounded-sm border border-v-border overflow-hidden">
              {tabFindings.length === 0 ? (
                <div className="py-10 text-center font-mono text-[11px] text-v-muted2 opacity-50">
                  No findings in this category
                </div>
              ) : (
                tabFindings.map(({ finding, status }, i) => (
                  <FindingRow key={i} finding={finding} status={status} />
                ))
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
