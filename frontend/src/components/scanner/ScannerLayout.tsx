"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LogOut, BarChart3, Settings, Activity, Timer, Server, FileDown, Loader2, History, Link2, CheckCheck, Key, Radio, Database, Building2, TrendingUp } from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import ScanConfig from "./ScanConfig";
import Terminal from "./Terminal";
import MultiTurnResults from "./MultiTurnResults";
import FindingsPanel from "./FindingsPanel";
import RiskScoreViz from "./RiskScoreViz";
import OnboardingOverlay from "./OnboardingOverlay";
import type { TerminalEvent } from "./types";

// ── Probe sequences per scan depth ───────────────────────────────────────────
const PROBE_SEQS: Record<string, string[]> = {
  free:  ["Injection", "Jailbreak", "Data Leakage"],
  basic: ["Injection", "Jailbreak", "Data Leakage", "Policy Bypass",
          "Encoding Attack", "Multi-vector", "Role Play", "System Override"],
  pro:   ["Injection", "Jailbreak", "Data Leakage", "Policy Bypass",
          "Encoding Attack", "Multi-vector", "Role Play", "System Override",
          "Insecure Output", "Sensitive Disclosure", "Hallucination",
          "Supply Chain", "Model DoS", "Bias Amplification", "Agentic Escape"],
};

function mkEvt(kind: TerminalEvent["kind"], text: string, extra?: Partial<TerminalEvent>): TerminalEvent {
  return { id: Math.random().toString(36).slice(2), ts: Date.now(), kind, text, ...extra };
}

function mkFinding(f: any): TerminalEvent {
  return {
    id: Math.random().toString(36).slice(2),
    ts: Date.now(),
    kind: "finding",
    category: f.category,
    severity: f.severity,
    hitRate: f.hit_rate,
    hits: f.hits,
    total: f.total,
    owaspCategory: f.owasp_category,
    owaspName: f.owasp_name,
    adversarialPrompt: f.adversarial_prompt,
    modelResponse: f.model_response,
    remediation: f.remediation,
  };
}

export default function ScannerLayout({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [events, setEvents] = useState<TerminalEvent[]>([]);
  const probeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [multiTurnConversation, setMultiTurnConversation] = useState<any[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit: number; remaining: number; reset: number } | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [sharingReport, setSharingReport] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [categoryScores, setCategoryScores] = useState<{ injection: number; jailbreak: number; leakage: number; compliance: number } | null>(null);
  const [prevRiskScore, setPrevRiskScore] = useState<number | null>(null);
  const [currentRiskScore, setCurrentRiskScore] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstScan, setIsFirstScan] = useState(false);
  // Mobile panel switcher: "config" | "terminal" | "findings"
  const [mobilePanel, setMobilePanel] = useState<"config" | "terminal" | "findings">("config");
  const supabase = createClient();

  const [tier, setTier] = useState<string>(
    (user.user_metadata?.tier || "free").toLowerCase()
  );

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K → focus URL input
      if (meta && e.key === "k") {
        e.preventDefault();
        const el = document.getElementById("scan-url-input") as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Fetch real tier from profiles table — user_metadata is stale after billing upgrades
  useEffect(() => {
    async function fetchTier() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const resp = await fetch(`${API}/billing/subscription`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.tier) setTier(data.tier.toLowerCase());
        }
      } catch {
        // keep metadata tier as fallback
      }
    }
    fetchTier();
  }, []);

  // ── Shared: load a completed scan by ID ──────────────────────────────────
  const loadScanById = async (scanId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(`${API}/scan/${scanId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.status === "complete") {
        setCurrentScanId(scanId);
        setScanComplete(true);
        setFindings(data.findings || []);
        setCurrentRiskScore(data.risk_score ?? 0);
        setCategoryScores(data.category_scores ?? null);
        setPrevRiskScore(data.prev_risk_score ?? null);
        setEvents([
          mkEvt("init",     `LOADED_SCAN: ${scanId}`),
          mkEvt("init",     `TARGET: ${data.target_url}`),
          ...((data.findings || []) as any[]).map(mkFinding),
          mkEvt("complete", `RISK_SCORE: ${data.risk_score} · SCAN COMPLETE`),
        ]);
      }
    } catch {
      // silently fail
    }
  };

  // Onboarding: show overlay for first-time users
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("vulnra_ob_v1")) {
      setShowOnboarding(true);
    }
  }, []);

  // Load past scan from ?scan_id= query param (deep-link from history page)
  useEffect(() => {
    const scanId = searchParams.get("scan_id");
    if (!scanId) return;
    loadScanById(scanId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rate limit configuration based on tier
  const rateLimitConfig = {
    free: { limit: 1, window: 60 },
    pro: { limit: 10, window: 60 },
    enterprise: { limit: 100, window: 60 }
  };

  const currentLimit = rateLimitConfig[tier as keyof typeof rateLimitConfig] || rateLimitConfig.free;

  const handleStartScan = async (config: {
    url: string;
    tier: string;
    attackType?: string;
    probes?: string[];
    vulnerabilityTypes?: string[];
  }) => {
    setIsScanning(true);
    // Switch to terminal on mobile when scan starts
    setMobilePanel("terminal");

    // Clear any in-flight probe simulation
    if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);

    setEvents([
      mkEvt("init", `TARGET: ${config.url}`),
      mkEvt("init", `PROTOCOL: ${config.tier.toUpperCase()}`),
      mkEvt("init", "INITIALIZING_STOCHASTIC_AUDIT..."),
    ]);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setEvents(prev => [...prev, mkEvt("error", "UNAUTHORIZED_ACCESS")]);
        setIsScanning(false);
        return;
      }

      // Determine which endpoint to use based on attackType
      const endpoint = config.attackType ? "/multi-turn-scan" : "/scan";
      const basePayload = config.attackType
        ? { url: config.url, tier: config.tier, attack_type: config.attackType }
        : { url: config.url, tier: config.tier };

      // Attach custom probe selection when provided
      const payload = config.attackType ? basePayload : {
        ...basePayload,
        ...(config.probes          ? { probes: config.probes }                       : {}),
        ...(config.vulnerabilityTypes ? { vulnerability_types: config.vulnerabilityTypes } : {}),
      };

      if (config.attackType) {
        setEvents(prev => [...prev,
          mkEvt("init", `ATTACK_TYPE: ${config.attackType?.toUpperCase()}`),
          mkEvt("init", "INITIALIZING_MULTI_TURN_ATTACK..."),
        ]);
      }

      setEvents(prev => [...prev,
        mkEvt("init", "CONNECTING_TO_NODES..."),
        mkEvt("init", "DISPATCHING_PROBES..."),
      ]);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      // Handle rate limit response (429)
      if (response.status === 429) {
        const rateLimitData = await response.json().catch(() => ({}));
        const resetTime = response.headers.get("X-RateLimit-Reset");

        let msg = "RATE_LIMIT_EXCEEDED — please wait before retrying.";
        if (resetTime) {
          const wait = Math.ceil((parseInt(resetTime, 10) * 1000 - Date.now()) / 1000);
          if (wait > 0) msg = `RATE_LIMIT_EXCEEDED — retry in ${wait}s.`;
        }
        if (rateLimitData.upgrade) {
          msg += ` Upgrade for higher limits.`;
        }

        setEvents(prev => [...prev, mkEvt("error", msg)]);
        setIsScanning(false);
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.error || "SCAN_INIT_FAILED");
      }

      const result = await response.json();
      const scanId = result.scan_id;
      setEvents(prev => [...prev, mkEvt("init", `SCAN_ID: ${scanId || "PENDING"}`)]);
      setCurrentScanId(scanId || null);
      setScanComplete(false);

      if (!scanId) {
        setIsScanning(false);
        return;
      }

      // ── Probe simulation (regular scans only) ──────────────────────────────
      if (!config.attackType) {
        const probes  = PROBE_SEQS[config.tier] || PROBE_SEQS.basic;
        const probeMs = config.tier === "free" ? 8000 : config.tier === "pro" ? 18000 : 13000;
        let idx = 0;
        probeIntervalRef.current = setInterval(() => {
          if (idx < probes.length) {
            const probe: TerminalEvent = {
              id: `probe_${idx}`,
              ts: Date.now(),
              kind: "probe",
              probeName:   probes[idx],
              probeIndex:  idx + 1,
              probeTotal:  probes.length,
            };
            setEvents(prev => [...prev, probe]);
            idx++;
          } else {
            if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
          }
        }, probeMs);
      }

      // ── Polling ────────────────────────────────────────────────────────────
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/scan/${scanId}`,
            { headers: { "Authorization": `Bearer ${session.access_token}` } },
          );

          if (pollRes.status === 429) {
            console.warn("Rate limited during polling, will retry...");
            return;
          }

          if (pollRes.ok) {
            const pollData = await pollRes.json();

            if (pollData.status === "complete") {
              clearInterval(pollInterval);
              if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
              setIsScanning(false);
              setScanComplete(true);
              // Auto-switch to findings tab on mobile when scan completes
              setMobilePanel("findings");

              const findingEvts = ((pollData.findings || []) as any[]).map(mkFinding);

              if (pollData.conversation) {
                setEvents(prev => [...prev,
                  mkEvt("init", `MULTI_TURN_COMPLETE · ATTACK: ${pollData.attack_type}`),
                  ...pollData.conversation.map((turn: any) =>
                    mkEvt("init", `TURN_${turn.turn + 1}: ${(turn.user as string).substring(0, 60)}...`)
                  ),
                  ...findingEvts,
                  mkEvt("complete", `RISK_SCORE: ${pollData.risk_score} · SCAN COMPLETE`),
                ]);
                setMultiTurnConversation(pollData.conversation);
              } else {
                setEvents(prev => [...prev,
                  ...findingEvts,
                  mkEvt("complete", `RISK_SCORE: ${pollData.risk_score} · SCAN COMPLETE`),
                ]);
              }

              setFindings(pollData.findings || []);
              setCurrentRiskScore(pollData.risk_score ?? 0);
              setCategoryScores(pollData.category_scores ?? null);
              setPrevRiskScore(pollData.prev_risk_score ?? null);

            } else if (pollData.status === "failed") {
              clearInterval(pollInterval);
              if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
              setIsScanning(false);
              setEvents(prev => [...prev, mkEvt("error", "SCAN_FAILED_INTERNAL_ERROR")]);
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 3000);

    } catch (err: any) {
      if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
      setEvents(prev => [...prev, mkEvt("error", `CONNECTION_FAILED: ${err.message || err}`)]);
      setIsScanning(false);
    }
  };

  const handleDemoScan = (scanId: string) => {
    localStorage.setItem("vulnra_ob_v1", "1");
    setShowOnboarding(false);
    setIsFirstScan(true);
    loadScanById(scanId);
  };

  const handleOnboardingLaunch = (url: string, depth: string) => {
    localStorage.setItem("vulnra_ob_v1", "1");
    setShowOnboarding(false);
    setIsFirstScan(true);
    handleStartScan({ url, tier: depth });
  };

  const handleDownloadReport = async () => {
    if (!currentScanId) return;
    setDownloadingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(
        `${API}/scan/${currentScanId}/report`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!resp.ok) {
        setEvents(prev => [...prev, mkEvt("error", "REPORT_GENERATION_FAILED")]);
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vulnra-report-${currentScanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setEvents(prev => [...prev, mkEvt("error", "REPORT_DOWNLOAD_FAILED")]);
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleShare = async () => {
    if (!currentScanId) return;
    setSharingReport(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(`${API}/scan/${currentScanId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) {
        setEvents(prev => [...prev, mkEvt("error", "SHARE_LINK_FAILED")]);
        return;
      }
      const { url } = await resp.json();
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch {
      setEvents(prev => [...prev, mkEvt("error", "SHARE_LINK_FAILED")]);
    } finally {
      setSharingReport(false);
    }
  };

  return (
    <>
      {showOnboarding && (
        <OnboardingOverlay
          apiUrl={API}
          onLaunch={handleOnboardingLaunch}
          onDemoScan={handleDemoScan}
          onDismiss={() => {
            localStorage.setItem("vulnra_ob_v1", "1");
            setShowOnboarding(false);
          }}
        />
      )}
      <div className="flex flex-col h-screen bg-background overflow-hidden selection:bg-acid selection:text-black font-sans">
      {/* Top Navigation */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-3 md:px-5 z-50 shrink-0 gap-2">
        <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-none shrink min-w-0">
          <div className="shrink-0">
            <a href="/"><VulnraLogo suffix="PLATFORM" /></a>
          </div>
          <div className="hidden md:flex h-5 w-[1px] bg-v-border mx-2" />
          <div className="hidden md:flex items-center gap-2">
            <a href="/mcp-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <Server className="w-3.5 h-3.5" />AGENT_SECURITY
            </a>
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <a href="/rag-scanner" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <Database className="w-3.5 h-3.5" />RAG_SECURITY
            </a>
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <a href="/scanner/history" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <History className="w-3.5 h-3.5" />HISTORY
            </a>
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <a href="/analytics" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <TrendingUp className="w-3.5 h-3.5" />ANALYTICS
            </a>
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <a href="/settings/api-keys" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <Key className="w-3.5 h-3.5" />API_KEYS
            </a>
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <a href="/monitor" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
              <Radio className="w-3.5 h-3.5" />SENTINEL
            </a>
            {tier === "enterprise" && (
              <>
                <div className="h-5 w-[1px] bg-v-border mx-2" />
                <a href="/org" className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider hover:text-acid transition-colors whitespace-nowrap">
                  <Building2 className="w-3.5 h-3.5" />ORG
                </a>
              </>
            )}
            <div className="h-5 w-[1px] bg-v-border mx-2" />
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-v-muted2 tracking-wider whitespace-nowrap">
              SYSTEM_STATUS: <span className="text-acid animate-pulse">OPTIMAL</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tier Badge — links to billing */}
          <a
            href={tier === "free" ? "/billing" : "/billing/manage"}
            title={tier === "free" ? "Upgrade plan" : "Manage subscription"}
            className="flex items-center gap-2 text-[10px] font-mono text-v-muted bg-white/5 border border-v-border px-2.5 py-1.25 rounded-sm hover:border-white/10 transition-colors group"
          >
            <Timer className={cn(
              "w-3.5 h-3.5",
              tier === "enterprise" ? "text-[#4db8ff]" : tier === "pro" ? "text-acid" : "text-v-muted2"
            )} />
            <span className={cn(
              tier === "enterprise" ? "text-[#4db8ff]" : tier === "pro" ? "text-acid" : "text-v-muted2"
            )}>{currentLimit.limit}</span>
            <span className="text-v-muted2">/min</span>
            <div className="h-3 w-[1px] bg-v-border mx-1" />
            <span className={cn(
              "text-[8px] px-1.5 py-0.5 rounded-[2px] border leading-none font-bold tracking-wider",
              tier === "enterprise"
                ? "bg-[#4db8ff]/10 text-[#4db8ff] border-[#4db8ff]/25"
                : tier === "pro"
                ? "bg-acid/10 text-acid border-acid/25"
                : "bg-white/5 text-v-muted2 border-v-border group-hover:border-acid/20 group-hover:text-acid transition-colors"
            )}>
              {tier === "free" ? "FREE ↑" : tier.toUpperCase()}
            </span>
          </a>
          
          {/* User Info — hide email on mobile */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-v-muted bg-white/5 border border-v-border px-2.5 py-1.25 rounded-sm hover:border-white/10 transition-colors cursor-pointer group">
            <div className="w-4 h-4 rounded-full bg-acid flex items-center justify-center text-[8px] font-bold text-black group-hover:scale-110 transition-transform shrink-0">
              {user.email?.[0].toUpperCase()}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
          </div>
          <button 
            onClick={() => signOut()}
            className="w-7.5 h-7.5 rounded-sm border border-v-border2 flex items-center justify-center text-v-muted2 hover:text-v-red hover:border-v-red/30 hover:bg-v-red/5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-b border-v-border2 bg-v-bg1 shrink-0">
        {[
          { key: "config",   label: "CONFIG",   icon: Settings },
          { key: "terminal", label: "TERMINAL", icon: Activity },
          { key: "findings", label: "FINDINGS", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMobilePanel(key as typeof mobilePanel)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 font-mono text-[9px] tracking-widest border-b-2 transition-colors",
              mobilePanel === key
                ? "border-acid text-acid"
                : "border-transparent text-v-muted2 hover:text-v-muted"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <main className="flex-1 md:grid md:grid-cols-[280px_1fr_360px] overflow-hidden flex flex-col">
        {/* Left Panel: Configuration */}
        <aside className={cn(
          "bg-v-bg1 border-r border-v-border2 overflow-hidden",
          mobilePanel === "config" ? "flex flex-col" : "hidden",
          "md:flex md:flex-col"
        )}>
          <div className="p-4 py-3.5 border-b border-v-border2 flex items-center justify-between shrink-0">
            <span className="text-[8.5px] font-mono tracking-widest text-v-muted2 uppercase">Configuration</span>
            <Settings className="w-3.5 h-3.5 text-v-muted2" />
          </div>
          <ScanConfig onStart={handleStartScan} isScanning={isScanning} />
        </aside>

        {/* Center Panel: Terminal */}
        <div className={cn(
          "overflow-hidden flex-1",
          mobilePanel === "terminal" ? "flex flex-col" : "hidden",
          "md:flex md:flex-col"
        )}>
          <Terminal events={events} isScanning={isScanning} />
        </div>

        {/* Right Panel: Findings */}
        <aside className={cn(
          "bg-v-bg1 border-l border-v-border2 overflow-hidden",
          mobilePanel === "findings" ? "flex flex-col" : "hidden",
          "md:flex md:flex-col"
        )}>
          <div className="p-4 py-3.5 border-b border-v-border2 flex items-center justify-between shrink-0">
            <span className="text-[8.5px] font-mono tracking-widest text-v-muted2 uppercase">Scan Findings</span>
            <div className="flex items-center gap-2">
              {scanComplete && findings.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {/* Share link */}
                  <button
                    onClick={handleShare}
                    disabled={sharingReport}
                    title="Copy shareable link"
                    className={cn(
                      "flex items-center gap-1.5 text-[9px] font-mono tracking-wider px-2 py-1 rounded-sm border transition-all",
                      shareCopied
                        ? "border-acid/50 text-acid bg-acid/10"
                        : sharingReport
                        ? "opacity-50 cursor-not-allowed border-v-border text-v-muted2"
                        : "border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted"
                    )}
                  >
                    {sharingReport
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> SHARING...</>
                      : shareCopied
                      ? <><CheckCheck className="w-3 h-3" /> COPIED</>
                      : <><Link2 className="w-3 h-3" /> SHARE</>
                    }
                  </button>
                  {/* PDF download */}
                  <button
                    onClick={handleDownloadReport}
                    disabled={downloadingReport}
                    title="Download PDF report"
                    className={cn(
                      "flex items-center gap-1.5 text-[9px] font-mono tracking-wider px-2 py-1 rounded-sm border transition-all",
                      downloadingReport
                        ? "opacity-50 cursor-not-allowed border-v-border text-v-muted2"
                        : "border-acid/30 text-acid hover:bg-acid/10 hover:border-acid/50"
                    )}
                  >
                    {downloadingReport
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> GENERATING...</>
                      : <><FileDown className="w-3 h-3" /> PDF</>
                    }
                  </button>
                </div>
              )}
              <BarChart3 className="w-3.5 h-3.5 text-v-muted2" />
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
             {/* Multi-Turn Results */}
             {multiTurnConversation.length > 0 && (
               <MultiTurnResults
                 conversation={multiTurnConversation}
                 findings={findings.filter((f: any) => f.turn !== undefined)}
               />
             )}

             {/* First-scan celebration */}
             {isFirstScan && scanComplete && findings.length > 0 && (
               <div className="flex items-start gap-2 px-3 py-2.5 bg-acid/10 border border-acid/30 rounded-sm">
                 <span className="text-[9px] font-mono text-acid tracking-wide leading-relaxed">
                   ⚡ FIRST SCAN COMPLETE — use the buttons above to download your PDF report or share the results.
                 </span>
               </div>
             )}

             {/* Empty state */}
             {findings.length === 0 && multiTurnConversation.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                 <div className="w-12 h-12 rounded-full border border-dashed border-acid flex items-center justify-center mt-[-40px]">
                   <Activity className="w-5 h-5" />
                 </div>
                 <span className={cn(
                   "text-[9px] font-mono tracking-widest uppercase italic",
                   isScanning ? "animate-pulse text-acid" : ""
                 )}>
                   {isScanning ? "Awaiting Scan Telemetry..." : "Waiting for results..."}
                 </span>
               </div>
             ) : (
               <>
                 {scanComplete && (
                   <RiskScoreViz
                     riskScore={currentRiskScore}
                     categoryScores={categoryScores}
                     prevRiskScore={prevRiskScore}
                   />
                 )}
                 <FindingsPanel findings={findings} scanComplete={scanComplete} />
               </>
             )}
          </div>
        </aside>
      </main>
    </div>
    </>
  );
}
