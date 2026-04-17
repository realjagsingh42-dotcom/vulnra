"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  ArrowRight,
  Database,
  Radio,
  Key,
  Check,
  ChevronRight,
  Server,
  Terminal as TerminalIcon,
} from "lucide-react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

/* ─── Data ─────────────────────────────────────────────────── */

const COMPLIANCE_BADGES = [
  "OWASP LLM Top 10",
  "OWASP Agentic Top 10",
  "MITRE ATLAS",
  "EU AI Act",
  "ISO 42001",
  "NIST AI RMF",
];

const TERMINAL_LINES: { t: string; v?: string; res?: string; sev?: string }[] = [
  { t: "dim", v: "$ vulnra scan --target https://api.example.com/v1/chat --tier pro" },
  { t: "info", v: "  TARGET: https://api.example.com/v1/chat" },
  { t: "info", v: "  PROTOCOL: PRO · ENGINES: GARAK + DEEPTEAM + PYRIT" },
  { t: "info", v: "  INITIALIZING_STOCHASTIC_AUDIT..." },
  { t: "blank" },
  { t: "probe", v: "[01/16] Prompt Injection", res: "HIT 4/10", sev: "HIGH" },
  { t: "probe", v: "[02/16] Jailbreak Attack", res: "HIT 7/10", sev: "CRITICAL" },
  { t: "probe", v: "[03/16] Data Leakage", res: "CLEAN", sev: "" },
  { t: "probe", v: "[04/16] Policy Bypass", res: "HIT 2/10", sev: "MED" },
  { t: "probe", v: "[05/16] PyRIT:Base64", res: "HIT 3/10", sev: "HIGH" },
  { t: "probe", v: "[06/16] PyRIT:ROT13", res: "HIT 5/10", sev: "HIGH" },
  { t: "probe", v: "[07/16] PyRIT:Unicode", res: "HIT 1/10", sev: "LOW" },
  { t: "probe", v: "[08/16] PAIR Refinement", res: "HIT 6/10", sev: "CRITICAL" },
  { t: "blank" },
  { t: "result", v: "RISK_SCORE: 7.4 / 10 · HIGH" },
  { t: "result", v: "14 FINDINGS · 2 CRITICAL · 7 HIGH" },
];

const AGENT_FINDINGS = [
  { id: "AG-01", name: "Prompt Injection (Planner)", sev: "CRITICAL", cvss: "9.1", owasp: "LLM01" },
  { id: "AG-02", name: "Tool Call Manipulation", sev: "HIGH", cvss: "8.3", owasp: "LLM07" },
  { id: "AG-03", name: "Memory Poisoning", sev: "HIGH", cvss: "7.8", owasp: "LLM02" },
  { id: "AG-04", name: "Resource Over-Consumption", sev: "MEDIUM", cvss: "5.9", owasp: "LLM10" },
  { id: "AG-05", name: "Agentic Escape", sev: "CRITICAL", cvss: "9.4", owasp: "LLM01" },
  { id: "AG-06", name: "Orchestration Hijack", sev: "HIGH", cvss: "8.1", owasp: "LLM07" },
];

const RAG_RESULTS = [
  { id: "RAG-01", name: "Corpus Poisoning", status: "VULNERABLE", rate: "3/5 poisoned" },
  { id: "RAG-02", name: "Cross-Tenant Leakage", status: "FAILED", rate: "Canary leaked" },
  { id: "RAG-03", name: "Query Injection", status: "VULNERABLE", rate: "2/5 injected" },
  { id: "RAG-04", name: "Unauth Ingestion", status: "CLEAN", rate: "Auth enforced" },
  { id: "RAG-05", name: "Embedding Leakage", status: "VULNERABLE", rate: "Vectors exposed" },
];

const TIERS_PREVIEW = [
  {
    name: "FREE",
    price: "$0",
    features: ["1 scan / day", "Garak engine", "Risk score (0-10)", "3 API keys"],
    cta: "/signup",
    ctaLabel: "Get started free",
    highlight: false,
  },
  {
    name: "PRO",
    price: "$49/mo",
    features: [
      "Unlimited scans",
      "All 4 scan engines",
      "PyRIT + EasyJailbreak",
      "RAG Security (RAG-01-05)",
      "5 Sentinel watches",
      "PDF compliance export",
      "20 API keys",
    ],
    cta: "/signup",
    ctaLabel: "Start Pro trial",
    highlight: true,
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    features: [
      "Everything in Pro",
      "50 Sentinel watches (1h)",
      "Org management",
      "Audit logs",
      "SSO + SCIM",
      "On-premise deploy",
      "Custom SLA",
    ],
    cta: "mailto:sales@vulnra.ai",
    ctaLabel: "Contact sales",
    highlight: false,
  },
];

/* ─── Main Component ───────────────────────────────────────── */

export default function LandingPage() {
  const router = useRouter();
  const [shownLines, setShownLines] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const animatedRef = useRef(false);
  const [scanUrl, setScanUrl] = useState("");
  const [scanUrlError, setScanUrlError] = useState(false);

  function handleFreeScan(e: FormEvent) {
    e.preventDefault();
    const trimmed = scanUrl.trim();
    if (!trimmed) { setScanUrlError(true); return; }
    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) { setScanUrlError(true); return; }
    } catch { setScanUrlError(true); return; }
    setScanUrlError(false);
    router.push(`/quick-scan?url=${encodeURIComponent(trimmed)}`);
  }

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          let i = 0;
          const tick = () => {
            setShownLines(n => n + 1);
            i++;
            if (i < TERMINAL_LINES.length) setTimeout(tick, 90);
          };
          setTimeout(tick, 300);
        }
      },
      { threshold: 0 }
    );
    obs.observe(el);

    return () => {
      obs.disconnect();
      animatedRef.current = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-acid selection:text-black">
      <PublicNav />

      {/* ══════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14 overflow-hidden">
        {/* Dashboard-style status bar */}
        <div className="absolute top-14 left-0 right-0 z-20 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-sm">
          <div className="max-w-[1200px] mx-auto px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-6 font-mono text-[9px] tracking-widest">
              <span className="text-white">VULNRA<span className="text-acid">PLATFORM</span></span>
              <span className="text-[#333]">|</span>
              <span className="flex items-center gap-2">
                <span className="text-white">SYSTEM_STATUS:</span>
                <span className="text-acid animate-pulse">OPTIMAL</span>
              </span>
              <span className="text-[#333]">|</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4db8ff]"></span>
                <span className="text-[#4db8ff]">ENTERPRISE</span>
              </span>
              <span className="text-[#333]">|</span>
              <span className="text-white">100<span className="text-[#666]">/min</span></span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-[880px] mx-auto text-center mt-12">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.32em] uppercase text-acid mb-7 opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.1s]">
            <span className="w-6 h-px bg-acid/40" />
            LLM · AGENT · RAG · SENTINEL
            <span className="w-6 h-px bg-acid/40" />
          </div>

          {/* Headline */}
          <h1 className="font-mono text-5xl md:text-6xl lg:text-[70px] font-bold tracking-tight leading-[1.06] mb-6 opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.2s]">
            Security for AI that
            <br />
            <span className="text-acid">thinks, acts,</span>
            <br />
            and retrieves.
          </h1>

          {/* Subtitle */}
          <p className="text-[16px] md:text-[17px] text-white font-light leading-relaxed max-w-[560px] mx-auto mb-10 opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.3s]">
            Red-team your LLM APIs, AI agents, and RAG pipelines in 60 seconds.
            Every vulnerability mapped to OWASP, MITRE ATLAS, and EU AI Act.
          </p>

          {/* ── Free scan widget ────────────────────────── */}
          <form
            onSubmit={handleFreeScan}
            className="opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.38s] w-full max-w-[600px] mx-auto"
          >
            <div
              className={`flex items-center gap-0 rounded-sm overflow-hidden border transition-colors ${
                scanUrlError
                  ? "border-v-red/70"
                  : "border-acid/50 shadow-[0_0_18px_rgba(184,255,87,0.12)] focus-within:border-acid focus-within:shadow-[0_0_22px_rgba(184,255,87,0.22)]"
              }`}
              style={{ background: "#0a0a0a" }}
            >
              <span className="font-mono text-[10px] text-acid/60 pl-4 pr-2 shrink-0 hidden sm:block">$</span>
              <input
                type="text"
                value={scanUrl}
                onChange={(e) => { setScanUrl(e.target.value); setScanUrlError(false); }}
                placeholder="https://your-llm-api.example.com/v1/chat/completions"
                className="flex-1 bg-transparent font-mono text-[11px] text-white placeholder:text-[#666666] py-3.5 px-3 sm:px-0 outline-none min-w-0"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="submit"
                className="shrink-0 font-mono text-[10px] font-bold tracking-widest bg-acid text-black px-5 py-3.5 hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                SCAN FREE →
              </button>
            </div>
            {scanUrlError && (
              <p className="font-mono text-[9.5px] text-v-red mt-1.5 text-left pl-1">
                Enter a valid HTTPS URL to your LLM API endpoint
              </p>
            )}
            <div className="flex items-center justify-center gap-6 mt-3">
              {["No account required", "Results in ~60 seconds", "Free forever"].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-mono text-[9.5px] text-[#888]">
                  <span className="text-acid text-[10px]">✓</span>{t}
                </span>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[#888] mt-2 text-center leading-relaxed">
              Free scan shows risk score + 1 finding preview.{" "}
              <Link href="/signup" className="text-acid underline underline-offset-4">Sign up free</Link>{" "}
              to unlock all findings.
            </p>
          </form>

          {/* Secondary CTA */}
          <div className="mt-4 opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.44s] flex items-center justify-center gap-5">
            <a
              href="#features"
              className="font-mono text-[10.5px] tracking-widest text-[#888] hover:text-acid transition-colors flex items-center gap-1.5"
            >
              SEE HOW IT WORKS ↓
            </a>
            <span className="w-px h-3 bg-[#222]" />
            <Link href="/pricing" className="font-mono text-[10.5px] tracking-widest text-[#888] hover:text-acid transition-colors">
              VIEW PLANS
            </Link>
          </div>

          {/* Compliance badge strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2 opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.58s]">
            {COMPLIANCE_BADGES.map((b) => (
              <span
                key={b}
                className="font-mono text-[9px] tracking-[0.15em] uppercase text-[#888] border border-[#1a1a1a] px-3 py-1.5 rounded-sm"
              >
                {b}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-8 max-w-[480px] mx-auto opacity-0 animate-[fadeUp_0.5s_ease_forwards_0.66s]">
            {[
              { num: "50+", label: "Probe types" },
              { num: "60s", label: "First scan" },
              { num: "99%", label: "vs. manual audit" },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <div className="font-mono text-3xl font-bold text-acid">{num}</div>
                <div className="font-mono text-[9px] tracking-widest text-[#888] mt-1 uppercase">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          01 — LLM_API_SCANNER
      ══════════════════════════════════════════════════ */}
      <section
        id="features"
        className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] relative overflow-hidden bg-black"
      >
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.26em] uppercase mb-5">
              <span className="text-acid">&gt;</span>
              <span className="text-acid">01</span>
              <span className="text-[#666]">/</span>
              <span className="text-white tracking-wider">LLM_API_SCANNER</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Red-team your
              <br />
              <span className="text-acid">LLM endpoints</span>
              <br />
              automatically.
            </h2>
            <p className="text-[14.5px] text-white font-light leading-relaxed mb-8 max-w-[460px]">
              Four scan engines — Garak, DeepTeam, PyRIT converters, and
              EasyJailbreak recipes — attack your model in parallel. Every
              probe maps to a specific OWASP LLM vulnerability.
            </p>

            {/* Engine tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "Garak 0.14.0",
                "DeepTeam",
                "PyRIT: 10 converters",
                "PAIR",
                "TAP",
                "CIPHER",
                "AdvBench seeds",
                "GPTFuzzer templates",
                "JailbreakBench",
              ].map((p) => (
                <span
                  key={p}
                  className="font-mono text-[9.5px] tracking-wider text-[#888] bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 rounded-sm"
                >
                  {p}
                </span>
              ))}
            </div>

            {/* Compliance */}
            <div className="border border-[#1a1a1a] rounded-sm p-4 bg-[#0a0a0a]">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-[#666] mb-3">
                Compliance coverage
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ["OWASP LLM01-LLM10", "Full Top 10"],
                  ["MITRE ATLAS", "T0001-T0054"],
                  ["EU AI Act", "Art. 9, 15, 72"],
                  ["ISO 42001", "Clause 6.1.2"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-white">{k}</span>
                    <span className="font-mono text-[9px] text-acid">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mock Terminal - Dashboard Style */}
          <div
            ref={terminalRef}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-acid" />
                </div>
                <span className="font-mono text-[9.5px] text-[#666] tracking-wider">
                  vulnra — scan
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
                <span className="font-mono text-[9px] text-acid tracking-wider">SCANNING</span>
              </div>
            </div>
            <div className="p-4 font-mono text-[11px] space-y-0.5 min-h-[380px] overflow-hidden">
              {TERMINAL_LINES.slice(0, shownLines).map((line, i) => {
                if (line.t === "blank") return <div key={i} className="h-2" />;
                if (line.t === "dim")
                  return <div key={i} className="text-[#666]">{line.v}</div>;
                if (line.t === "info")
                  return <div key={i} className="text-[#888]">{line.v}</div>;
                if (line.t === "probe") {
                  const sevColor =
                    line.sev === "CRITICAL"
                      ? "text-[#ff4444]"
                      : line.sev === "HIGH"
                      ? "text-[#ffb340]"
                      : line.sev === "MED"
                      ? "text-[#ffb340]"
                      : "text-[#888]";
                  const resColor =
                    line.res === "CLEAN" ? "text-acid" : "text-[#ffb340]";
                  return (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <span className="text-[#888]">{line.v}</span>
                      <span className={`${resColor} shrink-0`}>
                        {line.res}
                        {line.sev && (
                          <span className={`${sevColor} ml-2`}>[{line.sev}]</span>
                        )}
                      </span>
                    </div>
                  );
                }
                if (line.t === "result")
                  return (
                    <div key={i} className="text-acid font-bold">
                      {line.v}
                    </div>
                  );
                return null;
              })}
              {shownLines < TERMINAL_LINES.length && (
                <span className="text-acid animate-[blink_1s_ease_infinite]">█</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          02 — AGENT_SECURITY
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-[#0a0a0a] relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Mock Findings Panel */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md overflow-hidden order-2 lg:order-1">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
              <span className="font-mono text-[9.5px] text-[#666] tracking-wider">
                AGENT_SECURITY — Findings
              </span>
              <span className="font-mono text-[8.5px] bg-[#dc2626]/15 text-[#dc2626] border border-[#dc2626]/20 px-2 py-0.5 rounded-sm">
                2 CRITICAL
              </span>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {AGENT_FINDINGS.map((f) => {
                const sevStyle =
                  f.sev === "CRITICAL"
                    ? "text-[#dc2626] bg-[#dc2626]/10 border-[#dc2626]/20"
                    : f.sev === "HIGH"
                    ? "text-[#d97706] bg-[#d97706]/10 border-[#d97706]/20"
                    : "text-[#4db8ff] bg-[#4db8ff]/10 border-[#4db8ff]/20";
                return (
                  <div
                    key={f.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-acid w-12 shrink-0">
                        {f.id}
                      </span>
                      <div>
                        <div className="font-mono text-[11.5px] text-white">
                          {f.name}
                        </div>
                        <div className="font-mono text-[9px] text-[#666] mt-0.5">
                          OWASP {f.owasp}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[9px] text-[#666]">
                        CVSS {f.cvss}
                      </span>
                      <span
                        className={`font-mono text-[8px] border px-1.5 py-0.5 rounded-sm ${sevStyle}`}
                      >
                        {f.sev}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
              <span className="font-mono text-[9px] text-[#666]">
                OWASP Agentic Top 10 (2025)
              </span>
              <Link href="/signup" className="font-mono text-[9px] text-acid hover:underline">
                Start scanning →
              </Link>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.26em] uppercase mb-5">
              <span className="text-acid">&gt;</span>
              <span className="text-acid">02</span>
              <span className="text-[#666]">/</span>
              <span className="text-white tracking-wider">AGENT_SECURITY</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              The full
              <br />
              <span className="text-acid">OWASP Agentic</span>
              <br />
              Top 10. Probed.
            </h2>
            <p className="text-[14.5px] text-white font-light leading-relaxed mb-8 max-w-[460px]">
              MCP servers, tool-calling pipelines, and multi-agent
              orchestration expose attack surfaces LLM scanners miss. VULNRA
              covers the full 2025 Agentic Top 10.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {[
                "AG-01: Prompt Injection",
                "AG-02: Tool Manipulation",
                "AG-03: Memory Poisoning",
                "AG-04: Resource Exhaustion",
                "AG-05: Agentic Escape",
                "AG-06: Orchestration Hijack",
                "AG-07: Credential Theft",
                "AG-08: Data Exfiltration",
                "AG-09: Supply Chain",
                "AG-10: Model Bypass",
              ].map((p) => (
                <div key={p} className="flex items-center gap-2 font-mono text-[10.5px] text-[#888]">
                  <ChevronRight className="w-3 h-3 text-acid shrink-0" />
                  {p}
                </div>
              ))}
            </div>

            <div className="border border-[#1a1a1a] rounded-sm p-4 bg-[#0a0a0a]">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-[#666] mb-3">
                Compliance coverage
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ["OWASP Agentic Top 10", "2025 edition"],
                  ["MITRE ATLAS", "Agent attacks"],
                  ["EU AI Act", "Art. 9"],
                  ["MCP Security", "Tool call review"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-white">{k}</span>
                    <span className="font-mono text-[9px] text-acid">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          03 — RAG_SECURITY
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-black relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.26em] uppercase mb-5">
              <span className="text-acid">&gt;</span>
              <span className="text-acid">03</span>
              <span className="text-[#666]">/</span>
              <span className="text-white tracking-wider">RAG_SECURITY</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Your vector store
              <br />
              is an
              <br />
              <span className="text-acid">attack surface.</span>
            </h2>
            <p className="text-[14.5px] text-white font-light leading-relaxed mb-8 max-w-[460px]">
              RAG pipelines introduce five critical vulnerabilities that
              standard LLM scanners can't see — corpus poisoning,
              cross-tenant leakage, query injection, unauthorized ingestion,
              and embedding exposure.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {[
                "RAG-01: Corpus Poisoning",
                "RAG-02: Cross-Tenant Leakage",
                "RAG-03: Query Injection",
                "RAG-04: Unauth Ingestion",
                "RAG-05: Embedding Exposure",
              ].map((p) => (
                <span
                  key={p}
                  className="font-mono text-[9.5px] tracking-wider text-[#888] bg-[#0a0a0a] border border-[#1a1a1a] px-2.5 py-1 rounded-sm"
                >
                  {p}
                </span>
              ))}
            </div>

            <div className="border border-[#1a1a1a] rounded-sm p-4 bg-[#0a0a0a]">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-[#666] mb-3">
                Compliance coverage
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ["OWASP LLM02", "Insecure output"],
                  ["OWASP LLM06", "Sensitive disclosure"],
                  ["MITRE", "T0001.003"],
                  ["EU AI Act", "Art. 10, 13"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-white">{k}</span>
                    <span className="font-mono text-[9px] text-acid">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RAG probe results */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
              <span className="font-mono text-[9.5px] text-[#666] tracking-wider">
                RAG_SECURITY — Results
              </span>
              <span className="font-mono text-[8.5px] bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/20 px-2 py-0.5 rounded-sm">
                RISK: 8.1/10
              </span>
            </div>

            {/* Corpus Poisoning rate */}
            <div className="px-4 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-white">
                  Corpus Poisoning Rate
                </span>
                <span className="font-mono text-[12px] font-bold text-[#dc2626]">60%</span>
              </div>
              <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div className="h-full w-[60%] bg-[#dc2626] rounded-full" />
              </div>
            </div>

            <div className="divide-y divide-[#1a1a1a]">
              {RAG_RESULTS.map((r) => {
                const statusStyle =
                  r.status === "CLEAN"
                    ? "text-acid bg-acid/10 border-acid/20"
                    : r.status === "FAILED"
                    ? "text-[#dc2626] bg-[#dc2626]/10 border-[#dc2626]/20"
                    : "text-[#ffb340] bg-[#ffb340]/10 border-[#ffb340]/20";
                return (
                  <div
                    key={r.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[9px] text-acid w-14 shrink-0">
                        {r.id}
                      </span>
                      <span className="font-mono text-[11.5px] text-white">
                        {r.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[9px] text-[#666]">{r.rate}</span>
                      <span
                        className={`font-mono text-[8px] border px-1.5 py-0.5 rounded-sm ${statusStyle}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          04 — SENTINEL_MONITORING
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-[#0a0a0a] relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.26em] uppercase mb-5">
              <span className="text-acid">&gt;</span>
              <span className="text-acid">04</span>
              <span className="text-[#666]">/</span>
              <span className="text-white tracking-wider">SENTINEL_MONITORING</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Know when your model
              <br />
              <span className="text-acid">regresses overnight.</span>
            </h2>
            <p className="text-[14.5px] text-white font-light leading-relaxed max-w-[540px] mx-auto">
              Sentinel watches your LLM endpoints on a schedule. Alerts fire
              the moment your risk score spikes or a new HIGH vulnerability
              appears.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Watch config */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-5">
              <div className="font-mono text-[9.5px] tracking-widest text-[#666] mb-4">
                WATCH_CONFIG
              </div>
              <div className="space-y-3">
                {[
                  { k: "TARGET", v: "https://api.prod.ai/v1/chat" },
                  { k: "INTERVAL", v: "Every 1 hour" },
                  { k: "THRESHOLD", v: "Risk delta > 20pp" },
                  { k: "ALERT", v: "ops@company.ai" },
                  { k: "STATUS", v: "ACTIVE" },
                ].map(({ k, v }) => (
                  <div key={k} className="flex items-start justify-between gap-3">
                    <span className="font-mono text-[9px] text-[#666] shrink-0">{k}</span>
                    <span
                      className={`font-mono text-[10px] text-right ${
                        k === "STATUS" ? "text-acid" : "text-white"
                      }`}
                    >
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk history chart */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-5">
              <div className="font-mono text-[9.5px] tracking-widest text-[#666] mb-4">
                RISK_HISTORY — 7_DAYS
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {[3.2, 3.1, 3.4, 3.8, 4.1, 6.9, 7.4].map((v, i) => {
                  const h = Math.round((v / 10) * 100);
                  const color =
                    v >= 7
                      ? "bg-[#dc2626]"
                      : v >= 5
                      ? "bg-[#d97706]"
                      : "bg-acid/60";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
                      <div
                        className={`w-full ${color} rounded-t-sm transition-all`}
                        style={{ height: `${h}%` }}
                      />
                      <span className="font-mono text-[7px] text-[#666]">
                        {["M", "T", "W", "T", "F", "S", "S"][i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 font-mono text-[9px] text-[#dc2626]">
                ⚠ Risk spike: +3.3pp Sat → alert sent
              </div>
            </div>

            {/* Tier limits */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-5">
              <div className="font-mono text-[9.5px] tracking-widest text-[#666] mb-4">
                TIER_LIMITS
              </div>
              <div className="space-y-3">
                {[
                  { tier: "FREE", watches: "0 watches", interval: "—", color: "text-[#666]" },
                  { tier: "PRO", watches: "5 watches", interval: "min 24h", color: "text-acid" },
                  { tier: "ENT", watches: "50 watches", interval: "min 1h", color: "text-[#4db8ff]" },
                ].map(({ tier, watches, interval, color }) => (
                  <div key={tier} className="flex items-center justify-between">
                    <span className={`font-mono text-[9.5px] ${color}`}>{tier}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-[#888]">{watches}</span>
                      <span className="font-mono text-[9px] text-[#666]">{interval}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-[#666] mb-2">
                  Compliance
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["NIST AI RMF", "ISO 42001"].map((b) => (
                    <span
                      key={b}
                      className="font-mono text-[8px] text-[#888] border border-[#1a1a1a] px-2 py-0.5 rounded-sm"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          DEVELOPER_API
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-black relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text */}
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.26em] uppercase mb-5">
              <span className="text-acid">&gt;</span>
              <span className="text-acid">05</span>
              <span className="text-[#666]">/</span>
              <span className="text-white tracking-wider">DEVELOPER_API</span>
            </div>
            <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
              Shift-left security
              <br />
              into your
              <br />
              <span className="text-acid">CI/CD pipeline.</span>
            </h2>
            <p className="text-[14.5px] text-white font-light leading-relaxed mb-8 max-w-[460px]">
              API keys in{" "}
              <code className="font-mono text-acid text-[13px]">vk_live_</code>{" "}
              format, SHA-256 hashed. Integrate into GitHub Actions, Jenkins,
              or any CI tool. Fail builds when risk score crosses threshold.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { tier: "FREE", count: "3 keys", color: "text-[#666]" },
                { tier: "PRO", count: "20 keys", color: "text-acid" },
                { tier: "ENT", count: "Unlimited", color: "text-[#4db8ff]" },
              ].map(({ tier, count, color }) => (
                <div
                  key={tier}
                  className="text-center border border-[#1a1a1a] rounded-sm py-3 bg-[#0a0a0a]"
                >
                  <div className={`font-mono text-[9px] ${color} mb-1`}>{tier}</div>
                  <div className="font-mono text-[13px] font-semibold text-white">
                    {count}
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-widest bg-acid text-black px-6 py-3 rounded-sm hover:-translate-y-0.5 transition-all"
            >
              GET API KEY <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Code block - Terminal Style */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1a1a1a]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                <div className="w-2.5 h-2.5 rounded-full bg-acid" />
              </div>
              <span className="font-mono text-[9.5px] text-[#666] ml-1">curl</span>
            </div>
            <pre className="p-5 font-mono text-[11px] leading-[1.7] overflow-x-auto">
              <code>
                <span className="text-[#666]">{"# Start a scan\n"}</span>
                <span className="text-white">curl -X POST https://api.vulnra.ai/scan \\\n</span>
                <span className="text-white">  -H </span>
                <span className="text-acid">"Authorization: Bearer vk_live_••••••••"</span>
                <span className="text-white"> \\\n</span>
                <span className="text-white">  -H </span>
                <span className="text-acid">"Content-Type: application/json"</span>
                <span className="text-white"> \\\n</span>
                <span className="text-white">  -d </span>
                <span className="text-acid">'{"{"}\n</span>
                <span className="text-white">    </span>
                <span className="text-[#888]">"url"</span>
                <span className="text-white">: </span>
                <span className="text-acid">"https://your-llm-api/chat"</span>
                <span className="text-white">,</span>
                <span className="text-white">\n    </span>
                <span className="text-[#888]">"tier"</span>
                <span className="text-white">: </span>
                <span className="text-acid">"pro"</span>
                <span className="text-white">\n  </span>
                <span className="text-acid">{"}"}</span>
                <span className="text-white">{"'\n\n"}</span>
                <span className="text-[#666]">{"# Response\n"}</span>
                <span className="text-white">{"{\n"}</span>
                <span className="text-white">  </span>
                <span className="text-[#888]">"scan_id"</span>
                <span className="text-white">: </span>
                <span className="text-acid">"sc_a3f8b2e1"</span>
                <span className="text-white">,</span>
                <span className="text-white">\n  </span>
                <span className="text-[#888]">"status"</span>
                <span className="text-white">: </span>
                <span className="text-acid">"running"</span>
                <span className="text-white">{"\n}\n\n"}</span>
                <span className="text-[#666]">{"# Poll for results\n"}</span>
                <span className="text-white">{"curl https://api.vulnra.ai/scan/sc_a3f8b2e1\n"}</span>
                <span className="text-[#666]">{"# When complete:\n"}</span>
                <span className="text-white">{"{\n"}</span>
                <span className="text-white">  </span>
                <span className="text-[#888]">"status"</span>
                <span className="text-white">: </span>
                <span className="text-acid">"complete"</span>
                <span className="text-white">,</span>
                <span className="text-white">\n  </span>
                <span className="text-[#888]">"risk_score"</span>
                <span className="text-white">: 7.4,</span>
                <span className="text-white">\n  </span>
                <span className="text-[#888]">"findings"</span>
                <span className="text-white">: </span><span className="text-white">{"[...]"}{"},\n"}</span>
                <span className="text-[#888]">  </span>
                <span className="text-[#888]">"owasp"</span>
                <span className="text-white">: [</span>
                <span className="text-acid">"LLM01"</span>
                <span className="text-white">, </span>
                <span className="text-acid">"LLM02"</span>
                <span className="text-white">]</span>
                <span className="text-white">{"\n}"}</span>
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          PRICING
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-[#0a0a0a] relative overflow-hidden">
        <div className="max-w-[1100px] mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="font-mono text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Replace a $16,000 audit
              <br />
              for <span className="text-acid">$49 a month.</span>
            </h2>
            <p className="text-[14px] text-white font-light">
              No credit card for free tier. Cancel Pro anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1a1a1a] border border-[#1a1a1a] rounded-md overflow-hidden">
            {TIERS_PREVIEW.map((t) => (
              <div
                key={t.name}
                className={`p-8 relative ${
                  t.highlight ? "bg-[#0a0a0a] border border-acid/18" : "bg-[#050505]"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 font-mono text-[8.5px] tracking-[0.2em] bg-acid text-black px-3 py-1 font-bold rounded-b-sm">
                    MOST_POPULAR
                  </div>
                )}
                <div className="font-mono text-[9.5px] tracking-[0.22em] text-[#888] mb-2">
                  {t.name}
                </div>
                <div className="font-mono text-4xl font-bold text-white mb-6">{t.price}</div>
                <ul className="space-y-2 mb-8">
                  {t.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 font-mono text-[12px] text-[#888]"
                    >
                      <Check className="w-3 h-3 text-acid shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta}
                  className={`w-full py-2.5 rounded-sm font-mono text-[10.5px] font-semibold tracking-widest text-center block transition-all hover:-translate-y-0.5 ${
                    t.highlight
                      ? "bg-acid text-black hover:shadow-[0_8px_20px_rgba(184,255,87,0.28)]"
                      : "border border-[#1a1a1a] text-white hover:border-white/20"
                  }`}
                >
                  {t.ctaLabel}
                </Link>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/pricing"
              className="font-mono text-[10.5px] tracking-widest text-acid hover:underline underline-offset-4 transition-all"
            >
              See full feature comparison →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════════════ */}
      <section className="py-28 px-6 md:px-12 border-t border-[#1a1a1a] bg-black text-center relative overflow-hidden">
        <div className="relative z-10 max-w-[640px] mx-auto">
          <div className="font-mono text-[9px] tracking-[0.3em] uppercase text-acid mb-5">
            Start scanning today
          </div>
          <h2 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-5">
            Your AI model has
            <br />
            <span className="text-acid">vulnerabilities right now.</span>
          </h2>
          <p className="text-[15px] text-white font-light leading-relaxed mb-10">
            Free scan. No credit card required. First results in 60 seconds.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-8 py-3.5 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(184,255,87,0.35)] transition-all inline-flex items-center gap-2"
            >
              START FOR FREE <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <a
              href="mailto:sales@vulnra.ai"
              className="font-mono text-[11px] tracking-widest text-white border border-[#1a1a1a] px-8 py-3.5 rounded-sm hover:border-white/20 hover:-translate-y-0.5 transition-all"
            >
              TALK TO SALES
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
