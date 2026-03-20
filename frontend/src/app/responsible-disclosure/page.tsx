import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Responsible Disclosure — VULNRA",
  description:
    "VULNRA's responsible disclosure policy for reporting security vulnerabilities. We acknowledge all reports within 48 hours and offer recognition for qualifying disclosures.",
  alternates: { canonical: "https://vulnra.ai/responsible-disclosure" },
};

const SCOPE = [
  { item: "vulnra.ai — main web application", inScope: true },
  { item: "api.vulnra.ai — REST API endpoints", inScope: true },
  { item: "Supabase Auth integration (auth flows, token handling)", inScope: true },
  { item: "API key issuance, storage, and validation", inScope: true },
  { item: "Webhook signature verification", inScope: true },
  { item: "PDF report generation pipeline", inScope: true },
  { item: "Third-party services (Supabase, Railway, Lemon Squeezy)", inScope: false },
  { item: "Denial of service attacks", inScope: false },
  { item: "Social engineering of VULNRA staff", inScope: false },
  { item: "Physical access attacks", inScope: false },
  { item: "Automated scanning without prior notification", inScope: false },
];

const PROCESS = [
  { step: "01", title: "Submit your report", detail: "Email security@vulnra.ai with a clear description of the vulnerability, steps to reproduce, and your assessment of impact. Include any proof-of-concept code or screenshots." },
  { step: "02", title: "Acknowledgement", detail: "We will acknowledge receipt of your report within 48 hours and assign it an internal tracking ID. We will confirm whether the vulnerability is in scope." },
  { step: "03", title: "Investigation", detail: "Our team will investigate and validate the report. We may contact you for additional information. We aim to provide an initial assessment within 7 business days." },
  { step: "04", title: "Remediation", detail: "We will work to remediate confirmed vulnerabilities as quickly as possible. Critical vulnerabilities will be addressed within 7 days; High within 30 days; Medium/Low within 90 days." },
  { step: "05", title: "Disclosure", detail: "We coordinate disclosure timing with the reporter. Our default is a 90-day disclosure window from the date of acknowledgement. We will credit reporters in our public disclosure unless anonymity is requested." },
];

const SEVERITY = [
  { level: "CRITICAL", examples: "Authentication bypass, account takeover, RCE, unrestricted data exfiltration", sla: "7 days", cls: "text-[#ff4444] border-[#ff4444]/40 bg-[#ff4444]/8" },
  { level: "HIGH", examples: "Privilege escalation, cross-tenant data leakage, significant PII exposure", sla: "30 days", cls: "text-v-red border-v-red/40 bg-v-red/8" },
  { level: "MEDIUM", examples: "CSRF, SSRF, limited information disclosure, insecure direct object references", sla: "90 days", cls: "text-v-amber border-v-amber/40 bg-v-amber/8" },
  { level: "LOW", examples: "Missing security headers, low-impact information leakage, minor misconfigurations", sla: "90 days", cls: "text-[#4db8ff] border-[#4db8ff]/40 bg-[#4db8ff]/8" },
];

export default function ResponsibleDisclosurePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-16">

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-4">Contents</div>
              <nav className="flex flex-col gap-1">
                {[
                  ["Our Commitment", "#commitment"],
                  ["Scope", "#scope"],
                  ["Disclosure Process", "#process"],
                  ["Severity & SLAs", "#severity"],
                  ["Safe Harbour", "#safe-harbour"],
                  ["Recognition", "#recognition"],
                  ["Contact", "#contact"],
                ].map(([label, href]) => (
                  <a key={href} href={href} className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors py-1 flex items-center gap-2 group">
                    <span className="w-3 h-px bg-v-border2 group-hover:bg-acid/50 transition-colors shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>

              <div className="mt-8 border border-acid/20 rounded-lg p-4 bg-acid/5">
                <p className="font-mono text-[8.5px] tracking-widest uppercase text-acid mb-2">Report a bug</p>
                <p className="font-mono text-[10px] text-v-muted mb-3 leading-relaxed">Found a vulnerability? Email us directly.</p>
                <a href="mailto:security@vulnra.ai" className="block text-center font-mono text-[9px] font-bold tracking-widest bg-acid text-black px-3 py-2 rounded-sm hover:opacity-90 transition-opacity">
                  CONTACT SECURITY →
                </a>
              </div>
            </div>
          </aside>

          {/* Main */}
          <article className="space-y-12">
            <div>
              <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
                <span className="w-5 h-px bg-acid/35" />
                Security
                <span className="w-5 h-px bg-acid/35" />
              </div>
              <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-4">Responsible Disclosure</h1>
              <p className="text-[14px] text-v-muted font-light leading-[1.8]">
                VULNRA is a security product and we take the security of our platform seriously. We welcome reports from the security community and are committed to working collaboratively with researchers to protect our users.
              </p>
            </div>

            {/* Commitment */}
            <section id="commitment">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">01</span>
                Our Commitment
              </h2>
              <div className="space-y-2">
                {[
                  "We will acknowledge your report within 48 hours",
                  "We will not pursue legal action against researchers acting in good faith under this policy",
                  "We will keep you informed of our investigation and remediation progress",
                  "We will credit you in our public disclosure (unless you request anonymity)",
                  "We will work to remediate confirmed vulnerabilities within the SLAs below",
                  "We will be transparent about our security posture and limitations",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 font-mono text-[12px] text-v-muted">
                    <span className="text-acid shrink-0 mt-0.5">✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Scope */}
            <section id="scope">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">02</span>
                Scope
              </h2>
              <div className="border border-v-border rounded-lg overflow-hidden">
                {SCOPE.map((s) => (
                  <div key={s.item} className="flex items-center gap-3 px-5 py-3 border-b border-v-border2 last:border-0">
                    <span className={`font-mono text-sm shrink-0 ${s.inScope ? "text-acid" : "text-v-red"}`}>
                      {s.inScope ? "✓" : "✗"}
                    </span>
                    <span className="font-mono text-[11.5px] text-v-muted">{s.item}</span>
                    <span className={`ml-auto font-mono text-[8px] tracking-widest px-1.5 py-0.5 rounded border ${s.inScope ? "text-acid border-acid/30" : "text-v-red border-v-red/30"}`}>
                      {s.inScope ? "IN SCOPE" : "OUT OF SCOPE"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Process */}
            <section id="process">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">03</span>
                Disclosure Process
              </h2>
              <div className="space-y-4">
                {PROCESS.map((step) => (
                  <div key={step.step} className="flex gap-5 border border-v-border rounded-lg p-5 bg-v-bg1">
                    <span className="font-mono text-[22px] font-bold text-acid/30 shrink-0 leading-none">{step.step}</span>
                    <div>
                      <p className="font-mono text-[11.5px] font-bold text-foreground mb-1.5">{step.title}</p>
                      <p className="font-mono text-[11px] text-v-muted leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Severity */}
            <section id="severity">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">04</span>
                Severity & Remediation SLAs
              </h2>
              <div className="space-y-3">
                {SEVERITY.map((s) => (
                  <div key={s.level} className="border border-v-border rounded-lg p-5 bg-v-bg1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className={`shrink-0 text-[8px] font-mono font-bold px-2 py-1 rounded border tracking-widest ${s.cls}`}>
                      {s.level}
                    </span>
                    <p className="font-mono text-[11px] text-v-muted flex-1">{s.examples}</p>
                    <span className="font-mono text-[10px] text-v-muted2 shrink-0">SLA: <span className="text-foreground">{s.sla}</span></span>
                  </div>
                ))}
              </div>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Safe harbour */}
            <section id="safe-harbour">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">05</span>
                Safe Harbour
              </h2>
              <p className="text-[13.5px] text-v-muted font-light leading-[1.8]">
                We will not pursue legal action against security researchers who comply with this policy. To qualify for safe harbour, your research must:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Avoid accessing, modifying, or deleting data that does not belong to you",
                  "Not perform denial-of-service attacks or automated scanning without prior consent",
                  "Not exploit the vulnerability beyond what is necessary to demonstrate its existence",
                  "Report the vulnerability to us before disclosing it publicly",
                  "Not conduct research on production systems belonging to our customers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 font-mono text-[12px] text-v-muted">
                    <span className="text-acid shrink-0 mt-0.5">›</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Recognition */}
            <section id="recognition">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">06</span>
                Recognition
              </h2>
              <p className="text-[13.5px] text-v-muted font-light leading-[1.8]">
                We publicly credit researchers who responsibly disclose qualifying vulnerabilities (with their permission). Researchers who find CRITICAL or HIGH severity vulnerabilities will be acknowledged in our security changelog.
              </p>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Contact */}
            <section id="contact">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">07</span>
                Contact
              </h2>
              <div className="border border-acid/20 rounded-lg p-6 bg-acid/[0.03]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-1">Security email</p>
                    <a href="mailto:security@vulnra.ai" className="font-mono text-[12px] text-acid">security@vulnra.ai</a>
                  </div>
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-1">Response time</p>
                    <p className="font-mono text-[12px] text-foreground">Within 48 hours</p>
                  </div>
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-1">Encryption</p>
                    <p className="font-mono text-[11px] text-v-muted">PGP key available on request</p>
                  </div>
                  <div>
                    <p className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-1">Disclosure window</p>
                    <p className="font-mono text-[12px] text-foreground">90 days (default)</p>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
