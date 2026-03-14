"use client";

import { useState } from "react";
import { Globe, Cpu, Zap, Activity, Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanConfigProps {
  onStart: (config: { url: string; tier: string; attackType?: string }) => void;
  isScanning: boolean;
}

export default function ScanConfig({ onStart, isScanning }: ScanConfigProps) {
  const [url, setUrl] = useState("");
  const [tier, setTier] = useState("free");
  const [attackType, setAttackType] = useState("crescendo");
  
  // Rate limit configuration based on tier
  const rateLimitConfig = {
    free: { limit: 1, window: 60 },
    pro: { limit: 10, window: 60 },
    enterprise: { limit: 100, window: 60 }
  };
  
  const currentLimit = rateLimitConfig[tier as keyof typeof rateLimitConfig] || rateLimitConfig.free;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onStart({ url, tier, attackType });
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

      <div className="flex flex-col gap-1.5">
        <label className="text-[8.5px] font-mono tracking-widest uppercase text-v-muted2">Attack Type</label>
        <div className="flex gap-1">
          {["crescendo", "goat"].map((type) => (
            <button
              key={type}
              type="button"
              disabled={isScanning}
              onClick={() => setAttackType(type)}
              className={cn(
                "flex-1 font-mono text-[9px] tracking-tight bg-v-bg2 border border-v-border rounded-sm py-1.75 text-center transition-all",
                attackType === type ? "border-acid text-acid bg-acid/10" : "text-v-muted2 hover:border-white/10 hover:text-v-muted"
              )}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[1px] bg-v-border2 my-1" />

      {/* Rate Limit Status Panel */}
      <div className="flex flex-col gap-2 bg-black/20 border border-v-border2 rounded-sm p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-acid" />
            <span className="text-[8.5px] font-mono tracking-widest uppercase text-v-muted2">Rate Limit Status</span>
          </div>
          <span className={cn(
            "text-[8px] px-1.5 py-0.5 rounded-[2px] border font-bold",
            tier === "enterprise" ? "bg-v-amber/10 text-v-amber border-v-amber/20" : "bg-acid/10 text-acid border-acid/20"
          )}>
            {tier.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-v-muted2">LIMIT:</span>
            <span className="text-acid">{currentLimit.limit}</span>
            <span className="text-v-muted2">/min</span>
          </div>
          <div className="h-3 w-[1px] bg-v-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-v-muted2">WINDOW:</span>
            <span className="text-acid">{currentLimit.window}</span>
            <span className="text-v-muted2">sec</span>
          </div>
        </div>
        {tier === "free" && (
          <div className="flex items-center gap-1.5 text-[9px] text-v-amber/80 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Upgrade to Pro for 10x higher limits</span>
          </div>
        )}
      </div>

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
