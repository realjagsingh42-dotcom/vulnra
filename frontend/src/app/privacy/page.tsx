import type { Metadata } from "next";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — VULNRA",
  description: "How VULNRA collects, uses, and protects your data.",
};

const SECTIONS = [
  {
    id: "information-we-collect",
    num: "01",
    title: "Information We Collect",
    subsections: [
      {
        title: "Account Data",
        body: "When you create an account, we collect your email address, chosen display name, organisation name (optional), and plan selection. If you sign in via Google or GitHub OAuth, we receive your name and email from that provider.",
      },
      {
        title: "Scan Metadata",
        body: "When you run a scan, we record the target endpoint URL you submitted, the scan timestamp, your subscription tier, the resulting risk score (0–10), and finding categories. We do not store raw model responses beyond the active scan session.",
      },
      {
        title: "Billing Data",
        body: "Payment processing is handled by Lemon Squeezy. We store only your subscription tier, subscription ID, and renewal date. We do not store card numbers, CVVs, or bank details.",
      },
      {
        title: "Usage Logs",
        body: "We collect server-side logs including request timestamps, endpoint paths, HTTP status codes, and anonymised IP addresses for security and debugging. These are retained for 30 days.",
      },
    ],
  },
  {
    id: "how-we-use",
    num: "02",
    title: "How We Use Your Data",
    subsections: [
      {
        title: "Providing the Service",
        body: "Your email is used to authenticate your account and send transactional emails (scan completion, billing receipts, Sentinel alerts). Target URLs are used solely to perform the security scan you requested.",
      },
      {
        title: "Improving VULNRA",
        body: "We use aggregate, anonymised scan metadata (risk score distributions, finding category frequencies) to improve probe accuracy and engine coverage. We never use individual scan data for model training without explicit consent.",
      },
      {
        title: "Communication",
        body: "We may send product update emails if you opt in. You can unsubscribe at any time via the link in any email or from your account settings.",
      },
    ],
  },
  {
    id: "data-retention",
    num: "03",
    title: "Data Retention",
    subsections: [
      {
        title: "Scan Results",
        body: "Scan results (risk scores, finding categories, remediation text) are retained for 90 days for free users and 12 months for Pro/Enterprise users. You can delete individual scans at any time from your scan history.",
      },
      {
        title: "Account Data",
        body: "Account data is retained as long as your account is active. On account deletion, all personal data is permanently erased within 30 days, except where we are required by law to retain it.",
      },
    ],
  },
  {
    id: "third-parties",
    num: "04",
    title: "Third-Party Services",
    subsections: [
      {
        title: "Supabase",
        body: "We use Supabase for database hosting and authentication. Data is stored in the EU (Frankfurt, eu-central-1). Supabase is SOC 2 Type II certified.",
      },
      {
        title: "Lemon Squeezy",
        body: "Payment processing and subscription management. Lemon Squeezy acts as Merchant of Record for all transactions.",
      },
      {
        title: "Resend",
        body: "Transactional email delivery (Sentinel alerts, billing receipts, invite emails).",
      },
      {
        title: "Anthropic",
        body: "We send anonymised probe payloads to Claude 3 Haiku for AI-judged vulnerability assessment. Prompts submitted to Anthropic are not used for model training under our API agreement.",
      },
    ],
  },
  {
    id: "international-transfers",
    num: "05",
    title: "International Transfers",
    subsections: [
      {
        title: "Cross-Border Data Flows",
        body: "VULNRA is incorporated in India. Our primary data infrastructure is in the EU. Transfers from the EU to India are covered by Standard Contractual Clauses (SCCs). We apply equivalent protections regardless of where data is processed.",
      },
    ],
  },
  {
    id: "your-rights-gdpr",
    num: "06",
    title: "Your Rights (GDPR)",
    subsections: [
      {
        title: "Rights Under GDPR",
        body: "If you are located in the European Economic Area, you have the right to: access your personal data, correct inaccurate data, request erasure ('right to be forgotten'), restrict or object to processing, receive your data in a portable format, and withdraw consent at any time. To exercise any of these rights, email privacy@vulnra.ai. We will respond within 30 days.",
      },
    ],
  },
  {
    id: "your-rights-dpdp",
    num: "07",
    title: "Your Rights (India DPDP)",
    subsections: [
      {
        title: "Rights Under India DPDP Act 2023",
        body: "If you are a data principal under the Digital Personal Data Protection Act 2023, you have the right to: access a summary of your personal data processed by us, correct or erase your personal data, nominate another person to exercise your rights in the event of your death or incapacity, and file a complaint with the Data Protection Board of India. Contact our Grievance Officer at grievance@vulnra.ai.",
      },
    ],
  },
  {
    id: "cookies",
    num: "08",
    title: "Cookies",
    subsections: [
      {
        title: "What We Use",
        body: "We use strictly necessary cookies for session authentication (Supabase auth token). We do not use advertising or analytics cookies. We do not use third-party tracking pixels. You can disable cookies in your browser, but this will prevent you from logging in.",
      },
    ],
  },
  {
    id: "children",
    num: "09",
    title: "Children's Privacy",
    subsections: [
      {
        title: "Age Restriction",
        body: "VULNRA is not directed at persons under 18 years of age. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact privacy@vulnra.ai and we will promptly delete it.",
      },
    ],
  },
  {
    id: "contact",
    num: "10",
    title: "Contact & Grievance",
    subsections: [
      {
        title: "Data Controller",
        body: "VULNRA · privacy@vulnra.ai",
      },
      {
        title: "India Grievance Officer",
        body: "As required by the DPDP Act 2023 and IT (Intermediary Guidelines) Rules 2021: grievance@vulnra.ai · Response within 72 hours.",
      },
      {
        title: "Updates to This Policy",
        body: "We may update this Privacy Policy from time to time. We will notify registered users by email of material changes at least 14 days before they take effect. Continued use of VULNRA after the effective date constitutes acceptance of the updated policy.",
      },
    ],
  },
];

const TOC_ITEMS = [
  ["Information We Collect", "#information-we-collect"],
  ["How We Use Your Data", "#how-we-use"],
  ["Data Retention", "#data-retention"],
  ["Third-Party Services", "#third-parties"],
  ["International Transfers", "#international-transfers"],
  ["Your Rights (GDPR)", "#your-rights-gdpr"],
  ["Your Rights (India DPDP)", "#your-rights-dpdp"],
  ["Cookies", "#cookies"],
  ["Children's Privacy", "#children"],
  ["Contact & Grievance", "#contact"],
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-16">

          {/* ── Sticky Table of Contents ─────────────────── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-4">
                Contents
              </div>
              <nav className="flex flex-col gap-1">
                {TOC_ITEMS.map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors py-1 flex items-center gap-2 group"
                  >
                    <span className="w-3 h-px bg-v-border2 group-hover:bg-acid/50 transition-colors shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main Content ─────────────────────────────── */}
          <article>
            {/* Header */}
            <div className="mb-12">
              <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
                <span className="w-5 h-px bg-acid/35" />
                Legal
                <span className="w-5 h-px bg-acid/35" />
              </div>
              <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Privacy Policy
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-v-muted2">
                <span>
                  Last updated:{" "}
                  <span className="text-acid">1 March 2026</span>
                </span>
                <span>·</span>
                <span>
                  Effective:{" "}
                  <span className="text-acid">1 March 2026</span>
                </span>
                <span>·</span>
                <span>
                  Controller: <span className="text-acid">VULNRA</span>
                </span>
              </div>
            </div>

            {/* TL;DR */}
            <div className="border border-acid/20 bg-acid/[0.04] rounded-sm px-5 py-4 mb-12">
              <p className="font-mono text-[12.5px] text-v-muted leading-relaxed">
                <span className="text-acid font-semibold">TL;DR</span> — We
                collect your email, account metadata, and scan job metadata
                (URLs, scores, timestamps). We do not store raw LLM responses.
                We do not sell your data. We comply with GDPR and India DPDP.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-14">
              {SECTIONS.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2 className="font-mono text-xl font-bold tracking-tight mb-6 flex items-center gap-3">
                    <span className="text-acid text-[13px]">{section.num}</span>
                    {section.title}
                  </h2>
                  <div className="space-y-6">
                    {section.subsections.map((sub) => (
                      <div key={sub.title}>
                        <h3 className="font-mono text-[13px] font-semibold text-foreground mb-2">
                          {sub.title}
                        </h3>
                        <p className="text-[14px] text-v-muted font-light leading-[1.8]">
                          {sub.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 h-px bg-v-border2" />
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
