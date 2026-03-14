"use client";

import { useEffect, useRef } from "react";
import { Terminal as TerminalIcon } from "lucide-react";

interface TerminalProps {
  logs: string[];
}

export default function Terminal({ logs }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <section className="flex flex-col overflow-hidden bg-black/20 flex-1">
      <div className="h-9.5 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-4 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.25 h-2.25 rounded-full bg-v-red/40" />
          <div className="w-2.25 h-2.25 rounded-full bg-v-amber/40" />
          <div className="w-2.25 h-2.25 rounded-full bg-acid/40" />
        </div>
        <span className="text-[9.5px] font-mono text-v-muted2 tracking-widest">REALTIME_EXECUTION_STREAM</span>
        <div className="flex gap-2 text-v-muted2">
          <TerminalIcon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div 
        ref={terminalRef}
        className="flex-1 p-5 font-mono text-[11px] text-acid/80 overflow-y-auto leading-relaxed custom-scrollbar"
      >
        <div className="flex flex-col gap-1">
          {logs.length === 0 ? (
            <div className="flex items-center gap-2">
              <span className="animate-pulse opacity-50">_</span>
              <span className="text-v-muted2">DAEMON_READY. WAITING_FOR_OPERATOR_COMMAND...</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-v-muted2 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                <span className={cn(
                  log.startsWith("!") ? "text-v-red" : 
                  log.startsWith("?") ? "text-v-amber" : 
                  log.startsWith("+") ? "text-acid" : 
                  "text-acid/80"
                )}>
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
