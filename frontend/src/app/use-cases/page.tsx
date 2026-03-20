import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Use Cases — VULNRA | LLM Security for Fintech, Healthcare, SaaS & More",
  description:
    "See how security teams at fintech, healthcare, SaaS, and government organisations use VULNRA to secure LLM APIs, RAG pipelines, and AI agents against prompt injection and jailbreaks.",
  alternates: { canonical: "https://vulnra.ai/use-cases" },
  openGraph: {
    title: "VULNRA Use Cases — LLM Security Across Industries",
    description: "How fintech, healthcare, SaaS, and government teams use VULNRA to find and fix LLM vulnerabilities before attackers do.",
    url: "https://vulnra.ai/use-cases",
    siteName: "VULNRA",
    type: "website",
  },
};

const USE_CASES = [
  {
    id: "fintech",
    industry: "Fintech & Banking",
    tagline: "Secure AI in regulated financial environments",
    badge: "HIGH REGULATION",
    badgeColor: "text-v-red border-v-red/40 bg-v-red/8",
    description:
      "Financial institutions using LLMs for customer support, fraud detection, and document analysis face strict regulatory obligations under DORA, PSD2, and MAS guidelines. A single prompt injection in a customer-facing chatbot can expose account data, trigger fraudulent transactions, or violate GDPR/DPDP in ways that result in regulatory action.",
    threats: [
      "Prompt injection via customer messages overriding system prompts",
      "PII leakage — account numbers, transaction history, KYC data",
      "Jailbreak attacks bypassing fraud detection model guardrails",
      "Indirect injection via uploaded documents (statements, KYC PDFs)",
    ],
    vulnraValue: [
      "OWASP LLM01–LLM06 coverage with DORA and NIST AI RMF mapping",
      "PII leakage probes across 12 data categories including financial identifiers",
      "RAG scanner for document ingestion pipelines (PDF, statement uploads)",
      "PDF compliance reports suitable for regulatory audit submissions",
      "Sentinel — continuous monitoring with 1-hour alert intervals (Enterprise)",
    ],
    compliance: ["OWASP LLM Top 10", "NIST AI RMF", "EU AI Act Art. 9/15", "DPDP Act 2023"],
  },
  {
    id: "healthcare",
    industry: "Healthcare & Life Sciences",
    tagline: "HIPAA-adjacent AI security for clinical LLM deployments",
    badge: "CRITICAL DATA",
    badgeColor: "text-v-red border-v-red/40 bg-v-red/8",
    description:
      "Healthcare LLM deployments — clinical decision support, patient intake bots, medical coding assistants — handle some of the most sensitive personal data in existence. Data leakage from a clinical LLM is a breach notification event. Prompt injection in a clinical context can produce dangerous misinformation at scale.",
    threats: [
      "Patient data (PHI) exposure through model output leakage",
      "Prompt injection producing clinically dangerous hallucinations",
      "RAG corpus poisoning of clinical knowledge bases",
      "Jailbreaks bypassing clinical guideline adherence guardrails",
    ],
    vulnraValue: [
      "PHI/PII leakage detection probes targeting medical data patterns",
      "RAG-01 corpus poisoning detection for clinical knowledge pipelines",
      "Hallucination and factual consistency probing (LLM09)",
      "HIPAA-relevant compliance mapping with remediation guidance",
      "PDF audit exports for HIPAA risk assessment documentation",
    ],
    compliance: ["OWASP LLM Top 10", "NIST AI RMF", "HIPAA Risk Analysis", "EU AI Act High-Risk"],
  },
  {
    id: "saas",
    industry: "SaaS & Developer Platforms",
    tagline: "Ship secure AI features without slowing your release cycle",
    badge: "VELOCITY",
    badgeColor: "text-acid border-acid/40 bg-acid/8",
    description:
      "SaaS companies adding LLM features — AI assistants, code generation, document summarisation — need to test security at the speed of their deployment cycle. Manual red-teaming is too slow. A single prompt injection in a multi-tenant SaaS can leak one tenant's data to another, creating immediate liability.",
    threats: [
      "Cross-tenant data leakage via shared LLM context",
      "Prompt injection in user-submitted content processed by agents",
      "API key extraction through system prompt leakage attacks",
      "Jailbreaks in AI assistants producing off-brand or harmful content",
    ],
    vulnraValue: [
      "GitHub Actions + GitLab CI integration — scan on every PR",
      "REST API + vk_live_ key auth for automated pipeline integration",
      "Cross-tenant RAG leakage detection (RAG-02)",
      "System prompt confidentiality probes (LLM06)",
      "Webhook delivery of scan results to Slack or PagerDuty",
    ],
    compliance: ["OWASP LLM Top 10", "SOC 2 Type II AI controls", "ISO 42001"],
  },
  {
    id: "govtech",
    industry: "Government & Public Sector",
    tagline: "Meet EU AI Act and national AI governance requirements",
    badge: "COMPLIANCE",
    badgeColor: "text-[#4db8ff] border-[#4db8ff]/40 bg-[#4db8ff]/8",
    description:
      "Government agencies deploying AI for citizen services, document processing, or decision support must comply with the EU AI Act (for EU agencies), NIST AI RMF, and national AI governance frameworks. High-risk AI systems require documented adversarial testing and continuous monitoring — exactly what VULNRA provides.",
    threats: [
      "Indirect prompt injection via citizen-submitted documents",
      "Manipulation of AI-assisted decision systems",
      "Data sovereignty violations through model output leakage",
      "Adversarial inputs bypassing content moderation in public-facing bots",
    ],
    vulnraValue: [
      "EU AI Act Art. 9/10/11/13/15 compliance mapping on every scan",
      "MITRE ATLAS technique mapping for threat intelligence reports",
      "ISO/IEC 42001 control mapping for AI management systems",
      "Timestamped PDF audit reports for regulatory submission",
      "On-premises deployment available (Enterprise) for data sovereignty",
    ],
    compliance: ["EU AI Act", "MITRE ATLAS", "NIST AI RMF", "ISO 42001", "DPDP Act 2023"],
  },
  {
    id: "ai-startups",
    industry: "AI Startups & Model Builders",
    tagline: "Build safe-by-default from day one",
    badge: "EARLY STAGE",
    badgeColor: "text-v-amber border-v-amber/40 bg-v-amber/8",
    description:
      "AI startups building on foundation models — via OpenAI, Anthropic, or open-source — are responsible for the security of their own system prompt layer, tool integrations, and output handling. Investors and enterprise customers increasingly require security evidence before signing deals. VULNRA gives you that evidence on the free tier.",
    threats: [
      "Prompt injection via system prompt override in early-stage products",
      "Jailbreaks in demos exploited by security researchers before launch",
      "Lack of compliance documentation blocking enterprise deals",
      "Multi-turn agent attacks in agentic product MVPs",
    ],
    vulnraValue: [
      "Free tier: 1 real scan/day — no credit card, immediate results",
      "Risk score and top findings shareable with investors and customers",
      "Public scan share link — send evidence to your enterprise prospects",
      "Upgrade to Pro for full OWASP mapping and PDF compliance reports",
      "Start building your compliance evidence trail from day one",
    ],
    compliance: ["OWASP LLM Top 10", "NIST AI RMF", "SOC 2 AI Addendum"],
  },
  {
    id: "security-teams",
    industry: "Pentesting & Red Teams",
    tagline: "The adversarial LLM toolkit for professional red teamers",
    badge: "OFFENSIVE",
    badgeColor: "text-v-red border-v-red/40 bg-v-red/8",
    description:
      "Professional pentesters and red teams need a comprehensive LLM attack surface coverage tool that produces client-ready reports. VULNRA combines Garak, DeepTeam, PyRIT converters, and EasyJailbreak PAIR/TAP recipes — multi-engine coverage that would take weeks to configure manually — into a single scan with PDF output.",
    threats: [
      "Encoding evasion attacks (Base64, ROT13, Unicode, Morse, leetspeak)",
      "PAIR iterative refinement for adaptive jailbreak development",
      "TAP tree-of-attacks for multi-branch adversarial exploration",
      "RAG corpus poisoning and cross-tenant leakage in client RAG stacks",
    ],
    vulnraValue: [
      "PyRIT: 10 encoding converters across free/Pro/Enterprise tiers",
      "EasyJailbreak: PAIR, TAP, CIPHER attack recipes",
      "MCP server scanning for agentic AI deployments",
      "Crescendo and GOAT multi-turn attack chains",
      "PDF report with full evidence chain — client-ready in minutes",
    ],
    compliance: ["OWASP LLM Top 10", "MITRE ATLAS", "EU AI Act Art. 55 (adversarial testing)"],
  },
];

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">

        {/* Header */}
        <div className="mb-16 max-w-2xl">
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-5">
            <span className="w-5 h-px bg-acid/35" />
            Use Cases
            <span className="w-5 h-px bg-acid/35" />
          </div>
          <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.1]">
            Securing AI across<br />
            <span style={{ color: "#b8ff57" }}>every industry</span>
          </h1>
          <p className="text-base text-v-muted font-light leading-relaxed">
            LLM vulnerabilities do not respect sector boundaries. Whether you are in fintech, healthcare, SaaS, or government — if you deploy an AI API, you have an attack surface. Here is how teams like yours use VULNRA.
          </p>
        </div>

        {/* Industry nav */}
        <div className="flex flex-wrap gap-2 mb-14">
          {USE_CASES.map((uc) => (
            <a
              key={uc.id}
              href={`#${uc.id}`}
              className="font-mono text-[9px] tracking-widest px-3 py-1.5 border border-v-border rounded-sm text-v-muted2 hover:border-acid/40 hover:text-acid transition-all"
            >
              {uc.industry.toUpperCase().split(" ")[0]}
            </a>
          ))}
        </div>

        {/* Use case cards */}
        <div className="space-y-12">
          {USE_CASES.map((uc, i) => (
            <div key={uc.id} id={uc.id} className="border border-v-border rounded-lg overflow-hidden bg-v-bg1">
              {/* Header bar */}
              <div className="px-8 py-6 border-b border-v-border2 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[9px] text-v-muted2 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-mono text-xl font-bold tracking-tight text-foreground">{uc.industry}</h2>
                  <span className={`text-[7.5px] font-mono font-bold px-2 py-1 rounded border tracking-widest ${uc.badgeColor}`}>
                    {uc.badge}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-v-muted2 tracking-wider sm:ml-auto">{uc.tagline}</p>
              </div>

              <div className="p-8 grid grid-cols-1 lg:grid-cols-[1fr_1fr_220px] gap-8">
                {/* Description + threats */}
                <div>
                  <p className="text-[13.5px] text-v-muted font-light leading-[1.8] mb-6">{uc.description}</p>
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-red mb-3">Threat vectors</p>
                    <ul className="space-y-2">
                      {uc.threats.map((t) => (
                        <li key={t} className="flex items-start gap-2.5 font-mono text-[11px] text-v-muted">
                          <span className="text-v-red shrink-0 mt-0.5">›</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* VULNRA value */}
                <div>
                  <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-acid mb-3">How VULNRA helps</p>
                  <ul className="space-y-2">
                    {uc.vulnraValue.map((v) => (
                      <li key={v} className="flex items-start gap-2.5 font-mono text-[11px] text-v-muted">
                        <span className="text-acid shrink-0 mt-0.5">✓</span>
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Compliance + CTA */}
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-3">Compliance coverage</p>
                    <div className="flex flex-wrap gap-1.5">
                      {uc.compliance.map((c) => (
                        <span key={c} className="font-mono text-[8px] tracking-wider text-v-muted2 border border-v-border px-2 py-0.5 rounded-[2px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto">
                    <Link
                      href="/signup"
                      className="block text-center font-mono text-[10px] font-bold tracking-widest bg-acid text-black px-4 py-2.5 rounded-sm hover:opacity-90 transition-opacity"
                    >
                      START FREE SCAN →
                    </Link>
                    <Link
                      href="/pricing"
                      className="block text-center font-mono text-[9.5px] tracking-widest text-v-muted2 hover:text-acid transition-colors mt-2"
                    >
                      View pricing
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 border border-v-border rounded-lg p-10 text-center bg-v-bg1 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/30 to-transparent" />
          <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">Enterprise security</p>
          <h3 className="font-mono text-2xl font-bold text-foreground mb-4">
            Need a custom deployment or security review?
          </h3>
          <p className="text-sm text-v-muted font-light mb-8 max-w-lg mx-auto leading-relaxed">
            Enterprise plans include dedicated support, custom probe configuration, on-premises deployment, and a Data Processing Agreement. Talk to us.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/enterprise"
              className="font-mono text-[11px] font-bold tracking-widest bg-acid text-black px-6 py-3 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all"
            >
              ENTERPRISE ENQUIRY →
            </Link>
            <Link
              href="/pricing"
              className="font-mono text-[11px] tracking-widest text-v-muted2 border border-v-border px-6 py-3 rounded-sm hover:border-white/15 hover:text-v-muted transition-all"
            >
              VIEW PRICING
            </Link>
          </div>
        </div>

      </div>

      <PublicFooter />
    </div>
  );
}
