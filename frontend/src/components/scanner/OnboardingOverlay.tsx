"use client";

import { useState } from "react";
import { Shield, ChevronRight, ChevronLeft, X, Zap, Target, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

interface OnboardingOverlayProps {
  apiUrl: string;
  onLaunch: (url: string, depth: string) => void;
  onDemoScan: (scanId: string) => void;
  onDismiss: () => void;
}

// ─── Depth options ─────────────────────────────────────────────────────────────

const DEPTHS = [
  {
    id: "free",
    label: "QUICK",
    tier: "Free",
    time: "~30 sec",
    cats: "3 categories",
    desc: "Injection · Jailbreak · Data Leakage",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "basic",
    label: "STANDARD",
    tier: "Recommended",
    time: "~2 min",
    cats: "8 categories",
    desc: "All basic + Policy Bypass · Encoding · Multi-vector",
    icon: <Target className="w-4 h-4" />,
    recommended: true,
  },
  {
    id: "pro",
    label: "DEEP",
    tier: "Enterprise",
    time: "~5 min",
    cats: "15 categories",
    desc: "All probes + Multi-turn attack chains",
    icon: <Layers className="w-4 h-4" />,
  },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingOverlay({
  apiUrl,
  onLaunch,
  onDemoScan,
  onDismiss,
}: OnboardingOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [url, setUrl] = useState("");
  const [depth, setDepth] = useState<string>("basic");
  const [demoLoading, setDemoLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  const supabase = createClient();

  // ── Demo scan ──
  const handleDemoScan = async () => {
    setDemoLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(`${apiUrl}/scan/demo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) throw new Error("Demo scan failed");
      const data = await resp.json();
      onDemoScan(data.scan_id);
    } catch {
      setUrlError("Demo scan failed — please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  // ── URL validation ──
  const validateUrl = () => {
    try {
      const u = new URL(url.trim());
      if (!["http:", "https:"].includes(u.protocol)) {
        setUrlError("URL must start with http:// or https://");
        return false;
      }
      setUrlError("");
      return true;
    } catch {
      setUrlError("Enter a valid URL (e.g. https://api.example.com/v1/chat/completions)");
      return false;
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!url.trim()) {
        setUrlError("Enter an endpoint URL or use the demo scan.");
        return;
      }
      if (!validateUrl()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleLaunch = () => {
    onLaunch(url.trim(), depth);
  };

  // ── Step dots ──
  const Dots = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            n === step ? "w-6 bg-acid" : n < step ? "w-3 bg-acid/40" : "w-3 bg-white/10"
          )}
        />
      ))}
      <span className="text-[9px] font-mono text-v-muted2 ml-1 tracking-widest">
        {step}/3
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-[480px] bg-v-bg1 border border-v-border2 rounded-sm shadow-2xl">

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-sm border border-v-border text-v-muted2 hover:text-foreground hover:border-white/20 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header */}
        <div className="px-8 pt-7 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded bg-acid flex items-center justify-center">
              <Shield className="w-3 h-3 text-black" />
            </div>
            <span className="text-[9px] font-mono text-acid tracking-widest uppercase">
              VULNRA — Security Orientation
            </span>
          </div>
          <div className="h-px bg-v-border2 mt-4 mb-5" />
          <Dots />
        </div>

        {/* Content */}
        <div className="px-8 pb-8">

          {/* ── Step 1: Endpoint ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[13px] font-mono font-bold text-foreground mb-1 tracking-wide">
                  SET TARGET ENDPOINT
                </h2>
                <p className="text-[10.5px] text-v-muted leading-relaxed">
                  Paste the URL of your OpenAI-compatible LLM API endpoint.
                  VULNRA will probe it with adversarial inputs and map results to OWASP LLM Top 10.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-mono text-v-muted2 uppercase tracking-widest">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleNext()}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className={cn(
                    "w-full bg-black/30 border text-[11px] font-mono text-foreground",
                    "placeholder:text-v-muted2/50 px-3 py-2.5 rounded focus:outline-none transition-colors",
                    urlError
                      ? "border-v-red/50 focus:border-v-red"
                      : "border-v-border focus:border-acid/40"
                  )}
                />
                {urlError && (
                  <p className="text-[9px] font-mono text-v-red">{urlError}</p>
                )}
              </div>

              {/* Demo divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-v-border2" />
                <span className="text-[9px] font-mono text-v-muted2 tracking-widest">OR</span>
                <div className="flex-1 h-px bg-v-border2" />
              </div>

              {/* Demo CTA */}
              <button
                onClick={handleDemoScan}
                disabled={demoLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-sm border",
                  "font-mono text-[11px] transition-all",
                  demoLoading
                    ? "border-v-border text-v-muted2 opacity-60 cursor-not-allowed"
                    : "border-acid/40 text-acid bg-acid/5 hover:bg-acid/10 hover:border-acid/60"
                )}
              >
                <Zap className="w-4 h-4" />
                {demoLoading ? "CREATING DEMO SCAN..." : "⚡ TRY DEMO — INSTANT RESULTS"}
              </button>
              <p className="text-[9px] text-v-muted2 text-center leading-relaxed -mt-2">
                Scans our intentionally-vulnerable demo model. No setup needed.
              </p>
            </div>
          )}

          {/* ── Step 2: Depth ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-[13px] font-mono font-bold text-foreground mb-1 tracking-wide">
                  CHOOSE SCAN DEPTH
                </h2>
                <p className="text-[10.5px] text-v-muted leading-relaxed">
                  More categories means more coverage and longer scan time.
                </p>
              </div>

              <div className="space-y-2">
                {DEPTHS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDepth(d.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-sm border transition-all",
                      depth === d.id
                        ? "border-acid/50 bg-acid/5"
                        : "border-v-border bg-black/20 hover:border-white/15"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-mono font-bold tracking-wider",
                          depth === d.id ? "text-acid" : "text-foreground"
                        )}>
                          {d.label}
                        </span>
                        {d.recommended && (
                          <span className="text-[7px] font-mono px-1.5 py-0.5 bg-acid/15 text-acid border border-acid/25 rounded tracking-wider">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-mono text-v-muted2">
                        <span>{d.cats}</span>
                        <span className="text-v-border2">·</span>
                        <span>{d.time}</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-v-muted2 leading-relaxed">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-[13px] font-mono font-bold text-foreground mb-1 tracking-wide">
                  READY TO LAUNCH
                </h2>
                <p className="text-[10.5px] text-v-muted leading-relaxed">
                  Review your scan configuration before probing begins.
                </p>
              </div>

              {/* Config summary */}
              <div className="bg-black/30 border border-v-border rounded-sm p-4 space-y-2.5">
                {[
                  { label: "TARGET", value: (() => { try { return new URL(url).host; } catch { return url; } })() },
                  { label: "DEPTH",  value: DEPTHS.find(d => d.id === depth)?.label ?? depth.toUpperCase() },
                  { label: "PROBES", value: DEPTHS.find(d => d.id === depth)?.cats ?? "—" },
                  { label: "EST. TIME", value: DEPTHS.find(d => d.id === depth)?.time ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-v-muted2 tracking-widest">{label}</span>
                    <span className="text-[10px] font-mono text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-v-muted2 leading-relaxed">
                Your endpoint will receive adversarial probe inputs.
                Results appear live in the terminal.
              </p>

              <button
                onClick={handleLaunch}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-sm
                           bg-acid text-black font-mono font-bold text-[12px] tracking-wider
                           hover:bg-acid/90 transition-all"
              >
                <Zap className="w-4 h-4" />
                INITIATE SCAN
              </button>
            </div>
          )}

          {/* ── Navigation ── */}
          {(step === 2 || step === 3) && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-v-border2">
              <button
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="flex items-center gap-1.5 text-[10px] font-mono text-v-muted2 hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                BACK
              </button>

              {step < 3 && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-acid hover:text-acid/80 transition-colors"
                >
                  NEXT
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="flex justify-end mt-6 pt-4 border-t border-v-border2">
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 text-[10px] font-mono text-acid hover:text-acid/80 transition-colors"
              >
                NEXT
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
