"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, AlertTriangle, Shield, Database,
  ChevronDown, ChevronUp, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RAGFinding {
  id: string;
  probe_id: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  evidence: string;
  remediation: string;
  owasp_llm_category: string;
  hit_rate: number;
  fix_effort: string;
}

interface RAGScanResult {
  id: string;
  status: string;
  scan_duration: number;
  risk_score: number;
  corpus_poisoning_rate: number;
  cross_tenant_leakage: boolean;
  unauthenticated_ingestion: boolean;
  embedding_vectors_exposed: boolean;
  findings: RAGFinding[];
  probes_run: string[];
  error?: string;
}

const SEV_COLORS: Record<string, string> = {
  HIGH:   "text-red-400 border-red-400/40 bg-red-900/15",
  MEDIUM: "text-orange-400 border-orange-400/40 bg-orange-900/15",
  LOW:    "text-yellow-400 border-yellow-400/40 bg-yellow-900/15",
};

const OWASP_NAMES: Record<string, string> = {
  LLM01: "Prompt Injection",
  LLM02: "Insecure Output Handling",
  LLM03: "Training Data Poisoning",
  LLM06: "Sensitive Information Disclosure",
  LLM08: "Excessive Agency",
};

function riskColor(score: number): string {
  if (score >= 7) return "text-red-400";
  if (score >= 4) return "text-orange-400";
  return "text-green-400";
}

function riskLabel(score: number): string {
  if (score >= 7) return "CRITICAL";
  if (score >= 4) return "MEDIUM";
  if (score > 0)  return "LOW";
  return "SECURE";
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-[10px] font-mono ${
      ok
        ? "border-red-400/40 bg-red-900/15 text-red-400"
        : "border-green-400/30 bg-green-900/10 text-green-400"
    }`}>
      {ok ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
      {label}: {ok ? "VULNERABLE" : "SECURE"}
    </div>
  );
}

function PoisoningGauge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 60 ? "#f87171" : pct >= 30 ? "#fb923c" : "#4ade80";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1f2937" strokeWidth="3.5" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3.5"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-bold text-white">{pct}%</span>
        </div>
      </div>
      <div className="text-[10px] font-mono text-v-muted mt-1 text-center">CORPUS POISONING RATE</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: RAGFinding }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SEV_COLORS[finding.severity] || SEV_COLORS.LOW;

  return (
    <div className={`rounded border ${colors} overflow-hidden`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors}`}>
            {finding.probe_id}
          </span>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${colors}`}>
            {finding.severity}
          </span>
          <span className="text-xs text-white font-medium truncate">{finding.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] font-mono text-v-muted">
            Hit: {Math.round(finding.hit_rate * 100)}%
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-v-muted2" /> : <ChevronDown className="w-3.5 h-3.5 text-v-muted2" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* OWASP */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-900/30 border border-purple-400/30 text-purple-300">
              OWASP {finding.owasp_llm_category}
            </span>
            {OWASP_NAMES[finding.owasp_llm_category] && (
              <span className="text-[9px] font-mono text-v-muted">
                {OWASP_NAMES[finding.owasp_llm_category]}
              </span>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="text-[9px] font-mono text-v-muted2 tracking-wider mb-1">DESCRIPTION</div>
            <p className="text-xs text-v-muted leading-relaxed">{finding.description}</p>
          </div>

          {/* Evidence */}
          {finding.evidence && (
            <div>
              <div className="text-[9px] font-mono text-v-muted2 tracking-wider mb-1">EVIDENCE</div>
              <div className="bg-v-bg2 border border-v-border rounded p-2 font-mono text-[10px] text-v-muted break-all">
                {finding.evidence}
              </div>
            </div>
          )}

          {/* Remediation */}
          <div>
            <div className="text-[9px] font-mono text-v-muted2 tracking-wider mb-1">REMEDIATION</div>
            <p className="text-xs text-v-muted leading-relaxed">{finding.remediation}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[9px] font-mono text-v-muted2">FIX EFFORT:</span>
              <span className={cn(
                "text-[9px] font-mono px-1.5 py-0.5 rounded uppercase",
                finding.fix_effort === "high"   ? "bg-red-900/20 text-red-300 border border-red-400/30" :
                finding.fix_effort === "medium" ? "bg-orange-900/20 text-orange-300 border border-orange-400/30" :
                                                  "bg-green-900/20 text-green-300 border border-green-400/30"
              )}>
                {finding.fix_effort}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type Tab = "overview" | "findings" | "compliance";

export default function RAGScanResults({
  result,
  tier,
}: {
  result: RAGScanResult;
  tier: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  const highCount   = result.findings.filter(f => f.severity === "HIGH").length;
  const mediumCount = result.findings.filter(f => f.severity === "MEDIUM").length;
  const lowCount    = result.findings.filter(f => f.severity === "LOW").length;

  const owaspMap: Record<string, RAGFinding[]> = {};
  for (const f of result.findings) {
    const key = f.owasp_llm_category;
    if (!owaspMap[key]) owaspMap[key] = [];
    owaspMap[key].push(f);
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-base font-bold text-white tracking-wider">RAG SCAN RESULTS</h2>
          <p className="text-[11px] text-v-muted font-mono mt-0.5">
            Duration: {result.scan_duration}s · Probes: {result.probes_run.join(", ")}
          </p>
        </div>
        <div className={`text-right`}>
          <div className={`font-mono text-3xl font-bold ${riskColor(result.risk_score)}`}>
            {result.risk_score.toFixed(1)}
          </div>
          <div className={`text-[10px] font-mono ${riskColor(result.risk_score)}`}>
            {riskLabel(result.risk_score)} RISK
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-v-border2">
        {(["overview", "findings", "compliance"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-[10px] font-mono tracking-wider border-b-2 -mb-[2px] transition-colors",
              tab === t
                ? "border-acid text-acid"
                : "border-transparent text-v-muted2 hover:text-v-muted"
            )}
          >
            {t.toUpperCase()}{t === "findings" && ` (${result.findings.length})`}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg flex items-center gap-4">
              <PoisoningGauge rate={result.corpus_poisoning_rate} />
              <div className="text-xs text-v-muted leading-relaxed">
                Measures how many canary documents could be injected and later retrieved via queries.
              </div>
            </div>
            <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg space-y-2">
              <div className="text-[10px] font-mono text-v-muted2 tracking-wider mb-3">SECURITY STATUS</div>
              <StatusBadge ok={result.cross_tenant_leakage}      label="Cross-Tenant Isolation" />
              <StatusBadge ok={result.unauthenticated_ingestion} label="Ingestion Auth" />
              <StatusBadge ok={result.embedding_vectors_exposed} label="Embedding Exposure" />
            </div>
          </div>

          {/* Finding severity summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "HIGH", count: highCount, color: "border-red-400/30 bg-red-900/10 text-red-400" },
              { label: "MEDIUM", count: mediumCount, color: "border-orange-400/30 bg-orange-900/10 text-orange-400" },
              { label: "LOW", count: lowCount, color: "border-yellow-400/30 bg-yellow-900/10 text-yellow-400" },
            ].map(({ label, count, color }) => (
              <div key={label} className={`p-3 rounded border ${color} text-center`}>
                <div className="font-mono text-2xl font-bold">{count}</div>
                <div className="text-[10px] font-mono tracking-wider mt-0.5">{label} SEVERITY</div>
              </div>
            ))}
          </div>

          {result.findings.length === 0 && (
            <div className="p-6 bg-v-bg1 border border-green-400/20 rounded-lg text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="font-mono text-sm font-bold text-green-400">No vulnerabilities found</p>
              <p className="text-xs text-v-muted mt-1">
                All {result.probes_run.length} probe(s) passed without detecting issues.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Findings tab */}
      {tab === "findings" && (
        <div className="space-y-3">
          {result.findings.length === 0 ? (
            <div className="p-6 text-center text-v-muted text-sm">
              No findings to display.
            </div>
          ) : (
            result.findings.map(f => <FindingCard key={f.id} finding={f} />)
          )}
        </div>
      )}

      {/* Compliance tab */}
      {tab === "compliance" && (
        <div className="space-y-4">
          <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-acid" />
              <h3 className="font-mono text-xs font-bold text-white tracking-wider">OWASP LLM TOP 10 COVERAGE</h3>
            </div>
            <div className="space-y-2">
              {Object.entries({
                LLM01: "Prompt Injection",
                LLM02: "Insecure Output Handling",
                LLM03: "Training Data Poisoning",
                LLM06: "Sensitive Information Disclosure",
              }).map(([code, name]) => {
                const hits = owaspMap[code] || [];
                return (
                  <div key={code} className={`flex items-center justify-between p-2 rounded border text-xs ${
                    hits.length > 0
                      ? "border-red-400/30 bg-red-900/10"
                      : "border-v-border bg-v-bg2/50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-acid">{code}</span>
                      <span className="text-v-muted">{name}</span>
                    </div>
                    {hits.length > 0 ? (
                      <span className="text-[9px] font-mono text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded">
                        {hits.length} FINDING{hits.length > 1 ? "S" : ""}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-green-400">✓ PASS</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-v-bg1 border border-v-border2 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-acid" />
              <h3 className="font-mono text-xs font-bold text-white tracking-wider">RAG ATTACK SURFACE (OWASP LLM)</h3>
            </div>
            <div className="space-y-1.5 text-xs text-v-muted">
              {[
                ["LLM01", "Indirect prompt injection via retrieved context documents"],
                ["LLM02", "Embedding vector exposure and metadata leakage"],
                ["LLM03", "Corpus poisoning via unauthenticated document ingestion"],
                ["LLM06", "Cross-tenant data leakage through shared retrieval index"],
              ].map(([code, desc]) => (
                <div key={code} className="flex gap-2">
                  <span className="text-acid font-mono shrink-0 text-[10px] mt-0.5">{code}</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
