"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, XCircle,
  Loader2, ExternalLink, Clock,
} from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";

interface Finding {
  category: string;
  severity: string;
  detail: string;
  owasp_category?: string;
  owasp_name?: string;
}

interface ReportData {
  id: string;
  target_url: string;
  status: string;
  risk_score: number | null;
  tier: string;
  scan_engine: string;
  findings: Finding[];
  compliance: Record<string, any>;
  completed_at: string | null;
}

function RiskGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "text-v-red" : pct >= 40 ? "text-v-amber" : "text-acid";
  const label = pct >= 70 ? "HIGH RISK" : pct >= 40 ? "MEDIUM RISK" : "LOW RISK";
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("text-5xl font-bold font-mono tabular-nums", color)}>{pct}</span>
      <span className={cn("text-[9px] font-mono tracking-[0.2em] uppercase", color)}>{label}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "HIGH") return <XCircle className="w-3.5 h-3.5 text-v-red shrink-0" />;
  if (severity === "MEDIUM") return <AlertTriangle className="w-3.5 h-3.5 text-v-amber shrink-0" />;
  return <CheckCircle2 className="w-3.5 h-3.5 text-acid shrink-0" />;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SEVERITY_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`${API}/report/${token}`);
        if (resp.status === 404) { setNotFound(true); return; }
        if (!resp.ok) throw new Error("Failed");
        setReport(await resp.json());
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-v-muted font-mono text-xs tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin text-acid" />
          LOADING REPORT...
        </div>
      </div>
    );
  }

  // ── Not found / expired ──────────────────────────────────────────────────
  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 px-6">
        <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-v-red/3 rounded-full blur-[100px]" />
        <XCircle className="w-10 h-10 text-v-red/50" />
        <div className="text-center">
          <p className="text-sm font-mono text-foreground mb-1">Report not found</p>
          <p className="text-xs text-v-muted">This link may have expired or never existed.</p>
        </div>
        <a
          href="/"
          className="text-xs font-mono text-v-muted2 hover:text-acid transition-colors"
        >
          vulnra.ai →
        </a>
      </div>
    );
  }

  const sortedFindings = [...report.findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3)
  );
  const highCount = report.findings.filter(f => f.severity === "HIGH").length;
  const medCount  = report.findings.filter(f => f.severity === "MEDIUM").length;
  const lowCount  = report.findings.filter(f => f.severity === "LOW").length;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[700px] h-[700px] bg-acid/3 rounded-full blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#4db8ff]/3 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-14">

        {/* VULNRA branding */}
        <div className="flex items-center justify-between mb-12">
          <a href="/"><VulnraLogo suffix="PLATFORM" /></a>
          <span className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase border border-v-border px-2 py-1 rounded">
            Shared Report
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
            // Security Audit Report
          </span>
          <h1 className="text-xl font-bold text-foreground mt-2 font-mono break-all">
            {report.target_url}
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2">
              <Clock className="w-3 h-3" />
              {formatDate(report.completed_at)}
            </div>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-v-border text-v-muted2 rounded-[2px] uppercase">
              {report.tier} tier
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 border border-v-border text-v-muted2 rounded-[2px]">
              {report.scan_engine}
            </span>
          </div>
        </div>

        {/* Risk score + summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-lg border border-v-border bg-v-bg2 p-6 flex flex-col items-center justify-center gap-2">
            {report.risk_score !== null
              ? <RiskGauge score={report.risk_score} />
              : <span className="text-v-muted2 font-mono text-xs">N/A</span>
            }
          </div>
          <div className="rounded-lg border border-v-border bg-v-bg2 p-5 flex flex-col justify-center gap-3">
            <p className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase mb-1">
              Finding Summary
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-v-muted font-mono">High severity</span>
                <span className="text-xs font-bold font-mono text-v-red">{highCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-v-muted font-mono">Medium severity</span>
                <span className="text-xs font-bold font-mono text-v-amber">{medCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-v-muted font-mono">Low severity</span>
                <span className="text-xs font-bold font-mono text-acid">{lowCount}</span>
              </div>
              <div className="border-t border-v-border pt-2 flex items-center justify-between">
                <span className="text-xs text-v-muted font-mono">Total</span>
                <span className="text-xs font-bold font-mono text-foreground">{report.findings.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Findings */}
        <div className="mb-10">
          <p className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase mb-4">
            // Findings
          </p>
          {sortedFindings.length === 0 ? (
            <div className="rounded-lg border border-v-border bg-v-bg2 p-8 text-center">
              <CheckCircle2 className="w-6 h-6 text-acid mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono text-v-muted">No vulnerabilities detected.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedFindings.map((f, i) => (
                <div key={i} className="rounded-lg border border-v-border2 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <SeverityIcon severity={f.severity} />
                      <span className="text-[10px] font-mono font-bold tracking-wider truncate">
                        {f.category}
                      </span>
                      {f.owasp_category && (
                        <span className="shrink-0 text-[8px] px-1.5 py-0.5 bg-blue-100/20 text-blue-300 border border-blue-300/30 rounded font-mono">
                          {f.owasp_category}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border",
                      f.severity === "HIGH"   ? "bg-v-red/10 text-v-red border-v-red/30" :
                      f.severity === "MEDIUM" ? "bg-v-amber/10 text-v-amber border-v-amber/30" :
                                               "bg-acid/10 text-acid border-acid/30"
                    )}>
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-v-muted leading-relaxed">
                    {f.detail}
                  </p>
                  {f.owasp_name && (
                    <p className="mt-2 text-[9px] text-blue-300 italic">
                      OWASP: {f.owasp_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-lg border border-v-border bg-v-bg2 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-1">Scan your own LLM endpoint</p>
            <p className="text-xs text-v-muted">Get a full security audit with 40+ vulnerability probes and compliance mapping.</p>
          </div>
          <a
            href="/"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors"
          >
            Try VULNRA <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] font-mono text-v-muted2">
          Generated by{" "}
          <a href="/" className="hover:text-acid transition-colors">vulnra.ai</a>
          {" "}· Report valid for 30 days
        </p>

      </div>
    </div>
  );
}
