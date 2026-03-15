"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Code2, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Finding {
  category: string;
  severity: string;
  detail: string;
  hit_rate: number;
  hits: number;
  total: number;
  blurred?: boolean;
  owasp_category?: string;
  owasp_name?: string;
  reasoning?: string;
  remediation?: string;
  fix_effort?: string;
  context_explanation?: string;
  adversarial_prompt?: string;
  model_response?: string;
  compliance?: {
    mitre_atlas?: {
      techniques?: string[];
      tactics?: string[];
    };
  };
  turn?: number;
}

type SevFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

const SEV_FILTERS: SevFilter[] = ["ALL", "HIGH", "MEDIUM", "LOW"];

const FIX_EFFORT_STYLE: Record<string, string> = {
  low:    "text-acid border-acid/30 bg-acid/5",
  medium: "text-v-amber border-v-amber/30 bg-v-amber/5",
  high:   "text-v-red border-v-red/30 bg-v-red/5",
};

function FindingCard({ f }: { f: Finding }) {
  const [showFix, setShowFix] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const hasRemediation = !!f.remediation;
  const hasEvidence = !!(f.adversarial_prompt || f.model_response);

  return (
    <div className={cn(
      "p-3 border rounded-sm",
      f.severity === "HIGH"   ? "border-v-red/25 bg-v-red/[0.03]" :
      f.severity === "MEDIUM" ? "border-v-amber/25 bg-v-amber/[0.03]" :
                                "border-acid/20 bg-acid/[0.03]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-mono font-bold tracking-wider truncate">
            {f.category}
          </span>
          {f.owasp_category && (
            <span className="text-[8px] px-1.5 py-0.5 bg-blue-100/20 text-blue-300 border border-blue-300/30 rounded font-mono shrink-0">
              {f.owasp_category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {f.fix_effort && (
            <span className={cn(
              "text-[8px] font-mono px-1.5 py-0.5 rounded-[2px] border uppercase",
              FIX_EFFORT_STYLE[f.fix_effort] ?? "text-v-muted2 border-v-border"
            )}>
              {f.fix_effort}
            </span>
          )}
          <span className={cn(
            "text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border",
            f.severity === "HIGH"
              ? "bg-v-red/10 text-v-red border-v-red/30"
              : f.severity === "MEDIUM"
              ? "bg-v-amber/10 text-v-amber border-v-amber/30"
              : "bg-acid/10 text-acid border-acid/30"
          )}>
            {f.severity}
          </span>
        </div>
      </div>

      {/* Detail */}
      <p className="text-[10.5px] text-v-muted leading-relaxed mb-2">
        {f.blurred ? "Upgrade to Pro to see full details" : f.detail}
      </p>

      {!f.blurred && (
        <>
          {/* OWASP name */}
          {f.owasp_name && (
            <div className="text-[9px] text-blue-300 mb-2 italic">
              OWASP: {f.owasp_name}
            </div>
          )}

          {/* Context explanation */}
          {f.context_explanation && (
            <p className="text-[9px] text-v-muted2 italic mb-2 leading-relaxed">
              {f.context_explanation}
            </p>
          )}

          {/* MITRE techniques */}
          {f.compliance?.mitre_atlas?.techniques && (
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {f.compliance.mitre_atlas.techniques.map((tech) => (
                <span key={tech} className="text-[8px] px-1.5 py-0.5 bg-purple-100/20 text-purple-300 border border-purple-300/30 rounded font-mono">
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Expandable toggle buttons */}
          {(hasRemediation || hasEvidence) && (
            <div className="flex items-center gap-2 mt-2 mb-1">
              {hasRemediation && (
                <button
                  onClick={() => setShowFix(v => !v)}
                  className={cn(
                    "flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                    showFix
                      ? "border-acid/40 text-acid bg-acid/5"
                      : "border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted"
                  )}
                >
                  {showFix
                    ? <ChevronDown className="w-2.5 h-2.5" />
                    : <ChevronRight className="w-2.5 h-2.5" />}
                  HOW TO FIX
                </button>
              )}
              {hasEvidence && (
                <button
                  onClick={() => setShowEvidence(v => !v)}
                  className={cn(
                    "flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded border transition-colors",
                    showEvidence
                      ? "border-v-amber/40 text-v-amber bg-v-amber/5"
                      : "border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted"
                  )}
                >
                  {showEvidence
                    ? <ChevronDown className="w-2.5 h-2.5" />
                    : <ChevronRight className="w-2.5 h-2.5" />}
                  EVIDENCE
                </button>
              )}
            </div>
          )}

          {/* HOW TO FIX */}
          {showFix && f.remediation && (
            <div className="mt-2 p-2.5 bg-acid/5 border border-acid/15 rounded">
              <div className="flex items-center gap-1.5 mb-1.5 text-[8px] font-mono text-acid uppercase tracking-wider">
                <Code2 className="w-2.5 h-2.5" /> Remediation
              </div>
              <p className="text-[10px] text-v-muted leading-relaxed">{f.remediation}</p>
            </div>
          )}

          {/* EVIDENCE */}
          {showEvidence && (
            <div className="mt-2 space-y-1.5">
              {f.adversarial_prompt && (
                <div className="p-2 bg-v-red/5 border border-v-red/15 rounded">
                  <div className="text-[8px] font-mono text-v-red uppercase tracking-wider mb-1">
                    Adversarial Prompt
                  </div>
                  <code className="text-[9px] text-v-muted2 break-all leading-relaxed whitespace-pre-wrap">
                    {f.adversarial_prompt}
                  </code>
                </div>
              )}
              {f.model_response && (
                <div className="p-2 bg-black/30 border border-v-border rounded">
                  <div className="text-[8px] font-mono text-v-muted2 uppercase tracking-wider mb-1">
                    Model Response
                  </div>
                  <code className="text-[9px] text-v-muted2 break-all leading-relaxed whitespace-pre-wrap">
                    {f.model_response}
                  </code>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-v-muted2 border-t border-v-border2/50 pt-2">
        <span>HITS: {f.hits}/{f.total}</span>
        <span>RATE: {(f.hit_rate * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function FindingsPanel({ findings }: { findings: Finding[] }) {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<SevFilter>("ALL");

  // Only standard findings (not multi-turn turns)
  const standard = findings.filter(f => f.turn === undefined);

  const filtered = standard.filter(f => {
    if (sevFilter !== "ALL" && f.severity !== sevFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.category.toLowerCase().includes(q) ||
        f.detail.toLowerCase().includes(q) ||
        (f.owasp_category ?? "").toLowerCase().includes(q) ||
        (f.owasp_name ?? "").toLowerCase().includes(q) ||
        (f.remediation ?? "").toLowerCase().includes(q) ||
        (f.context_explanation ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (standard.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* Search */}
      <div className="relative">
        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-v-muted2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search findings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-black/20 border border-v-border text-[11px] font-mono text-foreground placeholder:text-v-muted2 pl-7 pr-3 py-1.5 rounded focus:outline-none focus:border-acid/30 transition-colors"
        />
      </div>

      {/* Severity filter */}
      <div className="flex items-center gap-1">
        {SEV_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setSevFilter(s)}
            className={cn(
              "text-[8px] font-mono px-2 py-0.5 rounded border transition-colors",
              sevFilter === s
                ? s === "HIGH"   ? "border-v-red/50 text-v-red bg-v-red/10"
                : s === "MEDIUM" ? "border-v-amber/50 text-v-amber bg-v-amber/10"
                : s === "LOW"    ? "border-acid/50 text-acid bg-acid/10"
                :                  "border-white/20 text-foreground bg-white/5"
                : "border-v-border text-v-muted2 hover:border-white/15"
            )}
          >
            {s}
            {s !== "ALL" && (
              <span className="ml-1 opacity-60">
                {standard.filter(f => f.severity === s).length}
              </span>
            )}
          </button>
        ))}
        {(search || sevFilter !== "ALL") && (
          <span className="text-[8px] font-mono text-v-muted2 ml-auto">
            {filtered.length}/{standard.length}
          </span>
        )}
      </div>

      {/* Cards */}
      {filtered.length > 0
        ? filtered.map((f, i) => <FindingCard key={i} f={f} />)
        : (
          <div className="flex flex-col items-center gap-2 py-8 opacity-40">
            <Activity className="w-5 h-5" />
            <span className="text-[9px] font-mono tracking-widest uppercase">
              No findings match filters
            </span>
          </div>
        )
      }
    </div>
  );
}
