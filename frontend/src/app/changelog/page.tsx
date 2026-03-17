import type { Metadata } from "next";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";

export const metadata: Metadata = {
  title: "Changelog — VULNRA",
  description: "Full version history for the VULNRA AI security scanning platform.",
};

/* ─── Release data ──────────────────────────────────────────────────────────── */
const RELEASES = [
  {
    version: "v0.9.0",
    date: "2026-03-18",
    tag: "latest",
    tagColor: "acid",
    title: "Custom Probe Config, Keyboard Shortcuts & Mobile Dashboard",
    desc: "Full custom probe configuration with presets and per-category checklist, Cmd+K URL focus, severity filter keyboard shortcuts, polished empty states, and a fully mobile-responsive scanner dashboard.",
    features: [
      { cat: "Custom Probes (S1-06)", items: [
        "GET /api/probes — tier-filtered PROBE_CATALOGUE + DEEPTEAM_CATALOGUE",
        "ScanRequest accepts optional probes[] and vulnerability_types[]",
        "Advanced Config panel: Full Sweep / OWASP Top 10 / Jailbreaks Only / Compliance Audit presets",
        "Pro: category-level probe checklist; Enterprise: per-probe granularity",
        "DeepTeam vuln type checklist for Pro+ (13 types across all categories)",
      ]},
      { cat: "UX Polish", items: [
        "Cmd/Ctrl+K → focus URL input from anywhere in the dashboard",
        "Keys 1/2/3/4 → filter findings by HIGH / MEDIUM / LOW / ALL",
        "FindingsPanel: full empty state with ShieldCheck for zero-vulnerability scans",
        "History page: rich empty state with scan-line icon and CTA",
        "Mobile auto-switch: CONFIG → TERMINAL on scan start, TERMINAL → FINDINGS on complete",
      ]},
      { cat: "Mobile Responsive", items: [
        "3-column scanner grid collapses to tab switcher on mobile (CONFIG | TERMINAL | FINDINGS)",
        "Nav links hidden on mobile to prevent overflow",
        "User email hidden on small screens; VULNRA logo shortens to just brand name",
        "All three panels accessible via bottom tab bar on mobile",
      ]},
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-03-18",
    tag: null,
    tagColor: null,
    title: "Analytics, Compliance Explorer & Content Pages",
    desc: "Full-platform analytics dashboard with 30-day risk trend charts, compliance reference explorer (OWASP / MITRE / EU AI Act / NIST), changelog, and about page.",
    features: [
      { cat: "Analytics", items: [
        "GET /api/analytics/summary — aggregated posture endpoint",
        "/analytics dashboard — 30-day SVG risk trend, category bars, stat cards",
        "Score delta (last scan vs rolling average)",
      ]},
      { cat: "Compliance", items: [
        "/compliance — full OWASP LLM Top 10 (2025) reference with probe mapping",
        "MITRE ATLAS — 8 tactics with techniques listed",
        "EU AI Act — 6 key articles with VULNRA coverage",
        "NIST AI RMF — GOVERN / MAP / MEASURE / MANAGE functions",
      ]},
      { cat: "Content", items: [
        "/changelog — this page",
        "/about — mission, stack, and technology choices",
        "DOCS + CHANGELOG + ABOUT links in PublicNav, PublicFooter, ScannerLayout",
      ]},
    ],
  },
  {
    version: "v0.7.0",
    date: "2026-03-18",
    tag: null,
    tagColor: null,
    title: "Account Settings, Webhooks & API Docs",
    desc: "Complete user settings system, HMAC-signed webhook delivery, full API reference documentation, and branded 404/500 pages.",
    features: [
      { cat: "Settings", items: [
        "/settings/account — display name, email, password, danger zone",
        "/settings/notifications — alert threshold slider, HIGH/scan-complete toggles",
        "/settings/webhooks — create/list/test/delete, signature verification snippet",
        "Sidebar SettingsShell component shared across all settings pages",
      ]},
      { cat: "Webhooks Backend", items: [
        "HMAC-SHA256 signed payloads via X-VULNRA-Signature header",
        "Events: scan.complete, sentinel.alert, scan.failed",
        "Tier limits: Pro 3 endpoints, Enterprise 20",
        "POST /api/webhooks/{id}/test — live delivery test",
      ]},
      { cat: "Developer", items: [
        "/docs — full API reference with curl + Python examples",
        "All endpoints documented with auth requirements and tier gating",
        "Error codes table, rate limits table",
        "Custom branded 404 and 500 error pages",
      ]},
    ],
  },
  {
    version: "v0.6.0",
    date: "2026-03-15",
    tag: null,
    tagColor: null,
    title: "Website Redesign — Landing, Nav & Public Pages",
    desc: "Full marketing site rewrite. New landing page with four scrolling scan-surface sections, shared PublicNav/PublicFooter, and all legal + investor pages.",
    features: [
      { cat: "Landing", items: [
        "Hero section with animated terminal probe simulation",
        "LLM API / Agent Security / RAG Security / Sentinel scrolling sections",
        "Developer API code block, pricing preview, final CTA",
      ]},
      { cat: "Pages", items: [
        "/pricing — comparison table updated for v0.6 features",
        "/privacy — full Privacy Policy with GDPR + India DPDP rights",
        "/terms — full Terms of Service, 13 sections",
        "/investors — platform metrics, differentiators, market opportunity",
        "Login + Signup minimal auth nav",
      ]},
    ],
  },
  {
    version: "v0.5.0 + v0.5.1",
    date: "2026-03-12",
    tag: null,
    tagColor: null,
    title: "Enterprise Foundation — Sprints 5–7",
    desc: "PyRIT encoding converters, EasyJailbreak attack recipes, full RAG Security Scanner, and enterprise org management with audit logs.",
    features: [
      { cat: "Sprint 5 — Engine Depth", items: [
        "PyRIT converter engine — 10 encoding transformations (Base64, ROT13, Morse, Binary, Unicode…)",
        "EasyJailbreak — PAIR, TAP, CIPHER recipes using Claude Haiku as attacker",
        "Open-source probe datasets — JailbreakBench (20), AdvBench (50), GPTFuzzer (25)",
        "Pro: 5 converters + PAIR + CIPHER; Enterprise: all 10 + TAP",
      ]},
      { cat: "Sprint 6 — RAG Scanner", items: [
        "RAG-01 Corpus Poisoning — 5 payload formats, VULNRA_CANARY",
        "RAG-02 Cross-Tenant Leakage — Enterprise tier",
        "RAG-03 Query Injection — 5 injection variants",
        "RAG-04 Unauth Ingestion — all tiers",
        "RAG-05 Embedding Leakage — Pro+",
        "/rag-scanner UI with form, polling, results panel",
      ]},
      { cat: "Sprint 7 — Enterprise", items: [
        "Org management — POST/GET /api/org, invite, members, remove",
        "Audit log — log_action() for scan.created, report.downloaded, share.created etc.",
        "DB migration — organizations, organization_members, invites, audit_logs tables",
        "/org enterprise dashboard",
      ]},
    ],
  },
  {
    version: "v0.4.0",
    date: "2026-03-08",
    tag: null,
    tagColor: null,
    title: "API Keys & Sentinel Monitoring",
    desc: "Programmatic API access with vk_live_ keys and continuous LLM monitoring with risk-spike alerting.",
    features: [
      { cat: "API Keys", items: [
        "POST/GET/DELETE /api/keys — vk_live_ format, SHA-256 hash",
        "Tier limits: Free 3, Pro 20, Enterprise unlimited",
        "security.py accepts API keys as JWT alternative",
        "/settings/api-keys with create/reveal-once/copy/revoke + code examples",
      ]},
      { cat: "Sentinel", items: [
        "POST/GET/DELETE /api/monitor — scheduled re-scan watches",
        "Celery beat — check_due_sentinel_watches every 15 min",
        "Alerts via Resend email on >20pp risk spike or new HIGH finding",
        "Pro: 5 watches, 24h min; Enterprise: 50 watches, 1h min",
        "/monitor page with add/delete, status dots, risk badge",
      ]},
    ],
  },
  {
    version: "v0.3.0",
    date: "2026-03-03",
    tag: null,
    tagColor: null,
    title: "Billing, Reports & Scan Sharing",
    desc: "Lemon Squeezy billing integration, PDF report generation, paginated scan history, deep-link navigation, and public scan sharing.",
    features: [
      { cat: "Billing", items: [
        "Lemon Squeezy checkout + webhook (tier updates)",
        "GET /billing/subscription, POST /billing/checkout, POST /billing/cancel",
        "/billing checkout page, /billing/manage, /billing/success",
      ]},
      { cat: "Reports & Sharing", items: [
        "GET /api/scan/{id}/report — ReportLab PDF with risk score, findings, compliance",
        "POST /api/scan/{id}/share — shareable token, 30-day expiry",
        "GET /report/[token] — public report page (no auth required)",
        "Scan history page (/scanner/history) with PDF download + compare checkboxes",
        "Scan diff page (/scanner/diff) — side-by-side comparison",
      ]},
    ],
  },
  {
    version: "v0.2.0",
    date: "2026-02-22",
    tag: null,
    tagColor: null,
    title: "Multi-Turn Attacks & MCP Scanner",
    desc: "Advanced multi-turn jailbreak attacks (Crescendo, GOAT) and full MCP server security scanning.",
    features: [
      { cat: "Multi-Turn", items: [
        "POST /api/multi-turn-scan — Crescendo + GOAT attack strategies",
        "Claude Haiku as attacker model, up to 10 turns",
        "Conversation replay in the scanner findings panel",
      ]},
      { cat: "MCP Scanner", items: [
        "POST /api/scan/mcp — tool poisoning, privilege escalation, rug-pull probes",
        "/mcp-scanner UI with WebSocket/stdio/HTTP transport support",
        "AG-01 through AG-10 OWASP Agentic Top 10 coverage",
      ]},
    ],
  },
  {
    version: "v0.1.0",
    date: "2026-02-10",
    tag: "initial",
    tagColor: "blue",
    title: "Core Platform Launch",
    desc: "Initial release — multi-engine LLM vulnerability scanner, AI Judge, Supabase auth, tier-based rate limiting, Railway deployment.",
    features: [
      { cat: "Scan Engines", items: [
        "Garak 0.14.0 subprocess integration (DAN, AutoDAN, prompt injection probes)",
        "DeepTeam 0.1.0 SDK — 40+ vulnerability types",
        "Claude 3 Haiku AI Judge — is_vulnerable, confidence, reasoning per finding",
        "Multi-engine result merging + deduplication",
      ]},
      { cat: "Platform", items: [
        "Supabase Auth — email/password, GitHub OAuth, Google OAuth",
        "SlowAPI tier-based rate limiting (1/10/100 req/min)",
        "OWASP LLM Top 10 + MITRE ATLAS + EU AI Act compliance mappings",
        "Cyberpunk scanner dashboard with real-time polling",
        "Railway + Docker 3-layer build, GitHub CI/CD",
      ]},
    ],
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <div className="max-w-[900px] mx-auto px-6 md:px-12 pt-28 pb-20">
        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2.5 font-mono text-[9px] tracking-[0.24em] uppercase text-acid mb-4">
            <span className="w-5 h-px bg-acid/35" />
            What's new
            <span className="w-5 h-px bg-acid/35" />
          </div>
          <h1 className="font-mono text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Changelog
          </h1>
          <p className="font-mono text-[13px] text-v-muted">
            Full version history for the VULNRA platform, newest first.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-v-border2" />

          <div className="space-y-12">
            {RELEASES.map((r) => (
              <div key={r.version} className="relative pl-9">
                {/* Dot */}
                <div className={`absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full border-2 flex items-center justify-center
                  ${r.tag === "latest" ? "border-acid bg-acid/20" : "border-v-border2 bg-background"}`}
                >
                  <div className={`w-2 h-2 rounded-full ${r.tag === "latest" ? "bg-acid" : "bg-v-border2"}`} />
                </div>

                {/* Content */}
                <div>
                  {/* Version + date */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="font-mono text-lg font-bold text-white">{r.version}</span>
                    {r.tag && (
                      <span className={`font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 rounded border
                        ${r.tag === "latest" ? "border-acid/40 text-acid bg-acid/10" : "border-[#4db8ff]/30 text-[#4db8ff] bg-[#4db8ff]/10"}`}
                      >
                        {r.tag}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-v-muted2">{r.date}</span>
                  </div>

                  {/* Title + desc */}
                  <h2 className="font-mono text-[15px] font-semibold text-white mb-2">{r.title}</h2>
                  <p className="font-mono text-[13px] text-v-muted leading-relaxed mb-5">{r.desc}</p>

                  {/* Feature groups */}
                  <div className="space-y-4">
                    {r.features.map((group) => (
                      <div key={group.cat}>
                        <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-acid/70 mb-2">
                          {group.cat}
                        </div>
                        <ul className="space-y-1">
                          {group.items.map((item) => (
                            <li key={item} className="flex items-start gap-2 font-mono text-[12px] text-v-muted2 leading-relaxed">
                              <span className="text-acid/50 shrink-0 mt-0.5">+</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
