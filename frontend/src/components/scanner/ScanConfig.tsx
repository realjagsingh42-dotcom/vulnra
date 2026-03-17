"use client";

import { useState, useEffect } from "react";
import { Globe, Timer, AlertTriangle, ChevronDown, ChevronRight, SlidersHorizontal, CheckSquare, Square, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Probe catalogue (mirrors backend PROBE_CATALOGUE) ────────────────────────
const GARAK_PROBES = [
  { id: "dan.AutoDANCached",                  name: "AutoDAN",              category: "Jailbreak",        tier_minimum: "free"       },
  { id: "dan.AntiDAN",                        name: "Anti-DAN",             category: "Jailbreak",        tier_minimum: "basic"      },
  { id: "promptinject.HijackHateHumans",      name: "Prompt Hijack",        category: "Prompt Injection", tier_minimum: "pro"        },
  { id: "promptinject.HijackLongPrompt",      name: "Long Prompt Hijack",   category: "Prompt Injection", tier_minimum: "enterprise" },
  { id: "encoding.InjectBase64",              name: "Base64 Bypass",        category: "Encoding Attack",  tier_minimum: "enterprise" },
  { id: "encoding.InjectBase32",              name: "Base32 Bypass",        category: "Encoding Attack",  tier_minimum: "enterprise" },
  { id: "continuation.ContinueSlursReclaimedSlurs", name: "Continuation", category: "Policy Bypass",    tier_minimum: "enterprise" },
] as const;

const DT_VULNS = [
  { id: "Jailbreak",            name: "Jailbreak",              tier_minimum: "free"       },
  { id: "PromptInjection",      name: "Prompt Injection",       tier_minimum: "free"       },
  { id: "DataPrivacy",          name: "Data Privacy / PII",     tier_minimum: "free"       },
  { id: "Toxicity",             name: "Toxicity",               tier_minimum: "pro"        },
  { id: "Bias",                 name: "Bias / Fairness",        tier_minimum: "pro"        },
  { id: "Misinformation",       name: "Misinformation",         tier_minimum: "pro"        },
  { id: "IllegalRisks",         name: "Illegal Content",        tier_minimum: "pro"        },
  { id: "UnauthorizedAccess",   name: "Unauthorised Access",    tier_minimum: "pro"        },
  { id: "PromptLeakage",        name: "System Prompt Leakage",  tier_minimum: "pro"        },
  { id: "ExcessiveAgency",      name: "Excessive Agency",       tier_minimum: "enterprise" },
  { id: "ToolMetadataPoisoning","name": "Tool Metadata Poisoning", tier_minimum: "enterprise" },
  { id: "ShellInjection",       name: "Shell Injection",        tier_minimum: "enterprise" },
  { id: "SQLInjection",         name: "SQL Injection",          tier_minimum: "enterprise" },
] as const;

const TIER_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2, enterprise: 3 };

const PRESETS: Record<string, { label: string; garak: string[] | null; dt: string[] | null; desc: string }> = {
  full_sweep: {
    label: "Full Sweep",
    garak: null,
    dt:    null,
    desc:  "All probes available on your tier",
  },
  owasp_top10: {
    label: "OWASP LLM Top 10",
    garak: ["dan.AutoDANCached", "dan.AntiDAN", "promptinject.HijackHateHumans",
            "promptinject.HijackLongPrompt", "encoding.InjectBase64",
            "encoding.InjectBase32", "continuation.ContinueSlursReclaimedSlurs"],
    dt:    ["Jailbreak", "PromptInjection", "PromptLeakage", "ExcessiveAgency"],
    desc:  "Maps all 10 OWASP LLM categories",
  },
  jailbreaks_only: {
    label: "Jailbreaks Only",
    garak: ["dan.AutoDANCached", "dan.AntiDAN"],
    dt:    ["Jailbreak"],
    desc:  "DAN variants, AutoDAN, role-play bypasses",
  },
  compliance_audit: {
    label: "Compliance Audit",
    garak: ["promptinject.HijackHateHumans", "promptinject.HijackLongPrompt",
            "encoding.InjectBase64", "encoding.InjectBase32"],
    dt:    ["PromptInjection", "PromptLeakage", "DataPrivacy", "IllegalRisks"],
    desc:  "Probes with direct compliance framework mappings",
  },
};

interface ScanConfigProps {
  onStart: (config: {
    url: string;
    tier: string;
    attackType?: string;
    probes?: string[];
    vulnerabilityTypes?: string[];
  }) => void;
  isScanning: boolean;
}

export default function ScanConfig({ onStart, isScanning }: ScanConfigProps) {
  const [url, setUrl]             = useState("");
  const [tier, setTier]           = useState("free");
  const [attackType, setAttackType] = useState("crescendo");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preset, setPreset]       = useState<string>("full_sweep");

  // Garak probe selection (Enterprise: per-probe; Pro: by category)
  const [selectedGarak, setSelectedGarak] = useState<Set<string>>(new Set());
  // DeepTeam vuln selection
  const [selectedDT, setSelectedDT]       = useState<Set<string>>(new Set());

  const tierLevel = TIER_ORDER[tier] ?? 0;

  const accessibleGarak = GARAK_PROBES.filter(p => TIER_ORDER[p.tier_minimum] <= tierLevel);
  const accessibleDT    = DT_VULNS.filter(p => TIER_ORDER[p.tier_minimum] <= tierLevel);

  // Group Garak probes by category
  const garakByCategory: Record<string, typeof accessibleGarak> = {};
  for (const p of accessibleGarak) {
    if (!garakByCategory[p.category]) garakByCategory[p.category] = [];
    garakByCategory[p.category].push(p);
  }

  // Apply preset
  useEffect(() => {
    const p = PRESETS[preset];
    if (!p) return;
    if (p.garak === null) {
      setSelectedGarak(new Set(accessibleGarak.map(x => x.id)));
    } else {
      setSelectedGarak(new Set(p.garak.filter(id => accessibleGarak.some(x => x.id === id))));
    }
    if (p.dt === null) {
      setSelectedDT(new Set(accessibleDT.map(x => x.id)));
    } else {
      setSelectedDT(new Set(p.dt.filter(id => accessibleDT.some(x => x.id === id))));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, tier]);

  const rateLimitConfig = { free: { limit: 1, window: 60 }, pro: { limit: 10, window: 60 }, enterprise: { limit: 100, window: 60 } };
  const currentLimit    = rateLimitConfig[tier as keyof typeof rateLimitConfig] || rateLimitConfig.free;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Only send custom lists when NOT using full_sweep (so backend uses tier defaults)
    const probes = preset === "full_sweep" ? undefined : Array.from(selectedGarak);
    const vulnerabilityTypes = preset === "full_sweep" ? undefined : Array.from(selectedDT);

    onStart({ url, tier, attackType, probes, vulnerabilityTypes });
  };

  const toggleGarak = (id: string) => {
    setPreset("custom");
    setSelectedGarak(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleDT = (id: string) => {
    setPreset("custom");
    setSelectedDT(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGarakCategory = (cat: string) => {
    setPreset("custom");
    const catIds = (garakByCategory[cat] ?? []).map(p => p.id);
    const allOn  = catIds.every(id => selectedGarak.has(id));
    setSelectedGarak(prev => {
      const next = new Set(prev);
      catIds.forEach(id => allOn ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const isProOrHigher = tierLevel >= TIER_ORDER["pro"];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1 p-4">
      {/* Target URL */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[8.5px] font-mono tracking-widest uppercase text-v-muted2">Target URL</label>
        <div className="relative flex items-center group">
          <Globe className="absolute left-3 w-3.5 h-3.5 text-v-muted2 group-focus-within:text-acid transition-colors" />
          <input
            id="scan-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isScanning}
            placeholder="https://example.com"
            className="w-full bg-v-bg2 border border-v-border rounded-sm py-2.25 pl-9 pr-3 text-[10.5px] font-mono outline-none focus:border-acid/35 focus:bg-acid/2 transition-all placeholder:text-v-muted3"
          />
        </div>
      </div>

      {/* Tier Selection */}
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

      {/* Attack Type */}
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

      <div className="h-[1px] bg-v-border2" />

      {/* Advanced Config Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        disabled={isScanning}
        className="flex items-center gap-2 text-[9px] font-mono tracking-widest uppercase text-v-muted2 hover:text-acid transition-colors group"
      >
        <SlidersHorizontal className="w-3 h-3" />
        Advanced Config
        {showAdvanced
          ? <ChevronDown className="w-3 h-3 ml-auto" />
          : <ChevronRight className="w-3 h-3 ml-auto" />
        }
        {preset !== "full_sweep" && preset !== "custom" && (
          <span className="ml-1 px-1.5 py-0.5 bg-acid/10 border border-acid/30 rounded text-acid text-[8px]">
            {PRESETS[preset]?.label}
          </span>
        )}
        {preset === "custom" && (
          <span className="ml-1 px-1.5 py-0.5 bg-v-amber/10 border border-v-amber/30 rounded text-v-amber text-[8px]">
            CUSTOM
          </span>
        )}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 bg-black/20 border border-v-border2 rounded-sm p-3">
          {/* Preset Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-mono tracking-widest uppercase text-v-muted2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-acid/60" />
              Scan Preset
            </label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(PRESETS).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  disabled={isScanning}
                  onClick={() => setPreset(key)}
                  title={p.desc}
                  className={cn(
                    "font-mono text-[8.5px] py-1.5 px-2 rounded-sm border transition-all text-left",
                    preset === key
                      ? "border-acid/40 text-acid bg-acid/10"
                      : "border-v-border text-v-muted2 hover:border-white/10 hover:text-v-muted bg-v-bg2"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Garak Probe Selection */}
          {accessibleGarak.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-mono tracking-widest uppercase text-v-muted2">
                Garak Probes {!isProOrHigher && <span className="text-v-amber ml-1">(Pro+)</span>}
              </label>
              <div className="space-y-2">
                {Object.entries(garakByCategory).map(([cat, probes]) => {
                  const allOn = probes.every(p => selectedGarak.has(p.id));
                  // Pro: category-level only. Enterprise: individual probes visible
                  return (
                    <div key={cat}>
                      <button
                        type="button"
                        disabled={isScanning}
                        onClick={() => toggleGarakCategory(cat)}
                        className="flex items-center gap-1.5 w-full text-left hover:text-white transition-colors"
                      >
                        {allOn
                          ? <CheckSquare className="w-3 h-3 text-acid shrink-0" />
                          : <Square className="w-3 h-3 text-v-muted3 shrink-0" />
                        }
                        <span className="font-mono text-[9.5px] text-v-muted">{cat}</span>
                        <span className="text-[8px] text-v-muted3 ml-auto">{probes.length}</span>
                      </button>
                      {/* Enterprise: show individual probes */}
                      {tierLevel >= TIER_ORDER["enterprise"] && (
                        <div className="pl-5 space-y-1 mt-1">
                          {probes.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isScanning}
                              onClick={() => toggleGarak(p.id)}
                              className="flex items-center gap-1.5 w-full text-left hover:text-white transition-colors"
                            >
                              {selectedGarak.has(p.id)
                                ? <CheckSquare className="w-2.5 h-2.5 text-acid shrink-0" />
                                : <Square className="w-2.5 h-2.5 text-v-muted3 shrink-0" />
                              }
                              <span className="font-mono text-[9px] text-v-muted2">{p.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DeepTeam Vuln Selection (Pro+) */}
          {isProOrHigher && accessibleDT.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-mono tracking-widest uppercase text-v-muted2">DeepTeam Vulnerabilities</label>
              <div className="grid grid-cols-2 gap-1">
                {accessibleDT.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isScanning}
                    onClick={() => toggleDT(v.id)}
                    className="flex items-center gap-1 text-left hover:text-white transition-colors"
                  >
                    {selectedDT.has(v.id)
                      ? <CheckSquare className="w-3 h-3 text-acid shrink-0" />
                      : <Square className="w-3 h-3 text-v-muted3 shrink-0" />
                    }
                    <span className="font-mono text-[9px] text-v-muted2 truncate">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isProOrHigher && (
            <p className="font-mono text-[9px] text-v-muted2">
              Upgrade to <span className="text-acid">Pro</span> to customise probe selection.
            </p>
          )}
        </div>
      )}

      <div className="h-[1px] bg-v-border2" />

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
