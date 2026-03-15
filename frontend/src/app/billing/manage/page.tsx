"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  Zap, Building2, Shield, ArrowLeft, ArrowRight,
  AlertTriangle, Loader2, CheckCircle2, XCircle,
} from "lucide-react";

interface Subscription {
  tier: string;
  subscription_id: string | null;
  subscription_status: string;
  user_id: string;
}

const TIER_META: Record<string, { label: string; color: string; icon: React.ReactNode; features: string[] }> = {
  free: {
    label: "Free",
    color: "text-v-muted border-v-border",
    icon: <Shield className="w-4 h-4" />,
    features: ["1 scan / day", "Basic probes (DAN)"],
  },
  pro: {
    label: "Pro",
    color: "text-acid border-acid/30",
    icon: <Zap className="w-4 h-4 text-acid" />,
    features: ["100 scans / day", "40+ vulnerability probes", "Multi-turn attacks", "PDF reports"],
  },
  enterprise: {
    label: "Enterprise",
    color: "text-[#4db8ff] border-[#4db8ff]/30",
    icon: <Building2 className="w-4 h-4 text-[#4db8ff]" />,
    features: ["Unlimited scans", "All probes + MCP scanner", "Team management", "SSO & audit logs"],
  },
};

type CancelStep = "idle" | "confirm" | "cancelling" | "cancelled" | "error";

export default function ManagePage() {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelStep, setCancelStep] = useState<CancelStep>("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const resp = await fetch(`${API}/billing/subscription`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!resp.ok) throw new Error("Failed to fetch subscription");
      const data = await resp.json();
      setSub(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setCancelStep("cancelling");
    setCancelError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const resp = await fetch(`${API}/billing/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!resp.ok) {
        const data = await resp.json();
        setCancelError(data.detail || "Cancellation failed.");
        setCancelStep("error");
        return;
      }

      setCancelStep("cancelled");
      // Refresh subscription state
      await fetchSubscription();
    } catch {
      setCancelError("Network error. Please try again.");
      setCancelStep("error");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-v-muted font-mono text-xs tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin text-acid" />
          LOADING...
        </div>
      </div>
    );
  }

  const tier = sub?.tier || "free";
  const meta = TIER_META[tier] || TIER_META.free;
  const hasPaidSub = tier !== "free" && sub?.subscription_id;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/4 rounded-full blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#4db8ff]/4 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-16">

        {/* Back nav */}
        <button
          onClick={() => router.push("/billing")}
          className="flex items-center gap-1.5 text-xs font-mono text-v-muted2 hover:text-v-muted transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
        </button>

        {/* Header */}
        <div className="mb-10">
          <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
            // Manage Subscription
          </span>
          <h1 className="text-2xl font-bold text-foreground mt-3">
            Your subscription
          </h1>
        </div>

        {/* Current plan card */}
        <div className={cn(
          "rounded-lg border p-6 mb-6",
          tier === "pro" ? "border-acid/25 bg-acid/5"
            : tier === "enterprise" ? "border-[#4db8ff]/25 bg-[#4db8ff]/5"
            : "border-v-border bg-v-bg2"
        )}>
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className={cn("flex items-center gap-2 text-xs font-mono mb-1", meta.color.split(" ")[0])}>
                {meta.icon}
                <span className="tracking-widest uppercase">{meta.label} Plan</span>
              </div>
              <p className="text-v-muted2 text-xs">
                {tier === "free"
                  ? "You're on the free plan."
                  : `Active subscription · ID: ${sub?.subscription_id ?? "—"}`}
              </p>
            </div>

            <div className={cn(
              "shrink-0 text-[9px] font-mono tracking-widest uppercase px-2.5 py-1 rounded border",
              tier === "free"
                ? "text-v-muted2 border-v-border"
                : "text-acid border-acid/30 bg-acid/5"
            )}>
              {tier === "free" ? "FREE" : "ACTIVE"}
            </div>
          </div>

          <ul className="space-y-2">
            {meta.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-v-muted">
                <CheckCircle2 className={cn(
                  "w-3.5 h-3.5 shrink-0",
                  tier === "pro" ? "text-acid" : tier === "enterprise" ? "text-[#4db8ff]" : "text-v-muted2"
                )} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Upgrade CTA for free users */}
        {tier === "free" && (
          <div className="rounded-lg border border-v-border bg-v-bg2 p-5 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Ready to upgrade?</p>
              <p className="text-xs text-v-muted">Get 100x more scans and advanced attack probes.</p>
            </div>
            <button
              onClick={() => router.push("/billing")}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-acid text-black text-xs font-mono font-bold tracking-widest uppercase rounded hover:bg-acid/90 transition-colors"
            >
              Upgrade <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cancellation section */}
        {hasPaidSub && (
          <div className="rounded-lg border border-v-border bg-v-bg2 p-5">
            <h3 className="text-sm font-medium text-foreground mb-1">Cancel subscription</h3>
            <p className="text-xs text-v-muted mb-5">
              Your access will revert to the Free tier immediately upon cancellation.
              You will not be charged again.
            </p>

            {cancelStep === "idle" && (
              <button
                onClick={() => setCancelStep("confirm")}
                className="text-xs font-mono text-v-red hover:text-v-red/80 border border-v-red/20 hover:border-v-red/40 px-4 py-2 rounded transition-colors tracking-widest uppercase"
              >
                Cancel subscription
              </button>
            )}

            {cancelStep === "confirm" && (
              <div className="rounded border border-v-red/20 bg-v-red/5 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-4 h-4 text-v-red mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground font-medium mb-1">
                      Cancel {meta.label} subscription?
                    </p>
                    <p className="text-xs text-v-muted">
                      You'll lose access to all paid features immediately.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-v-red/10 border border-v-red/30 text-v-red text-xs font-mono tracking-widest uppercase rounded hover:bg-v-red/20 transition-colors"
                  >
                    Yes, cancel it
                  </button>
                  <button
                    onClick={() => setCancelStep("idle")}
                    className="px-4 py-2 text-v-muted text-xs font-mono tracking-widest uppercase border border-v-border rounded hover:border-white/15 hover:text-foreground transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            )}

            {cancelStep === "cancelling" && (
              <div className="flex items-center gap-3 text-v-muted text-xs font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-acid" />
                Cancelling subscription...
              </div>
            )}

            {cancelStep === "cancelled" && (
              <div className="flex items-center gap-2 text-xs font-mono text-v-muted">
                <XCircle className="w-4 h-4 text-v-red" />
                Subscription cancelled. You're now on the Free tier.
              </div>
            )}

            {cancelStep === "error" && (
              <div className="rounded border border-v-red/20 bg-v-red/5 p-4">
                <p className="text-xs text-v-red font-mono mb-3">! {cancelError}</p>
                <button
                  onClick={() => setCancelStep("idle")}
                  className="text-xs font-mono text-v-muted hover:text-foreground transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-xs text-v-muted2 text-center">
          Need help with billing?{" "}
          <a href="mailto:support@vulnra.ai" className="text-v-muted hover:text-acid transition-colors">
            support@vulnra.ai
          </a>
        </p>

      </div>
    </div>
  );
}
