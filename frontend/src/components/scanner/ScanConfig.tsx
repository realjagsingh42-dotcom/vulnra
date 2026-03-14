"use client";

import { useState } from "react";
import { Globe, Cpu, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanConfigProps {
  onStart: (config: { url: string; tier: string }) => void;
  isScanning: boolean;
}

export default function ScanConfig({ onStart, isScanning }: ScanConfigProps) {
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState("free");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onStart({ url, tier });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[8.5px] font-mono tracking-widest uppercase text-v-muted2">Target URL</label>
        <div className="relative flex items-center group">
          <Globe className="absolute left-3 w-3.5 h-3.5 text-v-muted2 group-focus-within:text-acid transition-colors" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScanning}
            placeholder="https://example.com"
            className="w-full bg-v-bg2 border border-v-border rounded-sm py-2.25 pl-9 pr-3 text-[10.5px] font-mono outline-none focus:border-acid/35 focus:bg-acid/2 transition-all placeholder:text-v-muted3"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[8.5px] font-mono tracking-widest uppercase text-v-muted2">Tier Selection</label>
        <div className="flex gap-1">
          {["free", "pro", "enterprise"].map((t) => (
            <button
              key={t}
              type="button"
              disabled={isScanning}
              onClick={() => setTier(t)}
              className={cn(
                "flex-1 font-mono text-[9px] tracking-tight bg-v-bg2 border border-v-border rounded-sm py-1.75 text-center transition-all",
                tier === t ? "border-acid text-acid bg-acid/10" : "text-v-muted2 hover:border-white/10 hover:text-v-muted"
              )}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-v-border2 my-1" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-10 font-mono text-foreground">DeepTeam Engine</span>
            <span className="text-[10px] text-v-muted2 font-light italic">Advanced LLM jailbreak probes</span>
          </div>
          <div className={cn("w-7.5 h-4 rounded-full border relative cursor-pointer transition-all", tier !== "free" ? "bg-acid/10 border-acid/40" : "bg-v-bg3 border-v-border")}>
             <div className={cn("absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all", tier !== "free" ? "left-4 bg-acid" : "left-0.5 bg-v-muted2")} />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-10 font-mono text-foreground">AI Judge Verification</span>
            <span className="text-[10px] text-v-muted2 font-light italic">Claude-powered bypass analysis</span>
          </div>
          <div className={cn("w-7.5 h-4 rounded-full border relative cursor-pointer transition-all", tier !== "free" ? "bg-acid/10 border-acid/40" : "bg-v-bg2 border-v-border opacity-50")}>
             <div className={cn("absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all", tier !== "free" ? "left-4 bg-acid" : "left-0.5 bg-v-muted2")} />
          </div>
        </div>
      </div>
      
      <div className="mt-auto">
        <button 
          type="submit"
          disabled={isScanning || !url}
          className="w-full bg-acid text-black font-mono text-[10.5px] font-bold tracking-widest py-3 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
        >
          {isScanning ? "SCANNING..." : "START_AUDIT"}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shine_0.6s_ease_forwards]" />
        </button>
      </div>
    </form>
  );
}
