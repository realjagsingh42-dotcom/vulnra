import type { Metadata } from "next";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service — VULNRA",
  description: "Terms governing use of the VULNRA AI security scanning platform.",
};

const SECTIONS = [
  {
    id: "acceptance",
    num: "01",
    title: "Acceptance of Terms",
    body: 'By accessing or using VULNRA ("Service", "Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service. These Terms apply to all users, including free tier, Pro, and Enterprise subscribers.',
  },
  {
    id: "description",
    num: "02",
    title: "Description of Service",
    body: "VULNRA provides automated AI vulnerability scanning tools, including LLM API security testing, agent security probing, RAG pipeline scanning, and continuous Sentinel monitoring. The Service is provided on an \"as-is\" and \"as-available\" basis.",
  },
  {
    id: "accounts",
    num: "03",
    title: "User Accounts",
    body: "You must provide accurate and complete registration information. You are responsible for maintaining the confidentiality of your account credentials, including API keys (vk_live_ format). You are responsible for all activity that occurs under your account. Notify us immediately at security@vulnra.ai if you suspect unauthorized access.",
  },
  {
    id: "acceptable-use",
    num: "04",
    title: "Acceptable Use",
    body: "You may only scan LLM endpoints that you own, operate, or have explicit written permission to test. You must not use VULNRA to: (a) scan systems without authorization; (b) violate any applicable law or regulation; (c) attempt to circumvent usage limits or access controls; (d) reverse-engineer or extract probe payloads for use outside the platform; (e) resell or sublicense access to the Service without an Enterprise agreement.",
  },
  {
    id: "subscription",
    num: "05",
    title: "Subscription & Billing",
    body: "Free tier access is provided at no charge subject to usage limits (1 scan/day). Pro and Enterprise subscriptions are billed monthly or annually via Lemon Squeezy. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are provided at our discretion within 7 days of initial purchase. We reserve the right to change pricing with 30 days' notice.",
  },
  {
    id: "ip",
    num: "06",
    title: "Intellectual Property",
    body: "VULNRA and all its components, probe algorithms, scoring methodologies, and compliance mappings are the exclusive intellectual property of VULNRA. You are granted a limited, non-exclusive, non-transferable licence to use the Service for your own security testing. You retain ownership of your scan result data.",
  },
  {
    id: "data",
    num: "07",
    title: "Data & Confidentiality",
    body: "You acknowledge that scan target URLs and API responses may contain sensitive information. VULNRA will treat all such data confidentially in accordance with our Privacy Policy. Enterprise customers may request a Data Processing Agreement (DPA) by contacting sales@vulnra.ai.",
  },
  {
    id: "disclaimer",
    num: "08",
    title: "Disclaimer of Warranties",
    body: 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. VULNRA DOES NOT WARRANT THAT: (A) THE SERVICE WILL BE UNINTERRUPTED OR ERROR-FREE; (B) SCAN RESULTS WILL BE COMPLETE OR ACCURATE; (C) THE SERVICE WILL MEET YOUR SPECIFIC COMPLIANCE REQUIREMENTS. VULNRA SCAN RESULTS DO NOT CONSTITUTE LEGAL OR REGULATORY ADVICE.',
  },
  {
    id: "liability",
    num: "09",
    title: "Limitation of Liability",
    body: "TO THE MAXIMUM EXTENT PERMITTED BY LAW, VULNRA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. VULNRA'S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED THE FEES PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.",
  },
  {
    id: "termination",
    num: "10",
    title: "Termination",
    body: "We may suspend or terminate your access if you violate these Terms, engage in unauthorized scanning, or fail to pay subscription fees. You may terminate your account at any time from account settings. On termination, your right to use the Service ceases immediately. Scan result data will be deleted within 30 days.",
  },
  {
    id: "governing-law",
    num: "11",
    title: "Governing Law",
    body: "These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India. If you are an EU user, nothing in these Terms affects your mandatory consumer protection rights.",
  },
  {
    id: "changes",
    num: "12",
    title: "Changes to Terms",
    body: "We may update these Terms at any time. We will notify registered users by email of material changes at least 14 days before they take effect. Continued use of the Service after the effective date constitutes acceptance of the updated Terms.",
  },
  {
    id: "contact-legal",
    num: "13",
    title: "Contact",
    body: "For legal matters: legal@vulnra.ai\nFor security reports: security@vulnra.ai\nFor sales and enterprise: sales@vulnra.ai",
  },
];

const TOC_ITEMS = SECTIONS.map((s) => [s.title, `#${s.id}`]);

export default function TermsPage() {
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
                Terms of Service
              </h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-v-muted2">
                <span>
                  Last updated: <span className="text-acid">1 March 2026</span>
                </span>
                <span>·</span>
                <span>
                  Effective: <span className="text-acid">1 March 2026</span>
                </span>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-10">
              {SECTIONS.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2 className="font-mono text-xl font-bold tracking-tight mb-4 flex items-center gap-3">
                    <span className="text-acid text-[13px]">{section.num}</span>
                    {section.title}
                  </h2>
                  <p className="text-[14px] text-v-muted font-light leading-[1.8] whitespace-pre-line">
                    {section.body}
                  </p>
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
