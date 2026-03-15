"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Zap, Shield, Building2, ArrowRight, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  currency?: string;
  interval?: string;
  features: string[];
  tier: string;
  variant_id?: number | null;
}

const TIER_ORDER = ["free", "pro", "enterprise"];

const TIER_COLORS: Record<string, string> = {
  free: "text-v-muted",
  pro: "text-acid",
  enterprise: "text-[#4db8ff]",
};

const TIER_ICONS: Record<string, React.ReactNode> = {
  free: <Shield className="w-4 h-4" />,
  pro: <Zap className="w-4 h-4" />,
  enterprise: <Building2 className="w-4 h-4" />,
};

export default function BillingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const [plansRes, subRes] = await Promise.all([
        fetch(`${API}/billing/plans`),
        fetch(`${API}/billing/subscription`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (plansRes.ok) {
        const d = await plansRes.json();
        setPlans(d.plans || []);
      }
      if (subRes.ok) {
        const d = await subRes.json();
        setCurrentTier(d.tier || "free");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load plans. Please refresh.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(plan: Plan) {
    if (!plan.variant_id) return;
    if (currentTier === plan.tier) {
      router.push("/billing/manage");
      return;
    }

    setCheckoutLoading(plan.id);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const resp = await fetch(`${API}/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          product_variant_id: plan.variant_id,
          customer_email: session.user.email,
          custom_data: { user_id: session.user.id, tier: plan.tier },
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.detail || "Checkout failed. Please try again.");
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  const currentTierIndex = TIER_ORDER.indexOf(currentTier);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-v-muted font-mono text-xs tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin text-acid" />
          LOADING_PLANS...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-acid/5 rounded-full blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#4db8ff]/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-mono tracking-[0.25em] text-acid uppercase">
              // Billing
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3 tracking-tight">
            Choose your plan
          </h1>
          <p className="text-v-muted text-sm max-w-lg">
            Scale your AI security testing. Upgrade or downgrade at any time.
          </p>

          {currentTier !== "free" && (
            <button
              onClick={() => router.push("/billing/manage")}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-acid hover:text-acid/80 transition-colors"
            >
              Manage subscription <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 px-4 py-3 rounded border border-v-red/30 bg-v-red/5 text-v-red text-xs font-mono">
            ! {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier;
            const planIndex = TIER_ORDER.indexOf(plan.tier);
            const isUpgrade = planIndex > currentTierIndex;
            const isDowngrade = planIndex < currentTierIndex;
            const isPro = plan.tier === "pro";
            const isEnterprise = plan.tier === "enterprise";

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-lg border p-6 transition-all",
                  isCurrentPlan
                    ? isPro
                      ? "border-acid/40 bg-acid/5"
                      : isEnterprise
                      ? "border-[#4db8ff]/40 bg-[#4db8ff]/5"
                      : "border-v-border bg-v-bg2"
                    : "border-v-border bg-v-bg2 hover:border-white/12"
                )}
              >
                {/* Top accent line for Pro */}
                {isPro && !isCurrentPlan && (
                  <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-acid to-transparent" />
                )}
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-acid text-black text-[9px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className={cn("flex items-center gap-2 mb-3", TIER_COLORS[plan.tier])}>
                    {TIER_ICONS[plan.tier]}
                    <span className="text-[9px] font-mono tracking-[0.2em] uppercase">
                      {plan.name}
                    </span>
                    {isCurrentPlan && (
                      <span className="ml-auto text-[8px] font-mono tracking-wider text-v-muted2 border border-v-border rounded-full px-1.5 py-0.5">
                        CURRENT
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-v-muted2 text-sm">/ {plan.interval}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-v-muted">
                      <Check
                        className={cn(
                          "w-3.5 h-3.5 mt-0.5 shrink-0",
                          isPro ? "text-acid" : isEnterprise ? "text-[#4db8ff]" : "text-v-muted2"
                        )}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                {isCurrentPlan ? (
                  <button
                    onClick={() => plan.tier !== "free" && router.push("/billing/manage")}
                    className={cn(
                      "w-full py-2.5 rounded text-xs font-mono tracking-widest uppercase transition-colors",
                      plan.tier === "free"
                        ? "bg-v-bg1 border border-v-border text-v-muted cursor-default"
                        : "bg-v-bg1 border border-v-border text-v-muted hover:border-white/15 hover:text-foreground cursor-pointer"
                    )}
                  >
                    {plan.tier === "free" ? "Current Plan" : "Manage"}
                  </button>
                ) : plan.variant_id ? (
                  <button
                    onClick={() => handleCheckout(plan)}
                    disabled={checkoutLoading === plan.id}
                    className={cn(
                      "w-full py-2.5 rounded text-xs font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2",
                      checkoutLoading === plan.id
                        ? "opacity-50 cursor-not-allowed"
                        : isPro
                        ? "bg-acid text-black hover:bg-acid/90 font-bold"
                        : isEnterprise
                        ? "bg-[#4db8ff]/10 border border-[#4db8ff]/40 text-[#4db8ff] hover:bg-[#4db8ff]/15"
                        : "bg-v-bg1 border border-v-border text-v-muted hover:border-white/15 hover:text-foreground"
                    )}
                  >
                    {checkoutLoading === plan.id ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Processing...</>
                    ) : isUpgrade ? (
                      `Upgrade to ${plan.name}`
                    ) : isDowngrade ? (
                      `Downgrade to ${plan.name}`
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-2.5 rounded text-xs font-mono tracking-widest uppercase bg-v-bg1 border border-v-border text-v-muted2 cursor-not-allowed"
                  >
                    Get Started
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-v-border2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-v-muted2">
          <p>
            Questions?{" "}
            <a href="mailto:support@vulnra.ai" className="text-v-muted hover:text-acid transition-colors">
              support@vulnra.ai
            </a>
          </p>
          <div className="flex items-center gap-4">
            <a href="/pricing" className="hover:text-v-muted transition-colors">Pricing comparison</a>
            <a href="/terms" className="hover:text-v-muted transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-v-muted transition-colors">Privacy</a>
          </div>
        </div>

      </div>
    </div>
  );
}
