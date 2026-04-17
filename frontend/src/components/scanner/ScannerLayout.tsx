"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { LogOut, BarChart3, Settings, Activity, Timer, Server, FileDown, Loader2, History, Key, Radio, Database, Building2, TrendingUp, ChevronDown, User as UserIcon, Menu, X } from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";
import { signOut } from "@/app/auth/actions";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import ScanConfig from "./ScanConfig";
import Terminal from "./Terminal";
import MultiTurnResults from "./MultiTurnResults";
import FindingsPanel from "./FindingsPanel";
import RiskScoreViz from "./RiskScoreViz";
import OnboardingOverlay from "./OnboardingOverlay";
import SocialShare from "./SocialShare";
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

const VALID_SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

// ── Multi-turn finding type → display category + severity ─────────────────────
const MULTI_TURN_TYPE_MAP: Record<string, { category: string; severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" }> = {
  jailbreak_success:   { category: "JAILBREAK",        severity: "HIGH"   },
  policy_violation:    { category: "POLICY_BYPASS",    severity: "HIGH"   },
  injection_success:   { category: "PROMPT_INJECTION", severity: "HIGH"   },
  data_leak:           { category: "DATA_EXFIL",       severity: "HIGH"   },
  role_play_success:   { category: "JAILBREAK",        severity: "MEDIUM" },
  system_override:     { category: "PROMPT_INJECTION", severity: "HIGH"   },
  encoding_bypass:     { category: "POLICY_BYPASS",    severity: "MEDIUM" },
};

/** Returns true only for findings that should appear as cards in the terminal stream. */
function isTerminalFinding(f: any): boolean {
  if (!f) return false;
  // Drop endpoint_error findings — they appear in the amber warning banner instead
  if (f.type === "endpoint_error") return false;
  if (f.category === "endpoint_error") return false;
  // Multi-turn findings: {turn, type, prompt, response} — always show (except endpoint_error above)
  if (f.turn !== undefined) return true;
  // Standard findings: must have a valid severity and a category label
  if (!VALID_SEVERITIES.has(f.severity)) return false;
  if (!f.category) return false;
  return true;
}

function mkFinding(f: any): TerminalEvent {
  // Multi-turn finding structure: { turn, type, prompt, response }
  if (f.turn !== undefined) {
    const mapped = MULTI_TURN_TYPE_MAP[f.type as string]
      ?? { category: (f.type as string)?.toUpperCase().replace(/_/g, " ") ?? "UNKNOWN", severity: "MEDIUM" };
    return {
      id:               Math.random().toString(36).slice(2),
      ts:               Date.now(),
      kind:             "finding",
      category:         mapped.category,
      severity:         mapped.severity,
      adversarialPrompt: f.prompt,
      modelResponse:    f.response,
      text:             mapped.category,
    };
  }

  // Standard finding structure: { category, severity, hit_rate, hits, total, … }
  return {
    id:               Math.random().toString(36).slice(2),
    ts:               Date.now(),
    kind:             "finding",
    category:         f.category,
    severity:         f.severity,
    hitRate:          f.hit_rate,
    hits:             f.hits,
    total:            f.total,
    owaspCategory:    f.owasp_category,
    owaspName:        f.owasp_name,
    adversarialPrompt: f.adversarial_prompt,
    modelResponse:    f.model_response,
    remediation:      f.remediation,
    text:             f.category,
  };
}

/**
 * If the backend returned all-zero category scores (common for multi-turn scans),
 * infer non-zero values from the findings array by checking type/category strings.
 */
function calculateCategoryScores(
  findings: any[],
  backendScores: Record<string, number>
): { injection: number; jailbreak: number; leakage: number; compliance: number } {
  const hasScores = Object.values(backendScores).some(v => v > 0);
  if (hasScores) return backendScores as { injection: number; jailbreak: number; leakage: number; compliance: number };

  const scores = { injection: 0, jailbreak: 0, leakage: 0, compliance: 0 };
  for (const f of findings) {
    const type = ((f.type || f.category) ?? "").toLowerCase();
    if (type.includes("injection") || type.includes("prompt") || type.includes("system_override")) {
      scores.injection = Math.max(scores.injection, 5);
    }
    if (type.includes("jailbreak") || type.includes("role")) {
      scores.jailbreak = Math.max(scores.jailbreak, 5);
    }
    if (type.includes("leak") || type.includes("exfil") || type.includes("data")) {
      scores.leakage = Math.max(scores.leakage, 5);
    }
    if (type.includes("bypass") || type.includes("encoding") || type.includes("policy")) {
      scores.compliance = Math.max(scores.compliance, 3);
    }
  }
  return scores;
}

export default function ScannerLayout({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const [isScanning, setIsScanning] = useState(false);
  const [events, setEvents] = useState<TerminalEvent[]>([]);
  const probeIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanInProgressRef   = useRef(false);   // prevents double-fire on rapid clicks
  const pollCompletedRef    = useRef(false);   // prevents duplicate RISK_SCORE from concurrent poll callbacks
  const [findings, setFindings] = useState<any[]>([]);
  const [multiTurnConversation, setMultiTurnConversation] = useState<any[]>([]);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit: number; remaining: number; reset: number } | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [sharingReport, setSharingReport] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [categoryScores, setCategoryScores] = useState<{ injection: number; jailbreak: number; leakage: number; compliance: number } | null>(null);
  const [prevRiskScore, setPrevRiskScore] = useState<number | null>(null);
  const [currentRiskScore, setCurrentRiskScore] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstScan, setIsFirstScan] = useState(false);
  const [scanWarning, setScanWarning] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Mobile panel switcher: "config" | "terminal" | "findings"
  const [mobilePanel, setMobilePanel] = useState<"config" | "terminal" | "findings">("config");
  // createClient() is NOT called at render time — it throws if NEXT_PUBLIC_SUPABASE_URL
  // is missing from the bundle (Railway build without env vars set), which would crash
  // the component during hydration. Instead each handler calls createClient() lazily,
  // wrapped in existing try-catch blocks.
  const getSupabase = () => createClient();

  const [tier, setTier] = useState<string>("free");

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

  // ── Dropdown: close on outside click or Escape ───────────────────────────
  useEffect(() => {
    if (!dropdownOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDropdownOpen(false); };
    const onOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onOutside);
    };
  }, [dropdownOpen]);

  // Fetch real tier from profiles table — user_metadata is stale after billing upgrades
  useEffect(() => {
    async function fetchTier() {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        // Direct query to profiles table for authoritative tier
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", session.user.id)
          .single();
        
        if (!error && profile?.tier) {
          setTier(profile.tier.toLowerCase());
        } else {
          // Fallback to metadata tier
          const metaTier = session.user.user_metadata?.tier;
          setTier((metaTier || "free").toLowerCase());
        }
      } catch {
        // keep default free tier as last resort
      }
    }
    fetchTier();
  }, []);

  // ── Shared: load a completed scan by ID ──────────────────────────────────
  const loadScanById = async (scanId: string) => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) return;
      const resp = await fetch(`${API}/scan/${scanId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.status === "complete") {
        const loadedFindings = (data.findings || []) as any[];
        const loadedCatScores = calculateCategoryScores(
          loadedFindings,
          data.category_scores ?? {},
        );
        setCurrentScanId(scanId);
        setScanComplete(true);
        setFindings(loadedFindings);
        setCurrentRiskScore(data.risk_score ?? 0);
        setCategoryScores(loadedCatScores);
        setPrevRiskScore(data.prev_risk_score ?? null);
        setScanWarning(data.warning ?? null);
        setEvents([
          mkEvt("init",     `LOADED_SCAN: ${scanId}`),
          mkEvt("init",     `TARGET: ${data.target_url}`),
          ...loadedFindings.filter(isTerminalFinding).map(mkFinding),
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
    // Prevent double-fire from rapid button clicks before React re-renders
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;
    pollCompletedRef.current  = false;

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
      const { data: { session } } = await getSupabase().auth.getSession();

      if (!session) {
        setEvents(prev => [...prev, mkEvt("error", "UNAUTHORIZED_ACCESS")]);
        setIsScanning(false);
        scanInProgressRef.current = false;
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
        scanInProgressRef.current = false;
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
      setScanWarning(null);

      if (!scanId) {
        setIsScanning(false);
        scanInProgressRef.current = false;
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
            logger.warn("Rate limited during polling, will retry…");
            return;
          }

          if (pollRes.ok) {
            const pollData = await pollRes.json();

            if (pollData.status === "complete") {
              // Idempotent guard — two concurrent poll requests can both see "complete"
              // before clearInterval cancels the second one.
              if (pollCompletedRef.current) return;
              pollCompletedRef.current  = true;
              scanInProgressRef.current = false;

              clearInterval(pollInterval);
              if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
              setIsScanning(false);
              setScanComplete(true);
              // Auto-switch to findings tab on mobile when scan completes
              setMobilePanel("findings");

              const findingEvts = ((pollData.findings || []) as any[])
                .filter(isTerminalFinding)
                .map(mkFinding);

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

              const polledFindings = (pollData.findings || []) as any[];
              const polledCatScores = calculateCategoryScores(
                polledFindings,
                pollData.category_scores ?? {},
              );
              setFindings(polledFindings);
              setCurrentRiskScore(pollData.risk_score ?? 0);
              setCategoryScores(polledCatScores);
              setPrevRiskScore(pollData.prev_risk_score ?? null);
              setScanWarning(pollData.warning ?? null);

            } else if (pollData.status === "failed") {
              if (pollCompletedRef.current) return;
              pollCompletedRef.current  = true;
              scanInProgressRef.current = false;
              clearInterval(pollInterval);
              if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
              setIsScanning(false);
              setEvents(prev => [...prev, mkEvt("error", "SCAN_FAILED_INTERNAL_ERROR")]);
            }
          }
        } catch (e) {
          logger.error("Polling error", e);
        }
      }, 3000);

    } catch (err: any) {
      if (probeIntervalRef.current) clearInterval(probeIntervalRef.current);
      setEvents(prev => [...prev, mkEvt("error", `CONNECTION_FAILED: ${err.message || err}`)]);
      setIsScanning(false);
      scanInProgressRef.current = false;
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
    setPdfStatus('generating');
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) { setPdfStatus('error'); setTimeout(() => setPdfStatus('idle'), 3000); return; }

      const resp = await fetch(
        `${API}/scan/${currentScanId}/report`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!resp.ok) {
        setPdfStatus('error');
        setTimeout(() => setPdfStatus('idle'), 3000);
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vulnra-report-${currentScanId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setPdfStatus('success');
      setTimeout(() => setPdfStatus('idle'), 2000);
    } catch {
      setPdfStatus('error');
      setTimeout(() => setPdfStatus('idle'), 3000);
    }
  };

  const handleShare = async () => {
    if (!currentScanId) return;
    setSharingReport(true);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
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
      setShareUrl(url);
    } catch {
      setEvents(prev => [...prev, mkEvt("error", "SHARE_LINK_FAILED")]);
    } finally {
      setSharingReport(false);
    }
  };

  const severityCounts = {
    critical: findings.filter((f: any) => f.severity === "CRITICAL").length,
    high: findings.filter((f: any) => f.severity === "HIGH").length,
    medium: findings.filter((f: any) => f.severity === "MEDIUM").length,
    low: findings.filter((f: any) => f.severity === "LOW").length,
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
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 border border-v-border hover:border-white/20"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
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
          
          {/* User avatar — click to open dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className={cn(
                "flex items-center gap-2 text-[10px] font-mono text-v-muted bg-white/5 border px-2.5 py-1.25 rounded-sm transition-colors cursor-pointer group",
                dropdownOpen ? "border-acid/30 bg-acid/5" : "border-v-border hover:border-white/10"
              )}
            >
              <div className="w-4 h-4 rounded-full bg-acid flex items-center justify-center text-[8px] font-bold text-black group-hover:scale-110 transition-transform shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
              <ChevronDown className={cn(
                "w-3 h-3 text-v-muted2 hidden sm:block transition-transform duration-150",
                dropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[220px] rounded-lg z-[100] overflow-hidden"
                style={{
                  background: "#0A0B0F",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {/* Header: name / email / tier */}
                <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-[13px] font-medium truncate" style={{ color: "#C8D0DC" }}>
                    {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0]}
                  </div>
                  <div className="text-[11px] text-v-muted2 truncate mt-0.5">{user.email}</div>
                  <div className="mt-2">
                    <span className={cn(
                      "text-[8.5px] font-mono px-1.5 py-0.5 rounded border font-bold tracking-wider",
                      tier === "enterprise" ? "bg-[#4db8ff]/10 text-[#4db8ff] border-[#4db8ff]/25"
                      : tier === "pro"        ? "bg-acid/10 text-acid border-acid/25"
                      :                         "bg-white/5 text-v-muted2 border-v-border"
                    )}>
                      ● {tier.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Nav items */}
                <div className="py-1">
                  {[
                    { icon: UserIcon,    label: "My Profile", href: "/settings/profile"   },
                    { icon: Key,         label: "API Keys",   href: "/settings/api-keys"  },
                    { icon: TrendingUp,  label: "Analytics",  href: "/analytics"           },
                    { icon: Settings,    label: "Settings",   href: "/settings/profile"   },
                  ].map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                      style={{ color: "#C8D0DC", fontSize: 13 }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <Icon className="w-3.5 h-3.5 text-v-muted2 shrink-0" />
                      {label}
                    </a>
                  ))}
                </div>

                {/* Divider + Sign out */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => { setDropdownOpen(false); signOut(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-v-red transition-colors"
                    style={{ fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 top-full w-full bg-v-bg1 border-b border-v-border2 z-50">
            <div className="p-3 space-y-1">
              <a href="/mcp-scanner" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <Server className="w-4 h-4" /> AGENT_SECURITY
              </a>
              <a href="/rag-scanner" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <Database className="w-4 h-4" /> RAG_SECURITY
              </a>
              <a href="/scanner/history" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <History className="w-4 h-4" /> HISTORY
              </a>
              <a href="/analytics" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <TrendingUp className="w-4 h-4" /> ANALYTICS
              </a>
              <a href="/monitor" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <Radio className="w-4 h-4" /> SENTINEL
              </a>
              <a href="/scanner/scheduled" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                <Timer className="w-4 h-4" /> SCHEDULED
              </a>
              {tier === "enterprise" && (
                <a href="/org" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 text-[11px] font-mono text-v-muted2 hover:text-acid hover:bg-white/5 rounded-sm">
                  <Building2 className="w-4 h-4" /> ORG
                </a>
              )}
            </div>
          </div>
        )}
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
          <ScanConfig onStart={handleStartScan} isScanning={isScanning} defaultTier={tier} />
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
              {scanComplete && (
                <div className="flex items-center gap-1.5">
                  {/* Share link */}
                  {shareUrl ? (
                    <SocialShare
                      shareUrl={shareUrl}
                      riskScore={currentRiskScore}
                      findingsCount={findings.length}
                      criticalCount={severityCounts.critical}
                      highCount={severityCounts.high}
                      mediumCount={severityCounts.medium}
                      lowCount={severityCounts.low}
                    />
                  ) : (
                    <button
                      onClick={handleShare}
                      disabled={sharingReport}
                      title="Share scan results"
                      className={cn(
                        "flex items-center gap-1.5 text-[9px] font-mono tracking-wider px-2 py-1 rounded-sm border transition-all",
                        sharingReport
                          ? "opacity-50 cursor-not-allowed border-v-border text-v-muted2"
                          : "border-v-border text-v-muted2 hover:border-white/15 hover:text-v-muted"
                      )}
                    >
                      {sharingReport
                        ? <><Loader2 className="w-3 h-3 animate-spin" />...</>
                        : <>SHARE</>
                      }
                    </button>
                  )}
                  {/* PDF download */}
                  <button
                    onClick={handleDownloadReport}
                    disabled={pdfStatus === 'generating'}
                    title="Download PDF report"
                    className={cn(
                      "flex items-center gap-1.5 text-[9px] font-mono tracking-wider px-2 py-1 rounded-sm border transition-all",
                      pdfStatus === 'generating'
                        ? "opacity-50 cursor-not-allowed border-v-border text-v-muted2"
                        : pdfStatus === 'success'
                        ? "border-green-500/50 text-green-400 bg-green-500/10"
                        : pdfStatus === 'error'
                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                        : "border-acid/30 text-acid hover:bg-acid/10 hover:border-acid/50"
                    )}
                  >
                    {pdfStatus === 'generating' && <><Loader2 className="w-3 h-3 animate-spin" /> GENERATING...</>}
                    {pdfStatus === 'success' && <><span>✓</span> DOWNLOADED</>}
                    {pdfStatus === 'error' && <><span>✗</span> FAILED</>}
                    {pdfStatus === 'idle' && <><FileDown className="w-3 h-3" /> PDF</>}
                  </button>
                </div>
              )}
              <BarChart3 className="w-3.5 h-3.5 text-v-muted2" />
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
             {/* Endpoint-error warning banner */}
             {scanWarning && scanComplete && (
               <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-sm">
                 <span className="text-amber-400 mt-0.5 shrink-0 text-[11px]">⚠</span>
                 <span className="text-[9px] font-mono text-amber-400 tracking-wide leading-relaxed">
                   Scan completed with errors — endpoint may require authentication. Results may not be accurate.
                 </span>
               </div>
             )}

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

             {/* Empty state — only while scan hasn't completed yet */}
             {!scanComplete && findings.length === 0 && multiTurnConversation.length === 0 ? (
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
             ) : scanComplete || findings.length > 0 || multiTurnConversation.length > 0 ? (
               <>
                 {scanComplete && (
                   <RiskScoreViz
                     riskScore={currentRiskScore}
                     categoryScores={categoryScores}
                     prevRiskScore={prevRiskScore}
                   />
                 )}
                 <FindingsPanel findings={findings} scanComplete={scanComplete} tier={tier} riskScore={currentRiskScore} />
               </>
             ) : null}
          </div>
        </aside>
      </main>
    </div>
    </>
  );
}
