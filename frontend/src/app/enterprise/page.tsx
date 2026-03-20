import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Enterprise — VULNRA | LLM Security at Scale",
  description:
    "VULNRA Enterprise gives security teams unlimited scanning, dedicated support, custom probe configuration, org-level audit logs, and a Data Processing Agreement. Built for teams shipping AI at scale.",
  alternates: { canonical: "https://vulnra.ai/enterprise" },
  openGraph: {
    title: "VULNRA Enterprise — LLM Security at Scale",
    description: "Unlimited LLM scanning, org management, custom probes, DPA, and dedicated support for enterprise AI security teams.",
    url: "https://vulnra.ai/enterprise",
    siteName: "VULNRA",
    type: "website",
  },
};

const FEATURES = [
  {
    category: "Scan Coverage",
    items: [
      "Unlimited scans — no daily or monthly caps",
      "All 4 engines: Garak, DeepTeam, PyRIT (10 converters), EasyJailbreak (PAIR, TAP, CIPHER)",
      "RAG Security: RAG-01 through RAG-05 probes",
      "MCP Server scanning for agentic AI deployments",
      "Multi-turn attacks: Crescendo and GOAT chains",
      "Custom probe configuration — bring your own attack payloads",
    ],
  },
  {
    category: "Monitoring & Alerting",
    items: [
      "50 Sentinel watches (vs 5 on Pro)",
      "1-hour minimum monitoring interval (vs 24h on Pro)",
      "Webhook delivery with HMAC-SHA256 signatures",
      "Email alerts via Resend on regression detection",
      "Risk spike threshold configuration per watch",
    ],
  },
  {
    category: "Compliance & Reporting",
    items: [
      "Full OWASP LLM Top 10, MITRE ATLAS, EU AI Act mapping",
      "ISO 42001 and NIST AI RMF control mapping",
      "India DPDP Act 2023 compliance coverage",
      "PDF compliance audit reports with full evidence chain",
      "Regression diff reports for continuous compliance tracking",
      "Data Processing Agreement (DPA) available on request",
    ],
  },
  {
    category: "Enterprise Platform",
    items: [
      "Org management: invite members, assign roles (Admin/Member)",
      "Org-level scan history — admins see all team scans",
      "Paginated audit log (member invited, scan created, report downloaded, etc.)",
      "100 req/min API rate limit (vs 10 on Pro)",
      "Unlimited API keys (vk_live_ format)",
      "Scan result share links with configurable expiry",
    ],
  },
  {
    category: "Support & Security",
    items: [
      "Dedicated Slack or email support channel",
      "Onboarding call with engineering team",
      "Custom SLA available",
      "Responsible disclosure programme — security@vulnra.ai",
      "Sub-processor DPA list available on request",
    ],
  },
];

const TRUST_SIGNALS = [
  { label: "API keys", detail: "SHA-256 hashed, never stored in plain text" },
  { label: "Transport", detail: "TLS 1.2+ on all endpoints" },
  { label: "Data isolation", detail: "Row-level security on all scan data" },
  { label: "Auth", detail: "Supabase Auth — email, GitHub, Google OAuth" },
  { label: "Webhooks", detail: "HMAC-SHA256 signed payloads" },
  { label: "DPA", detail: "Available for Enterprise on request" },
];

const FAQS = [
  {
    q: "What counts as a 'scan' for billing purposes?",
    a: "One scan = one invocation of POST /scan or POST /scan/rag or POST /scan/mcp against a single target URL. Enterprise has no scan cap.",
  },
  {
    q: "Can we deploy VULNRA on-premises?",
    a: "Yes. Enterprise customers can request an on-premises deployment for data sovereignty requirements. Contact sales@vulnra.ai.",
  },
  {
    q: "Do you sign Data Processing Agreements?",
    a: "Yes. A standard DPA is available for Enterprise customers. Contact legal@vulnra.ai.",
  },
  {
    q: "How does org management work?",
    a: "An Enterprise admin can invite team members by email, assign Admin or Member roles, view all team scans, and access a paginated audit log of all actions.",
  },
  {
    q: "What compliance frameworks do you map to?",
    a: "OWASP LLM Top 10, MITRE ATLAS, EU AI Act (Articles 9/10/11/13/15/55), NIST AI RMF, ISO/IEC 42001, and India DPDP Act 2023.",
  },
  {
    q: "Can we configure custom attack payloads?",
    a: "Yes on Enterprise. You can supply a JSON payload list that is merged into the probe suite. Contact support to enable this for your org.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-acid/5 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#4db8ff]/4 rounded-full blur-[100px]" />
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-12 pt-32 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-6">
              <span className="w-5 h-px bg-acid/35" />
              Enterprise
              <span className="w-5 h-px bg-acid/35" />
            </div>
            <h1 className="font-mono text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.05]">
              LLM security<br />
              <span style={{ color: "#b8ff57" }}>built for teams</span>
            </h1>
            <p className="text-lg text-v-muted font-light leading-relaxed mb-10 max-w-xl">
              Unlimited scanning, org-level audit logs, custom probe configuration, dedicated support, and compliance evidence — for security teams shipping AI at scale.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:sales@vulnra.ai"
                className="inline-flex items-center justify-center font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-8 py-3.5 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all"
              >
                CONTACT SALES →
              </a>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center font-mono text-[11px] tracking-widest text-v-muted2 border border-v-border px-8 py-3.5 rounded-sm hover:border-white/15 hover:text-v-muted transition-all"
              >
                SEE ALL PLANS
              </Link>
            </div>
            <p className="font-mono text-[10px] text-v-muted2 mt-4">
              Or start a Pro trial — <Link href="/signup" className="text-acid underline underline-offset-4">sign up free</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pb-20">

        {/* Feature grid */}
        <div className="mb-20">
          <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-8">Everything in Enterprise</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((group) => (
              <div key={group.category} className="border border-v-border rounded-lg p-6 bg-v-bg1">
                <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-acid mb-4">{group.category}</p>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="w-3 h-3 text-acid shrink-0 mt-[3px]" />
                      <span className="font-mono text-[11px] text-v-muted leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Security trust */}
        <div className="mb-20 border border-v-border rounded-lg p-8 bg-v-bg1">
          <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-acid mb-6">Security & trust</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {TRUST_SIGNALS.map(({ label, detail }) => (
              <div key={label}>
                <p className="font-mono text-[10.5px] font-bold text-foreground mb-1">{label}</p>
                <p className="font-mono text-[9.5px] text-v-muted2 leading-snug">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-5 border-t border-v-border2 flex flex-wrap gap-4">
            <Link href="/security" className="font-mono text-[10px] tracking-widest text-acid hover:underline underline-offset-4">
              Security practices →
            </Link>
            <Link href="/privacy" className="font-mono text-[10px] tracking-widest text-v-muted2 hover:text-acid transition-colors">
              Privacy policy
            </Link>
            <Link href="/responsible-disclosure" className="font-mono text-[10px] tracking-widest text-v-muted2 hover:text-acid transition-colors">
              Responsible disclosure
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-8">Enterprise FAQ</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="border border-v-border rounded-lg p-6 bg-v-bg1">
                <p className="font-mono text-[11.5px] font-bold text-foreground mb-3 leading-snug">{q}</p>
                <p className="font-mono text-[11px] text-v-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border border-acid/25 rounded-lg p-12 text-center bg-acid/[0.03] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/40 to-transparent" />
          <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">Ready to secure your AI stack?</p>
          <h3 className="font-mono text-3xl font-bold text-foreground mb-5">
            Talk to our team.
          </h3>
          <p className="text-sm text-v-muted font-light mb-8 max-w-md mx-auto leading-relaxed">
            We will walk you through how VULNRA maps to your specific compliance requirements and use cases. No commitment required.
          </p>
          <a
            href="mailto:sales@vulnra.ai"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-8 py-3.5 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all"
          >
            EMAIL SALES →
          </a>
          <p className="font-mono text-[9.5px] text-v-muted2 mt-4">sales@vulnra.ai · response within 1 business day</p>
        </div>

      </div>

      <PublicFooter />
    </div>
  );
}
