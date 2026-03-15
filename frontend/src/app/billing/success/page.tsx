"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, Zap, Building2, ArrowRight, AlertCircle } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  pro: "Pro",
  enterprise: "Enterprise",
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  pro: <Zap className="w-5 h-5 text-acid" />,
  enterprise: <Building2 className="w-5 h-5 text-[#4db8ff]" />,
};

const TIER_COLORS: Record<string, string> = {
  pro: "text-acid border-acid/30 bg-acid/5",
  enterprise: "text-[#4db8ff] border-[#4db8ff]/30 bg-[#4db8ff]/5",
};

type State = "polling" | "success" | "timeout";

export default function BillingSuccessPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("polling");
  const [tier, setTier] = useState<string>("pro");
  const [countdown, setCountdown] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    startPolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  async function checkTier(): Promise<string> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return "free";

    const resp = await fetch(`${API}/billing/subscription`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!resp.ok) return "free";
    const data = await resp.json();
    return data.tier || "free";
  }

  function startPolling() {
    let attempts = 0;
    const MAX_ATTEMPTS = 15; // 30 seconds at 2s interval

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const newTier = await checkTier();

        if (newTier !== "free") {
          clearInterval(pollRef.current!);
          setTier(newTier);
          setState("success");
          startCountdown();
          return;
        }
      } catch {
        // continue polling
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollRef.current!);
        setState("timeout");
      }
    }, 2000);
  }

  function startCountdown() {
    countRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countRef.current!);
          router.push("/scanner");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-6">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#4db8ff]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-md w-full">

        {/* Polling state */}
        {state === "polling" && (
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border border-acid/20 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-acid animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border border-acid/10 animate-ping" />
              </div>
            </div>

            <p className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase mb-3">
              // Payment Received
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Activating your plan...
            </h1>
            <p className="text-v-muted text-sm">
              Confirming your subscription with our billing provider.
              This usually takes a few seconds.
            </p>

            <div className="mt-8 flex items-center justify-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-acid rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Success state */}
        {state === "success" && (
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className={cn(
                "w-16 h-16 rounded-full border flex items-center justify-center",
                tier === "enterprise" ? "border-[#4db8ff]/30 bg-[#4db8ff]/5" : "border-acid/30 bg-acid/5"
              )}>
                <CheckCircle2 className={cn(
                  "w-8 h-8",
                  tier === "enterprise" ? "text-[#4db8ff]" : "text-acid"
                )} />
              </div>
            </div>

            <p className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase mb-3">
              // Upgrade Complete
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Welcome to {TIER_LABELS[tier] || tier}
            </h1>
            <p className="text-v-muted text-sm mb-8">
              Your account has been upgraded. All features are now unlocked.
            </p>

            {/* Tier badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-mono mb-8",
              TIER_COLORS[tier] || "text-acid border-acid/30 bg-acid/5"
            )}>
              {TIER_ICONS[tier]}
              {TIER_LABELS[tier] || tier} Plan Active
            </div>

            {/* Redirect countdown */}
            <div className="mt-2">
              <p className="text-v-muted2 text-xs font-mono mb-4">
                Redirecting to scanner in{" "}
                <span className={tier === "enterprise" ? "text-[#4db8ff]" : "text-acid"}>
                  {countdown}s
                </span>
                ...
              </p>

              <button
                onClick={() => router.push("/scanner")}
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-2.5 rounded text-xs font-mono tracking-widest uppercase transition-all",
                  tier === "enterprise"
                    ? "bg-[#4db8ff]/10 border border-[#4db8ff]/40 text-[#4db8ff] hover:bg-[#4db8ff]/20"
                    : "bg-acid text-black hover:bg-acid/90 font-bold"
                )}
              >
                Start scanning <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Timeout state */}
        {state === "timeout" && (
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full border border-v-amber/30 bg-v-amber/5 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-v-amber" />
              </div>
            </div>

            <p className="text-[9px] font-mono tracking-[0.25em] text-v-amber uppercase mb-3">
              // Activation Delayed
            </p>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Payment received
            </h1>
            <p className="text-v-muted text-sm mb-8">
              Your payment was successful but account activation is taking longer than expected.
              Your plan will be activated within a few minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => { setState("polling"); startPolling(); }}
                className="px-5 py-2.5 rounded text-xs font-mono tracking-widest uppercase bg-v-bg2 border border-v-border text-v-muted hover:border-white/15 hover:text-foreground transition-colors"
              >
                Check again
              </button>
              <button
                onClick={() => router.push("/scanner")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-xs font-mono tracking-widest uppercase bg-acid text-black hover:bg-acid/90 font-bold transition-colors"
              >
                Go to scanner <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="mt-6 text-xs text-v-muted2">
              Need help?{" "}
              <a href="mailto:support@vulnra.ai" className="text-v-muted hover:text-acid transition-colors">
                support@vulnra.ai
              </a>
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
