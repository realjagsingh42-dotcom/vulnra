import type { Metadata } from "next";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Security — VULNRA | How We Protect Your Data",
  description:
    "VULNRA's security practices: TLS encryption, hashed API keys, row-level security, sub-processor DPAs, responsible disclosure programme, and our path to SOC 2 Type II.",
  alternates: { canonical: "https://vulnra.ai/security" },
  openGraph: {
    title: "VULNRA Security — How We Protect Your Data",
    description: "Technical and organisational security measures protecting VULNRA users and their scan data.",
    url: "https://vulnra.ai/security",
    siteName: "VULNRA",
    type: "website",
  },
};

const CONTROLS = [
  {
    category: "Data in Transit",
    items: [
      { control: "TLS 1.2+", detail: "All traffic between clients and VULNRA endpoints is encrypted with TLS 1.2 or higher. HTTP is redirected to HTTPS. HSTS is enforced." },
      { control: "Supabase realtime over WSS", detail: "WebSocket connections (scan polling) are over wss:// — TLS-encrypted WebSocket." },
    ],
  },
  {
    category: "Data at Rest",
    items: [
      { control: "Supabase PostgreSQL", detail: "Scan results, account data, and audit logs are stored in Supabase PostgreSQL with AES-256 encryption at rest." },
      { control: "Row-level security (RLS)", detail: "Every Supabase table has RLS policies enforcing that users can only read and write their own rows. Scan data from one user is never accessible to another." },
      { control: "Redis (Upstash)", detail: "Rate-limit counters and scan job queues in Redis are ephemeral and contain no personal data beyond user IDs and counters." },
    ],
  },
  {
    category: "Authentication & API Keys",
    items: [
      { control: "Supabase Auth", detail: "Passwords are never stored in plain text. Supabase Auth uses bcrypt hashing with a per-user salt." },
      { control: "API key hashing", detail: "vk_live_ API keys are shown once at creation. We store only the SHA-256 hash. If lost, the key must be revoked and regenerated." },
      { control: "JWT session tokens", detail: "Supabase issues short-lived JWT access tokens (default 1 hour) and longer-lived refresh tokens stored in HttpOnly, Secure, SameSite=Lax cookies." },
      { control: "OAuth (GitHub, Google)", detail: "OAuth flows use Supabase Auth's PKCE implementation. We never receive or store the OAuth provider's access token." },
    ],
  },
  {
    category: "Application Security",
    items: [
      { control: "Webhook HMAC-SHA256", detail: "All outbound webhook deliveries are signed with HMAC-SHA256 using a per-endpoint secret. Recipients can verify the signature to confirm authenticity." },
      { control: "Rate limiting", detail: "SlowAPI (Redis-backed) enforces per-user, per-tier rate limits on all scan endpoints. Requests exceeding limits receive HTTP 429." },
      { control: "Input validation", detail: "All API inputs are validated using Pydantic v2 models. Invalid inputs are rejected before reaching business logic." },
      { control: "Dependency scanning", detail: "Python and Node.js dependencies are scanned for known CVEs on every push using GitHub Dependabot." },
      { control: "No stored plain-text secrets", detail: "Environment variables (API keys, Supabase credentials, Anthropic key) are injected at runtime via Railway environment variables. They are never committed to the repository." },
    ],
  },
  {
    category: "Infrastructure",
    items: [
      { control: "Railway deployment", detail: "Backend and frontend run as isolated Docker containers on Railway. Network access between services is restricted to defined internal routes." },
      { control: "Supabase managed database", detail: "Database backups are managed by Supabase with point-in-time recovery. We do not have access to the underlying database host." },
      { control: "GitHub repository security", detail: "The VULNRA source repository has branch protection on main, required PR reviews, and secret scanning enabled." },
    ],
  },
  {
    category: "Access Control",
    items: [
      { control: "Least-privilege service accounts", detail: "The FastAPI backend uses a Supabase service role key scoped to the minimum required permissions. No admin-level DB access from application code." },
      { control: "Audit logs (Enterprise)", detail: "All sensitive actions (scan created, report downloaded, API key created/revoked, member invited/removed) are written to an immutable audit_logs table." },
      { control: "Org role separation", detail: "Enterprise org roles: Admin (full access, audit log, member management) and Member (own scans only). Role changes are audit-logged." },
    ],
  },
];

const SUBPROCESSORS = [
  { name: "Supabase Inc.", purpose: "Database, authentication, storage", region: "United States", dpa: true },
  { name: "Railway Corporation", purpose: "Application hosting and deployment", region: "United States", dpa: true },
  { name: "Lemon Squeezy", purpose: "Payment processing and subscription billing", region: "United States", dpa: true },
  { name: "Resend Inc.", purpose: "Transactional email delivery", region: "United States", dpa: true },
  { name: "Anthropic, PBC", purpose: "AI Judge (Claude API) — probe response text only, no PII", region: "United States", dpa: true },
  { name: "Upstash", purpose: "Redis (rate limiting, job queues)", region: "United States", dpa: true },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-16">

          {/* Sticky sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-4">Contents</div>
              <nav className="flex flex-col gap-1">
                {[...CONTROLS.map((c) => [c.category, `#${c.category.toLowerCase().replace(/[^a-z0-9]/g, "-")}`]),
                  ["Sub-processors", "#sub-processors"],
                  ["Incident Response", "#incident-response"],
                  ["Report a Vulnerability", "#report"],
                ].map(([label, href]) => (
                  <a key={href} href={href} className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors py-1 flex items-center gap-2 group">
                    <span className="w-3 h-px bg-v-border2 group-hover:bg-acid/50 transition-colors shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main */}
          <article>
            <div className="mb-12">
              <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
                <span className="w-5 h-px bg-acid/35" />
                Trust & Security
                <span className="w-5 h-px bg-acid/35" />
              </div>
              <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-4">Security Practices</h1>
              <p className="text-[14px] text-v-muted font-light leading-[1.8]">
                VULNRA is a security product. We hold ourselves to the same standards we help you enforce on your LLM APIs. This page documents the technical and organisational measures we use to protect your data and your account.
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-10 mb-14">
              {CONTROLS.map((group) => {
                const id = group.category.toLowerCase().replace(/[^a-z0-9]/g, "-");
                return (
                  <section key={group.category} id={id}>
                    <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                      <span className="text-acid text-[13px]">//</span>
                      {group.category}
                    </h2>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={item.control} className="border border-v-border rounded-lg p-5 bg-v-bg1">
                          <p className="font-mono text-[11.5px] font-bold text-foreground mb-1.5">{item.control}</p>
                          <p className="font-mono text-[11px] text-v-muted leading-relaxed">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-8 h-px bg-v-border2" />
                  </section>
                );
              })}
            </div>

            {/* Sub-processors */}
            <section id="sub-processors" className="mb-12">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">//</span>
                Sub-processors
              </h2>
              <p className="text-[13.5px] text-v-muted font-light leading-[1.8] mb-5">
                The following third-party services process data on behalf of VULNRA. All are bound by Data Processing Agreements (DPAs) ensuring GDPR-compliant handling.
              </p>
              <div className="border border-v-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_120px_60px] gap-4 px-5 py-3 bg-white/[0.03] border-b border-v-border2 font-mono text-[8.5px] tracking-[0.18em] uppercase text-v-muted2">
                  <span>Processor</span>
                  <span>Purpose</span>
                  <span>Region</span>
                  <span>DPA</span>
                </div>
                {SUBPROCESSORS.map((sp) => (
                  <div key={sp.name} className="grid grid-cols-[1fr_1fr_120px_60px] gap-4 px-5 py-3 border-b border-v-border2 last:border-0 font-mono text-[11px]">
                    <span className="text-foreground font-bold">{sp.name}</span>
                    <span className="text-v-muted">{sp.purpose}</span>
                    <span className="text-v-muted2">{sp.region}</span>
                    <span className="text-acid">{sp.dpa ? "✓" : "—"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Incident response */}
            <section id="incident-response" className="mb-12">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">//</span>
                Incident Response
              </h2>
              <p className="text-[13.5px] text-v-muted font-light leading-[1.8]">
                In the event of a security incident affecting user data, VULNRA will:
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Notify affected users via email within 72 hours of discovery",
                  "Publish a public incident report within 7 days",
                  "Notify the relevant supervisory authority where required by GDPR or DPDP Act",
                  "Provide a root cause analysis and remediation summary",
                ].map((step) => (
                  <li key={step} className="flex items-start gap-2.5 font-mono text-[11.5px] text-v-muted">
                    <span className="text-acid shrink-0 mt-0.5">›</span>
                    {step}
                  </li>
                ))}
              </ul>
              <div className="mt-8 h-px bg-v-border2" />
            </section>

            {/* Report */}
            <section id="report">
              <h2 className="font-mono text-xl font-bold tracking-tight mb-5 flex items-center gap-3">
                <span className="text-acid text-[13px]">//</span>
                Report a Vulnerability
              </h2>
              <p className="text-[13.5px] text-v-muted font-light leading-[1.8] mb-5">
                If you have discovered a security vulnerability in VULNRA, please report it responsibly. We operate a responsible disclosure programme and commit to acknowledging all reports within 48 hours.
              </p>
              <div className="border border-acid/20 rounded-lg p-5 bg-acid/[0.03] flex flex-col gap-2">
                <p className="font-mono text-[11px] text-foreground font-bold">security@vulnra.ai</p>
                <p className="font-mono text-[10.5px] text-v-muted">PGP key and full disclosure policy available at <Link href="/responsible-disclosure" className="text-acid underline underline-offset-4">/responsible-disclosure</Link></p>
              </div>
            </section>
          </article>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
