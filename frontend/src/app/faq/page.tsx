import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "FAQ — VULNRA | Frequently Asked Questions",
  description:
    "Answers to the most common questions about VULNRA's LLM security scanner — what it tests, how it works, pricing, compliance, and data handling.",
  alternates: { canonical: "https://vulnra.ai/faq" },
  openGraph: {
    title: "VULNRA FAQ — Frequently Asked Questions",
    description: "What does VULNRA test? How does it work? What does it cost? All your questions answered.",
    url: "https://vulnra.ai/faq",
    siteName: "VULNRA",
    type: "website",
  },
};

const FAQ_SECTIONS = [
  {
    category: "What VULNRA Tests",
    items: [
      {
        q: "What types of vulnerabilities does VULNRA detect?",
        a: "VULNRA tests for all OWASP LLM Top 10 categories including: Prompt Injection (LLM01), Insecure Output Handling (LLM02), Sensitive Information Disclosure (LLM06), Excessive Agency (LLM08), and more. Specific probe types include jailbreaks (50+ variants), encoding-based evasion (Base64, ROT13, Unicode, Morse, leetspeak), multi-turn attacks (Crescendo, GOAT, PAIR, TAP), and RAG-specific attacks (corpus poisoning, cross-tenant leakage, query injection).",
      },
      {
        q: "What LLM APIs can VULNRA scan?",
        a: "Any HTTP/HTTPS endpoint that accepts POST requests with an OpenAI-compatible messages array (application/json). This includes OpenAI, Anthropic, Google, Mistral, Llama-based custom deployments, AWS Bedrock, Azure OpenAI, and any self-hosted LLM behind an API endpoint.",
      },
      {
        q: "Does VULNRA test the model itself, or the application layer?",
        a: "Both. VULNRA probes the full stack: the system prompt and application layer that wraps the model, the model's own safety training and guardrails, and — for RAG setups — the retrieval and ingestion pipelines. The risk score reflects the combined attack surface.",
      },
      {
        q: "Can VULNRA scan models behind authentication?",
        a: "Yes. You can provide auth headers (e.g., Authorization: Bearer sk-...) in the scanner configuration. These are transmitted securely and used only for probe requests.",
      },
      {
        q: "What is the AI Judge?",
        a: "VULNRA uses Claude 3 Haiku as an independent AI Judge to evaluate each model response. The Judge classifies whether the response represents a policy violation (is_vulnerable), assigns a confidence score, and provides a reasoning summary. This reduces false positives compared to keyword-matching heuristics.",
      },
    ],
  },
  {
    category: "Pricing & Plans",
    items: [
      {
        q: "What does the free tier include?",
        a: "The free tier includes 1 real scan per day using the Garak engine, a risk score (0–10), and 1 blurred finding preview. No credit card required. It is designed for developers evaluating whether their model has obvious vulnerabilities, not for comprehensive security coverage.",
      },
      {
        q: "What does Pro add over Free?",
        a: "Pro ($49/month) adds: unlimited scans, all 4 engines (Garak, DeepTeam, PyRIT 5-converter, EasyJailbreak PAIR+CIPHER), full finding details with OWASP/MITRE mapping, PDF compliance reports, RAG security scanning, Agent security (OWASP Agentic Top 10), Sentinel monitoring (5 watches, 24h interval), and up to 20 API keys.",
      },
      {
        q: "What does Enterprise add over Pro?",
        a: "Enterprise adds: unlimited scans and API keys, all 10 PyRIT converters, EasyJailbreak TAP recipe, RAG cross-tenant leakage testing, 50 Sentinel watches with 1-hour minimum interval, org management (invite members, audit logs), EU AI Act / ISO 42001 / NIST AI RMF compliance mapping, and a Data Processing Agreement.",
      },
      {
        q: "Can I try Pro before paying?",
        a: "Reach out to sales@vulnra.ai for a trial. We also offer a 7-day refund policy on first-time purchases.",
      },
    ],
  },
  {
    category: "Security & Data",
    items: [
      {
        q: "Does VULNRA store my LLM's responses?",
        a: "Yes. Probe responses are stored and linked to your scan record in Supabase, secured with row-level security so only your account can access them. They are retained for the lifetime of your account plus 30 days after deletion. Enterprise customers can request a Data Retention schedule in their DPA.",
      },
      {
        q: "Is the content sent to Anthropic (for the AI Judge)?",
        a: "Only probe response text is sent to the Claude API for judgment. No account information, API credentials, or personal data is included in Anthropic API calls. We have a DPA with Anthropic.",
      },
      {
        q: "How are API keys stored?",
        a: "vk_live_ API keys are shown once at creation time. We store only the SHA-256 hash. If the key is lost, it must be revoked and a new one generated. Keys are never stored in logs or plain-text fields.",
      },
      {
        q: "What compliance standards does VULNRA itself meet?",
        a: "VULNRA applies GDPR-compliant data handling, DPAs with all sub-processors, DPDP Act 2023 compliance for Indian users, and is on a path to SOC 2 Type II by end of 2026. See our Security page for full technical details.",
      },
    ],
  },
  {
    category: "Integration & CI/CD",
    items: [
      {
        q: "How do I add VULNRA to GitHub Actions?",
        a: "Create a VULNRA_API_KEY secret in your repository, then use curl to POST to /scan, poll GET /scan/{id} until status is complete, and fail the job if critical_count > 0. Full example at /integrations.",
      },
      {
        q: "What rate limits apply to the API?",
        a: "Free: 1 request/minute. Pro: 10 requests/minute. Enterprise: 100 requests/minute. These limits apply to scan endpoints. There are no limits on GET /scan/{id} polling.",
      },
      {
        q: "Can I use VULNRA for automated regression testing?",
        a: "Yes — this is a core use case. Combine Sentinel (for continuous monitoring) with the Scan Diff API (GET /scan/{id}/diff?baseline={id}) to track regressions across model versions, system prompt changes, and deployments.",
      },
    ],
  },
  {
    category: "Legal & Compliance",
    items: [
      {
        q: "Can I scan an LLM API that I don't own?",
        a: "No. VULNRA may only be used to scan LLM endpoints that you own, operate, or have explicit written permission to test. Scanning systems without authorisation is a violation of our Terms of Service and may be illegal.",
      },
      {
        q: "Do VULNRA scan results constitute legal compliance evidence?",
        a: "VULNRA PDF reports are designed as evidence artefacts for technical documentation under EU AI Act Art. 11 and similar frameworks. However, scan results do not constitute legal or regulatory advice. You should consult a qualified compliance professional for formal assessments.",
      },
      {
        q: "Is VULNRA available for EU/EEA users under GDPR?",
        a: "Yes. Data transfers to US sub-processors rely on Standard Contractual Clauses. Enterprise customers can request a DPA. VULNRA respects all GDPR data subject rights — see our Privacy Policy.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-16">

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-4">Categories</div>
              <nav className="flex flex-col gap-1">
                {FAQ_SECTIONS.map(({ category }) => (
                  <a key={category} href={`#${category.toLowerCase().replace(/\s+/g, "-")}`} className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors py-1 flex items-center gap-2 group">
                    <span className="w-3 h-px bg-v-border2 group-hover:bg-acid/50 transition-colors shrink-0" />
                    {category}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main */}
          <div>
            <div className="mb-12">
              <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
                <span className="w-5 h-px bg-acid/35" />
                FAQ
                <span className="w-5 h-px bg-acid/35" />
              </div>
              <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked<br /><span style={{ color: "#b8ff57" }}>Questions</span></h1>
              <p className="text-[14px] text-v-muted font-light leading-[1.8] max-w-xl">
                Everything you need to know about VULNRA. Can&apos;t find your answer?{" "}
                <a href="mailto:support@vulnra.ai" className="text-acid underline underline-offset-4">Email us</a>.
              </p>
            </div>

            <div className="space-y-14">
              {FAQ_SECTIONS.map(({ category, items }) => (
                <section key={category} id={category.toLowerCase().replace(/\s+/g, "-")}>
                  <h2 className="font-mono text-base font-bold tracking-wider text-acid mb-5 flex items-center gap-3">
                    <span className="w-4 h-px bg-acid/40" />
                    {category.toUpperCase()}
                  </h2>
                  <div className="space-y-4">
                    {items.map(({ q, a }) => (
                      <details key={q} className="group border border-v-border rounded-lg bg-v-bg1 overflow-hidden">
                        <summary className="flex items-start justify-between gap-4 px-6 py-5 cursor-pointer list-none font-mono text-[12px] font-bold text-foreground leading-snug select-none hover:text-acid transition-colors">
                          {q}
                          <span className="shrink-0 text-v-muted2 group-open:text-acid text-lg leading-none transition-colors">+</span>
                        </summary>
                        <div className="px-6 pb-5 font-mono text-[11.5px] text-v-muted leading-relaxed border-t border-v-border2 pt-4">
                          {a}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-16 border border-v-border rounded-lg p-8 bg-v-bg1 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/30 to-transparent" />
              <p className="font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-3">Still have questions?</p>
              <p className="font-mono text-sm text-v-muted mb-5">Email <a href="mailto:support@vulnra.ai" className="text-acid">support@vulnra.ai</a> · Enterprise enquiries: <a href="mailto:sales@vulnra.ai" className="text-acid">sales@vulnra.ai</a></p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup" className="font-mono text-[10.5px] font-bold tracking-widest bg-acid text-black px-6 py-2.5 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all">
                  START FREE SCAN →
                </Link>
                <Link href="/docs" className="font-mono text-[10.5px] tracking-widest text-v-muted2 border border-v-border px-6 py-2.5 rounded-sm hover:border-white/15 hover:text-v-muted transition-all">
                  READ THE DOCS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
