import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "About — VULNRA",
  description:
    "VULNRA is a production-grade AI vulnerability scanner built to make LLM security accessible to every development team.",
};

/* ─── Data ──────────────────────────────────────────────────────────────────── */
const PRINCIPLES = [
  {
    num: "01",
    title: "Adversarial by design",
    body: "Every probe in VULNRA is modelled on real-world attack research. We don't simulate what attackers might do — we do exactly what they do, under controlled conditions, against your API.",
  },
  {
    num: "02",
    title: "Open standards, not black boxes",
    body: "All findings map to OWASP LLM Top 10, MITRE ATLAS, EU AI Act, and NIST AI RMF. You always know why a finding is flagged and what control it violates.",
  },
  {
    num: "03",
    title: "Built for developers, trusted by compliance",
    body: "API-first architecture, CI/CD webhooks, and PDF evidence reports means security engineers and compliance officers both get what they need from the same scan.",
  },
  {
    num: "04",
    title: "Tier-based, not paywalled",
    body: "Every tier includes real scanning. Free users run genuine probes — not toys. Pro and Enterprise unlock depth, not access.",
  },
];

const STACK = [
  { layer: "Scan Engines", items: ["Garak 0.14", "DeepTeam 0.1", "PyRIT converters (native)", "EasyJailbreak PAIR/TAP/CIPHER"] },
  { layer: "AI Judge", items: ["Claude 3 Haiku", "Per-finding: is_vulnerable, confidence, reasoning", "Fallback to engine heuristics"] },
  { layer: "Backend", items: ["FastAPI (Python 3.11)", "Pydantic v2", "Celery + Upstash Redis", "Supabase PostgreSQL"] },
  { layer: "Frontend", items: ["Next.js 16 (App Router)", "React 19", "TypeScript", "Tailwind CSS v4"] },
  { layer: "Auth & Billing", items: ["Supabase Auth (email, GitHub, Google)", "API keys (vk_live_ format)", "Lemon Squeezy subscriptions"] },
  { layer: "Deployment", items: ["Railway (Docker)", "3-layer image build", "GitHub Actions CI/CD"] },
];

const TIMELINE = [
  { date: "Feb 2026", event: "VULNRA v0.1.0 — first multi-engine scan with AI Judge" },
  { date: "Feb 2026", event: "Multi-turn attacks (Crescendo, GOAT) + MCP scanner" },
  { date: "Mar 2026", event: "Billing, PDF reports, scan sharing" },
  { date: "Mar 2026", event: "API keys, Sentinel continuous monitoring" },
  { date: "Mar 2026", event: "PyRIT converters, RAG Security Scanner, enterprise org" },
  { date: "Mar 2026", event: "Account settings, webhook delivery, API docs" },
  { date: "Mar 2026", event: "Analytics dashboard, compliance explorer — v0.8.0" },
  { date: "Mar 2026", event: "Custom probe config, keyboard shortcuts, mobile-responsive dashboard — v0.9.0" },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1100px] mx-auto px-6 md:px-12 pt-28 pb-20">

        {/* Hero */}
        <div className="mb-20 max-w-3xl">
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
            <span className="w-5 h-px bg-acid/35" />
            About
            <span className="w-5 h-px bg-acid/35" />
          </div>
          <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Automated adversarial testing
            <br />
            <span className="text-acid">for every LLM you ship.</span>
          </h1>
          <p className="text-[16px] text-v-muted font-light leading-[1.8] mb-8">
            VULNRA was built out of a frustration: security teams had no fast, automated way to test
            LLM APIs the way they test web applications. Manual red-teaming is expensive and
            inconsistent. Existing tools either required machine learning PhDs to operate or produced
            reports no one could action.
          </p>
          <p className="text-[16px] text-v-muted font-light leading-[1.8]">
            We built VULNRA to change that — a platform that runs the same adversarial techniques
            used by elite red teams, in minutes, against any LLM API endpoint, and maps every finding
            to the compliance frameworks your organisation already uses.
          </p>
        </div>

        {/* Principles */}
        <section className="mb-20">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-acid mb-8">
            // Principles
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PRINCIPLES.map((p) => (
              <div key={p.num} className="border border-v-border2 rounded-xl p-6 hover:border-acid/20 transition-colors">
                <div className="font-mono text-[11px] text-acid mb-3">{p.num}</div>
                <h3 className="font-mono text-[14px] font-bold text-white mb-3">{p.title}</h3>
                <p className="font-mono text-[12.5px] text-v-muted leading-[1.8]">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-20">
          <div className="border border-v-border2 rounded-xl overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-v-border2">
              {[
                { value: "40+", label: "Vulnerability types" },
                { value: "61", label: "PyRIT converter variants" },
                { value: "5", label: "RAG attack probes" },
                { value: "6", label: "Compliance frameworks" },
              ].map((s) => (
                <div key={s.label} className="p-6 text-center">
                  <div className="font-mono text-3xl font-bold text-acid mb-1">{s.value}</div>
                  <div className="font-mono text-[10px] tracking-widest uppercase text-v-muted2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="mb-20">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-acid mb-8">
            // Technology
          </div>
          <p className="font-mono text-[13px] text-v-muted leading-relaxed mb-8 max-w-2xl">
            VULNRA is built on open-source research tools and production-grade infrastructure.
            No vendor lock-in. No black-box scanning.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STACK.map((s) => (
              <div key={s.layer} className="border border-v-border2 rounded-xl p-5">
                <div className="font-mono text-[10px] tracking-widest uppercase text-acid/70 mb-3">{s.layer}</div>
                <ul className="space-y-1.5">
                  {s.items.map((item) => (
                    <li key={item} className="font-mono text-[11.5px] text-v-muted2 flex items-start gap-1.5">
                      <span className="text-acid/40 shrink-0">▸</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-20">
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-acid mb-8">
            // Timeline
          </div>
          <div className="relative pl-6 border-l border-v-border2 space-y-6">
            {TIMELINE.map((item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[25px] top-0.5 w-3 h-3 rounded-full border-2 border-v-border2 bg-background" />
                <div className="font-mono text-[9px] tracking-widest uppercase text-v-muted2 mb-1">{item.date}</div>
                <p className="font-mono text-[13px] text-v-muted">{item.event}</p>
              </div>
            ))}
            {/* Current dot */}
            <div className="relative">
              <div className="absolute -left-[25px] top-0.5 w-3 h-3 rounded-full border-2 border-acid bg-acid/30 animate-pulse" />
              <div className="font-mono text-[9px] tracking-widest uppercase text-acid mb-1">Now</div>
              <p className="font-mono text-[13px] text-acid">Building the future of AI security testing.</p>
            </div>
          </div>
        </section>

        {/* Contact / CTA */}
        <section>
          <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-acid mb-6">
            // Get in touch
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-10">
            {[
              { label: "Security reports", email: "security@vulnra.ai", desc: "Responsible disclosure" },
              { label: "Enterprise sales", email: "sales@vulnra.ai", desc: "Custom contracts + SLA" },
              { label: "Legal", email: "legal@vulnra.ai", desc: "GDPR, DPAs, compliance" },
            ].map((c) => (
              <div key={c.label} className="border border-v-border2 rounded-xl p-5 hover:border-acid/20 transition-colors">
                <div className="font-mono text-[10px] tracking-widest uppercase text-v-muted2 mb-2">{c.label}</div>
                <a href={`mailto:${c.email}`} className="font-mono text-[12px] text-acid hover:underline block mb-1">
                  {c.email}
                </a>
                <p className="font-mono text-[10.5px] text-v-muted2">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-acid text-black font-mono text-[12px] tracking-widest uppercase px-6 py-3 rounded-lg font-bold hover:bg-acid/90 transition-colors"
            >
              Start Free →
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 border border-v-border2 text-v-muted font-mono text-[12px] tracking-widest uppercase px-6 py-3 rounded-lg hover:border-acid/30 hover:text-white transition-colors"
            >
              API Docs
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-v-border2 text-v-muted font-mono text-[12px] tracking-widest uppercase px-6 py-3 rounded-lg hover:border-acid/30 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
