import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Shield, TrendingUp, Globe, Zap, Building2, Target } from "lucide-react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Investors & Press — VULNRA",
  description:
    "VULNRA is building the self-serve LLM red-teaming platform for the compliance era.",
};

const COMPANY_FACTS = [
  { label: "Founded", value: "2025" },
  { label: "Headquarters", value: "India" },
  { label: "Category", value: "AI Security / SaaS" },
  { label: "Stage", value: "Pre-seed / Seed" },
  { label: "Target market", value: "Global (LLM API operators)" },
  { label: "Primary compliance", value: "EU AI Act · DPDP · NIST" },
];

const METRICS = [
  { num: "50+", label: "Probe types across 4 engines" },
  { num: "6", label: "Compliance frameworks mapped" },
  { num: "60s", label: "Time to first scan" },
  { num: "99%", label: "Cost reduction vs. manual audit" },
];

const SCAN_SURFACES = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: "LLM API Scanner",
    description:
      "Garak + DeepTeam + PyRIT 10 converters + EasyJailbreak PAIR/TAP/CIPHER recipes. Maps to OWASP LLM Top 10.",
  },
  {
    icon: <Target className="w-4 h-4" />,
    title: "Agent Security",
    description:
      "OWASP Agentic Top 10 (2025) — AG-01 through AG-10. MCP server scanning, tool call probing, memory poisoning.",
  },
  {
    icon: <Building2 className="w-4 h-4" />,
    title: "RAG Security",
    description:
      "RAG-01 corpus poisoning through RAG-05 embedding exposure. The only scanner targeting retrieval attack surfaces.",
  },
  {
    icon: <Globe className="w-4 h-4" />,
    title: "Sentinel Monitoring",
    description:
      "Continuous automated re-scanning with risk delta alerting. Enterprise: 50 watches, 1h minimum interval.",
  },
];

const DIFFERENTIATORS = [
  "Only LLM scanner mapping simultaneously to EU AI Act, India DPDP Act 2023, NIST AI RMF, ISO 42001, OWASP LLM Top 10, and OWASP Agentic Top 10",
  "RAG pipeline security — corpus poisoning, cross-tenant leakage, query injection, unauth ingestion, embedding exposure",
  "OWASP Agentic Top 10 (2025) full coverage — MCP server scanning, tool call manipulation probes",
  "Four scan engines: Garak 0.14.0, DeepTeam, PyRIT (10 encoding converters), EasyJailbreak (PAIR, TAP, CIPHER)",
  "Continuous Sentinel monitoring with risk delta alerts — automated regression detection",
  "Developer-first: REST API, GitHub Action CI/CD integration, API keys in vk_live_ format",
  "Indian-founded — only scanner with India DPDP Act 2023 compliance mapping for the domestic market",
];

export default function InvestorsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="max-w-[1100px] mx-auto px-6 md:px-12 pt-28 pb-20">
        {/* ── Header ─────────────────────────────────── */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-5">
            <span className="w-5 h-px bg-acid/35" />
            Company
            <span className="w-5 h-px bg-acid/35" />
          </div>
          <h1 className="font-mono text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Investors &amp; Press
          </h1>
          <p className="text-[16px] text-v-muted font-light leading-relaxed max-w-[700px] mb-8">
            VULNRA is building the self-serve LLM red-teaming platform for the
            compliance era. We are an Indian-founded company and the only scanner
            that maps simultaneously to EU AI Act, India DPDP, and NIST.
          </p>
          <div className="flex flex-wrap gap-3 font-mono text-[11px]">
            <a
              href="mailto:investors@vulnra.ai"
              className="text-acid hover:underline underline-offset-4 transition-all"
            >
              investors@vulnra.ai
            </a>
            <span className="text-v-border">·</span>
            <a
              href="mailto:press@vulnra.ai"
              className="text-acid hover:underline underline-offset-4 transition-all"
            >
              press@vulnra.ai
            </a>
          </div>
        </div>

        {/* ── Company Facts ──────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-v-muted2 mb-5">
            Company facts
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {COMPANY_FACTS.map(({ label, value }) => (
              <div
                key={label}
                className="bg-v-bg1 border border-v-border2 rounded-sm p-5"
              >
                <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-v-muted2 mb-2">
                  {label}
                </div>
                <div className="font-mono text-[16px] font-semibold text-foreground">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Key Metrics ────────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-v-muted2 mb-5">
            Platform metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {METRICS.map(({ num, label }) => (
              <div
                key={label}
                className="bg-v-bg1 border border-v-border2 rounded-sm p-5 text-center"
              >
                <div className="font-mono text-4xl font-bold text-acid mb-1">
                  {num}
                </div>
                <div className="font-mono text-[10px] text-v-muted2 leading-snug">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Scan Surfaces ──────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-v-muted2 mb-5">
            Product — scan surfaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCAN_SURFACES.map(({ icon, title, description }) => (
              <div
                key={title}
                className="bg-v-bg1 border border-v-border2 rounded-sm p-5"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded bg-acid/10 border border-acid/20 flex items-center justify-center text-acid">
                    {icon}
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-foreground">
                    {title}
                  </span>
                </div>
                <p className="text-[13px] text-v-muted font-light leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Differentiators ────────────────────────── */}
        <section className="mb-16">
          <h2 className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-v-muted2 mb-5">
            Key differentiators
          </h2>
          <div className="border border-v-border2 rounded-sm overflow-hidden">
            {DIFFERENTIATORS.map((d, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 px-5 py-4 ${
                  i < DIFFERENTIATORS.length - 1 ? "border-b border-v-border2" : ""
                } hover:bg-white/[0.015] transition-colors`}
              >
                <span className="font-mono text-[10px] text-acid mt-0.5 shrink-0 w-5 text-right">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[13.5px] text-v-muted font-light leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Market ─────────────────────────────────── */}
        <section className="mb-16 border border-v-border2 rounded-sm p-8 bg-v-bg1">
          <div className="flex items-center gap-2.5 mb-4">
            <TrendingUp className="w-4 h-4 text-acid" />
            <h2 className="font-mono text-[13px] font-semibold text-foreground">
              Market Opportunity
            </h2>
          </div>
          <p className="text-[14px] text-v-muted font-light leading-[1.8] mb-4">
            The EU AI Act enters full enforcement in August 2026, requiring all
            high-risk AI system operators to conduct ongoing conformity assessments.
            India DPDP Act 2023 is in force. NIST AI RMF is being adopted by US
            federal contractors.
          </p>
          <p className="text-[14px] text-v-muted font-light leading-[1.8] mb-4">
            Manual AI red-team audits cost $16,000–$80,000 per engagement with
            2–4 week turnaround. VULNRA delivers equivalent compliance-mapped
            findings in 60 seconds at $49/month — a 99% cost reduction with
            continuous coverage instead of point-in-time snapshots.
          </p>
          <p className="text-[14px] text-v-muted font-light leading-[1.8]">
            Total addressable market: ~$4.2B by 2028 (AI security testing &amp;
            compliance, Gartner 2024). VULNRA targets the 50,000+ companies
            operating production LLM APIs globally.
          </p>
        </section>

        {/* ── CTA ────────────────────────────────────── */}
        <section className="text-center py-12 border border-v-border2 rounded-sm bg-v-bg1 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(184,255,87,0.05)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-acid flex items-center justify-center">
                <Shield className="w-3 h-3 text-black" />
              </div>
              <span className="font-mono text-sm font-bold tracking-wider">VULNRA</span>
            </div>
            <h2 className="font-mono text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Ready to discuss investment?
            </h2>
            <p className="text-[14px] text-v-muted font-light mb-8">
              We&apos;d love to talk. Reach out for our deck and financial model.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <a
                href="mailto:investors@vulnra.ai"
                className="font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-6 py-3 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.28)] transition-all inline-flex items-center gap-2"
              >
                CONTACT INVESTORS <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <Link
                href="/signup"
                className="font-mono text-[11px] tracking-widest text-foreground border border-v-border px-6 py-3 rounded-sm hover:border-white/20 hover:-translate-y-0.5 transition-all"
              >
                TRY THE PRODUCT
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
