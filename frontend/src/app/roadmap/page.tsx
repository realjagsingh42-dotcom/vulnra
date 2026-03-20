import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Product Roadmap — VULNRA",
  description:
    "See what's live, what's being built, and what's coming next for VULNRA's AI vulnerability scanning platform. Updated monthly.",
  alternates: { canonical: "https://vulnra.ai/roadmap" },
  openGraph: {
    title: "VULNRA Product Roadmap",
    description: "What's shipped, in progress, and planned for the leading LLM security platform.",
    url: "https://vulnra.ai/roadmap",
    siteName: "VULNRA",
    type: "website",
  },
};

type Status = "shipped" | "in-progress" | "planned" | "research";

interface RoadmapItem {
  title: string;
  description: string;
  status: Status;
  tags: string[];
  version?: string;
  date?: string;
}

const STATUS_META: Record<Status, { label: string; cls: string; dot: string }> = {
  "shipped":     { label: "SHIPPED",     cls: "text-acid border-acid/40 bg-acid/8",           dot: "bg-acid" },
  "in-progress": { label: "IN PROGRESS", cls: "text-v-amber border-v-amber/40 bg-v-amber/8",  dot: "bg-v-amber" },
  "planned":     { label: "PLANNED",     cls: "text-[#4db8ff] border-[#4db8ff]/40 bg-[#4db8ff]/8", dot: "bg-[#4db8ff]" },
  "research":    { label: "RESEARCH",    cls: "text-v-muted2 border-v-border bg-white/5",     dot: "bg-v-muted2" },
};

const PHASES: { phase: string; version: string; quarter: string; items: RoadmapItem[] }[] = [
  {
    phase: "Foundation",
    version: "v0.1 – v0.2",
    quarter: "Feb 2026",
    items: [
      { title: "Multi-engine scan (Garak + DeepTeam)", description: "First production scan combining two open-source LLM security engines with unified risk scoring.", status: "shipped", tags: ["Core"], version: "v0.1.0", date: "Feb 2026" },
      { title: "Claude AI Judge", description: "Per-finding AI classification using Claude 3 Haiku — is_vulnerable, confidence score, reasoning.", status: "shipped", tags: ["Core", "AI Judge"], version: "v0.1.0", date: "Feb 2026" },
      { title: "Multi-turn attacks (Crescendo, GOAT)", description: "Iterative attack chains that escalate over multiple conversation turns to bypass model guardrails.", status: "shipped", tags: ["Attacks"], version: "v0.2.0", date: "Feb 2026" },
      { title: "MCP Server Scanner", description: "Security scanning for Model Context Protocol servers — tool poisoning, prompt injection via tool responses.", status: "shipped", tags: ["Agentic AI"], version: "v0.2.0", date: "Feb 2026" },
    ],
  },
  {
    phase: "Platform",
    version: "v0.3 – v0.4",
    quarter: "Mar 2026",
    items: [
      { title: "Billing & subscription tiers", description: "Free, Pro ($49/mo), Enterprise tiers via Lemon Squeezy. Tier-gated feature access and scan quotas.", status: "shipped", tags: ["Platform"], version: "v0.3.0", date: "Mar 2026" },
      { title: "PDF compliance audit reports", description: "Downloadable PDF evidence reports with full probe methodology, findings, and compliance framework mapping.", status: "shipped", tags: ["Compliance"], version: "v0.3.0", date: "Mar 2026" },
      { title: "Scan history, sharing & deep-links", description: "Paginated scan history, public share tokens with expiry, and deep-link URL support.", status: "shipped", tags: ["Platform"], version: "v0.3.0", date: "Mar 2026" },
      { title: "API keys (vk_live_ format)", description: "SHA-256 hashed API keys for programmatic access. Free: 3, Pro: 20, Enterprise: unlimited.", status: "shipped", tags: ["API"], version: "v0.4.0", date: "Mar 2026" },
      { title: "Sentinel continuous monitoring", description: "Scheduled re-scans with configurable intervals. Regression alerts via email when risk spikes > 20pp or new HIGH findings appear.", status: "shipped", tags: ["Monitoring"], version: "v0.4.0", date: "Mar 2026" },
    ],
  },
  {
    phase: "Engine Depth",
    version: "v0.5 – v0.6",
    quarter: "Mar–Apr 2026",
    items: [
      { title: "PyRIT 10-converter engine", description: "Native PyRIT-style encoding converters: Base64, ROT13, leetspeak, Caesar cipher, Unicode math, Morse code, character-space, reverse, zero-width, binary.", status: "shipped", tags: ["Attacks", "Pro"], version: "v0.5.0", date: "Mar 2026" },
      { title: "EasyJailbreak PAIR/TAP/CIPHER", description: "Claude Haiku as attacker model. PAIR: iterative refinement. TAP: tree-of-attacks with pruning. CIPHER: encoding-based evasion.", status: "shipped", tags: ["Attacks", "Pro/Ent"], version: "v0.5.0", date: "Mar 2026" },
      { title: "RAG Security Scanner (RAG-01–05)", description: "Dedicated scanner for Retrieval-Augmented Generation pipelines: corpus poisoning, cross-tenant leakage, query injection, unauth ingestion, embedding leakage.", status: "shipped", tags: ["RAG", "Pro/Ent"], version: "v0.5.0", date: "Mar 2026" },
      { title: "Enterprise org management + audit logs", description: "Org creation, member invite, role assignment (Admin/Member), org-wide scan history, paginated audit log.", status: "shipped", tags: ["Enterprise"], version: "v0.6.0", date: "Mar 2026" },
      { title: "Analytics dashboard", description: "Risk trend charts, findings breakdown by severity/category, OWASP coverage heatmap, scan cadence metrics.", status: "shipped", tags: ["Platform"], version: "v0.6.0", date: "Mar 2026" },
      { title: "Account settings, webhooks, notifications", description: "Profile management, webhook endpoint management with HMAC verification, notification preferences.", status: "shipped", tags: ["Platform"], version: "v0.6.0", date: "Mar 2026" },
    ],
  },
  {
    phase: "Intelligence",
    version: "v0.7 – v0.8",
    quarter: "Apr 2026",
    items: [
      { title: "Scan regression diff", description: "Side-by-side comparison of any two scans. NEW / FIXED / UNCHANGED findings. Risk delta percentage.", status: "shipped", tags: ["Core"], version: "v0.7.0", date: "Mar 2026" },
      { title: "Public vulnerability database", description: "Searchable catalog of known LLM attack techniques, encoded examples, OWASP/MITRE mapping, and remediation guidance.", status: "in-progress", tags: ["Content", "SEO"], version: "v0.8.0" },
      { title: "Custom probe configuration", description: "Enterprise: supply custom payload lists merged into scan suite. Define target-specific attack scenarios.", status: "in-progress", tags: ["Enterprise"], version: "v0.8.0" },
      { title: "Keyboard shortcuts & productivity UX", description: "Scanner keyboard shortcuts, command palette, quick-scan from URL bar, improved mobile layout.", status: "planned", tags: ["UX"], version: "v0.8.0" },
      { title: "Scan comparison baseline management", description: "Mark any scan as a baseline for regression tracking. Baseline auto-pinning on Sentinel watches.", status: "planned", tags: ["Core"], version: "v0.8.0" },
    ],
  },
  {
    phase: "Scale",
    version: "v0.9 – v1.0",
    quarter: "May–Jun 2026",
    items: [
      { title: "GitHub / GitLab native app", description: "One-click installation. Auto-scan on PR open against changed LLM config files. PR comment with scan summary.", status: "planned", tags: ["Integrations"], version: "v0.9.0" },
      { title: "Slack native integration", description: "OAuth app — post scan summaries and Sentinel alerts to a channel. /vulnra slash command for on-demand scans.", status: "planned", tags: ["Integrations"], version: "v0.9.0" },
      { title: "JIRA / Linear issue creation", description: "Auto-create issues from HIGH/CRITICAL findings. Map findings to epics. Close issues when findings are resolved.", status: "planned", tags: ["Integrations"], version: "v0.9.0" },
      { title: "SOC 2 Type II preparation", description: "Engage third-party auditor. Implement audit evidence collection automation. Target Type I attestation.", status: "planned", tags: ["Trust"], version: "v1.0.0" },
      { title: "On-premises deployment (Docker Compose)", description: "Enterprise: self-hosted deployment package. Includes all engines, API, frontend, and Redis/Postgres setup.", status: "planned", tags: ["Enterprise"], version: "v1.0.0" },
      { title: "LLM fine-tuning security evaluation", description: "Probes specifically designed for fine-tuned models: backdoor detection, training data extraction, alignment drift detection.", status: "research", tags: ["Research"], version: "v1.1.0+" },
      { title: "Multimodal attack surface (vision models)", description: "Image-based prompt injection, adversarial examples for vision-language models, jailbreaks via embedded text in images.", status: "research", tags: ["Research"], version: "v1.1.0+" },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">

        {/* Header */}
        <div className="mb-14 max-w-2xl">
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-5">
            <span className="w-5 h-px bg-acid/35" />
            Product Roadmap
            <span className="w-5 h-px bg-acid/35" />
          </div>
          <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.1]">
            What we&apos;re building<br />
            <span style={{ color: "#b8ff57" }}>and what&apos;s next</span>
          </h1>
          <p className="text-base text-v-muted font-light leading-relaxed mb-6">
            VULNRA ships fast. This roadmap reflects our current priorities. Items marked PLANNED are committed. RESEARCH items are exploratory. Updated monthly.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {(Object.entries(STATUS_META) as [Status, (typeof STATUS_META)[Status]][]).map(([, meta]) => (
              <div key={meta.label} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                <span className="font-mono text-[9px] tracking-widest text-v-muted2">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-14">
          {PHASES.map((phase) => (
            <div key={phase.phase}>
              {/* Phase header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-v-border2" />
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-v-muted2">{phase.quarter}</span>
                  <span className="font-mono text-base font-bold text-foreground">{phase.phase}</span>
                  <span className="font-mono text-[9px] text-v-muted2 border border-v-border px-1.5 py-0.5 rounded-[2px]">{phase.version}</span>
                </div>
                <div className="h-px flex-1 bg-v-border2" />
              </div>

              {/* Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {phase.items.map((item) => {
                  const meta = STATUS_META[item.status];
                  return (
                    <div key={item.title} className="border border-v-border rounded-lg p-5 bg-v-bg1 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot} ${item.status === "in-progress" ? "animate-pulse" : ""}`} />
                          <h3 className="font-mono text-[11.5px] font-bold text-foreground leading-snug">{item.title}</h3>
                        </div>
                        <span className={`shrink-0 text-[7px] font-mono font-bold px-1.5 py-[3px] rounded border tracking-widest leading-none ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="font-mono text-[10.5px] text-v-muted leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.tags.map((tag) => (
                          <span key={tag} className="font-mono text-[7.5px] tracking-wider text-v-muted2 border border-v-border px-1.5 py-0.5 rounded-[2px]">
                            {tag}
                          </span>
                        ))}
                        {item.version && (
                          <span className="font-mono text-[8px] text-v-muted2 ml-auto">{item.version}{item.date ? ` · ${item.date}` : ""}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Feedback CTA */}
        <div className="mt-20 border border-v-border rounded-lg p-10 text-center bg-v-bg1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/30 to-transparent" />
          <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">Missing something?</p>
          <h3 className="font-mono text-2xl font-bold text-foreground mb-4">
            Tell us what to build next.
          </h3>
          <p className="text-sm text-v-muted font-light mb-8 max-w-lg mx-auto leading-relaxed">
            Enterprise customers can influence roadmap priority. Email us at{" "}
            <a href="mailto:product@vulnra.ai" className="text-acid underline underline-offset-4">product@vulnra.ai</a>{" "}
            with your use case.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-6 py-3 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all"
            >
              START FREE →
            </Link>
            <Link href="/changelog" className="font-mono text-[11px] tracking-widest text-v-muted2 border border-v-border px-6 py-3 rounded-sm hover:border-white/15 hover:text-v-muted transition-all">
              VIEW CHANGELOG
            </Link>
          </div>
        </div>

      </div>

      <PublicFooter />
    </div>
  );
}
