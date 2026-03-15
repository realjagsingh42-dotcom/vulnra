"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalEvent } from "./types";

// ── Severity colour maps ──────────────────────────────────────────────────────

const SEV_STYLES = {
  CRITICAL: {
    badge:  "text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/8",
    border: "border-[#ff4444]/20",
    bar:    "bg-[#ff4444]",
    dot:    "bg-[#ff4444]",
  },
  HIGH: {
    badge:  "text-v-red border-v-red/40 bg-v-red/8",
    border: "border-v-red/20",
    bar:    "bg-v-red",
    dot:    "bg-v-red",
  },
  MEDIUM: {
    badge:  "text-v-amber border-v-amber/40 bg-v-amber/8",
    border: "border-v-amber/20",
    bar:    "bg-v-amber",
    dot:    "bg-v-amber",
  },
  LOW: {
    badge:  "text-[#4db8ff] border-[#4db8ff]/40 bg-[#4db8ff]/8",
    border: "border-[#4db8ff]/20",
    bar:    "bg-[#4db8ff]",
    dot:    "bg-[#4db8ff]",
  },
} as const;

// ── Finding card (expandable) ─────────────────────────────────────────────────

function FindingCard({ evt }: { evt: TerminalEvent }) {
  const [open, setOpen] = useState(false);

  const sev     = (evt.severity ?? "LOW") as keyof typeof SEV_STYLES;
  const styles  = SEV_STYLES[sev] ?? SEV_STYLES.LOW;
  const pct     = Math.round((evt.hitRate ?? 0) * 100);
  const hasBody = !!(evt.adversarialPrompt || evt.modelResponse || evt.remediation);

  return (
    <div className={cn("border rounded-[3px] overflow-hidden text-[10px] font-mono", styles.border)}>
      {/* ── Header ── */}
      <button
        onClick={() => hasBody && setOpen(o => !o)}
        className={cn(
          "w-full text-left px-3 py-2.5 flex items-start gap-2.5",
          hasBody
            ? "cursor-pointer hover:bg-white/[0.03] transition-colors"
            : "cursor-default",
        )}
      >
        {/* Severity badge */}
        <span className={cn(
          "shrink-0 text-[7px] font-bold px-1.5 py-[3px] rounded border tracking-widest leading-none mt-[1px]",
          styles.badge,
        )}>
          {sev}
        </span>

        <div className="flex-1 min-w-0">
          {/* Category + OWASP */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-bold tracking-wider text-foreground/90">
              {evt.category?.replace(/_/g, " ")}
            </span>
            {evt.owaspCategory && (
              <span className="text-[7.5px] text-v-muted2 border border-v-border px-1.5 py-[2px] rounded-[2px] tracking-wider">
                {evt.owaspCategory} · {evt.owaspName}
              </span>
            )}
          </div>

          {/* Hit-rate bar */}
          {evt.hits !== undefined && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[3px] bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", styles.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[9px] text-v-muted2 shrink-0 tabular-nums">
                {pct}% · {evt.hits}/{evt.total}
              </span>
            </div>
          )}
        </div>

        {hasBody && (
          <span className="shrink-0 text-v-muted2 mt-0.5">
            {open
              ? <ChevronDown  className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />}
          </span>
        )}
      </button>

      {/* ── Expanded body ── */}
      {open && hasBody && (
        <div className="border-t border-white/5 px-3 py-3 space-y-3 bg-black/25">
          {evt.adversarialPrompt && (
            <div>
              <p className="text-[7.5px] tracking-widest text-v-muted2 mb-1.5">ADVERSARIAL PROMPT</p>
              <p className="text-[9.5px] text-v-muted leading-relaxed bg-white/[0.03] rounded px-2.5 py-2 border border-v-border2">
                {evt.adversarialPrompt}
              </p>
            </div>
          )}
          {evt.modelResponse && (
            <div>
              <p className="text-[7.5px] tracking-widest text-v-muted2 mb-1.5">MODEL RESPONSE</p>
              <p className="text-[9.5px] text-v-red/75 leading-relaxed bg-white/[0.03] rounded px-2.5 py-2 border border-v-red/10">
                {evt.modelResponse}
              </p>
            </div>
          )}
          {evt.remediation && (
            <div>
              <p className="text-[7.5px] tracking-widest text-v-muted2 mb-1.5">REMEDIATION</p>
              <p className="text-[9.5px] text-acid/70 leading-relaxed">
                {evt.remediation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Probe event row ───────────────────────────────────────────────────────────

function ProbeRow({ evt }: { evt: TerminalEvent }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-mono text-v-muted">
      <span className="text-v-muted2 shrink-0 text-[8px] tabular-nums">
        [{new Date(evt.ts).toLocaleTimeString([], { hour12: false })}]
      </span>
      <span className="text-acid/30">›</span>
      <span className="text-v-muted2">PROBE</span>
      <span className="text-acid/70 tabular-nums">{evt.probeIndex}/{evt.probeTotal}</span>
      <span className="text-v-border2">·</span>
      <span className="tracking-wider">{evt.probeName?.toUpperCase()}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-acid/50 animate-pulse ml-0.5 shrink-0" />
    </div>
  );
}

// ── Plain text row (init / complete / error) ──────────────────────────────────

function PlainRow({ evt }: { evt: TerminalEvent }) {
  const isErr = evt.kind === "error";
  const isOk  = evt.kind === "complete";
  return (
    <div className="flex gap-2 text-[10.5px] font-mono">
      <span className="text-v-muted2 shrink-0 text-[8px] tabular-nums">
        [{new Date(evt.ts).toLocaleTimeString([], { hour12: false })}]
      </span>
      <span className={cn(
        isErr ? "text-v-red" :
        isOk  ? "text-acid font-semibold" :
                "text-acid/60",
      )}>
        {isErr ? "!" : "+"} {evt.text}
      </span>
    </div>
  );
}

// ── Main Terminal component ───────────────────────────────────────────────────

interface TerminalProps {
  events: TerminalEvent[];
  isScanning: boolean;
}

export default function Terminal({ events, isScanning }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // ── Progress calculation ──────────────────────────────────────────────────
  const probeEvents  = events.filter(e => e.kind === "probe");
  const probeTotal   = probeEvents[0]?.probeTotal ?? 0;
  const probeDone    = probeEvents.length;
  const isComplete   = events.some(e => e.kind === "complete");
  const showProgress = probeTotal > 0 && (isScanning || isComplete);
  const pct          = probeTotal > 0
    ? isComplete ? 100 : Math.round((probeDone / probeTotal) * 100)
    : 0;
  const lastProbe    = probeEvents[probeDone - 1];

  return (
    <section className="flex flex-col overflow-hidden bg-black/20 flex-1">

      {/* ── Title bar ── */}
      <div className="h-9.5 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-4 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.25 h-2.25 rounded-full bg-v-red/40" />
          <div className="w-2.25 h-2.25 rounded-full bg-v-amber/40" />
          <div className="w-2.25 h-2.25 rounded-full bg-acid/40" />
        </div>
        <span className="text-[9.5px] font-mono text-v-muted2 tracking-widest">
          REALTIME_EXECUTION_STREAM
        </span>
        <TerminalIcon className="w-3.5 h-3.5 text-v-muted2" />
      </div>

      {/* ── Progress bar (visible during and after scan) ── */}
      {showProgress && (
        <div className="bg-v-bg1 border-b border-v-border2 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[8.5px] font-mono text-v-muted2 tracking-widest">
              {isComplete
                ? `COMPLETE · ${probeTotal} PROBE${probeTotal !== 1 ? "S" : ""} EXECUTED`
                : `PROBE ${probeDone}/${probeTotal} · ${lastProbe?.probeName?.toUpperCase() ?? "SCANNING..."}`}
            </span>
            <span className={cn(
              "text-[8.5px] font-mono tabular-nums",
              isComplete ? "text-acid" : "text-v-muted2 animate-pulse",
            )}>
              {pct}%
            </span>
          </div>
          <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                isComplete ? "bg-acid" : "bg-acid/50",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Event stream ── */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-1.5"
      >
        {events.length === 0 ? (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="animate-pulse opacity-50 text-acid">_</span>
            <span className="text-v-muted2">DAEMON_READY. WAITING_FOR_OPERATOR_COMMAND...</span>
          </div>
        ) : (
          events.map(evt => {
            if (evt.kind === "finding") return <FindingCard key={evt.id} evt={evt} />;
            if (evt.kind === "probe")   return <ProbeRow    key={evt.id} evt={evt} />;
            return                             <PlainRow    key={evt.id} evt={evt} />;
          })
        )}
      </div>

    </section>
  );
}
