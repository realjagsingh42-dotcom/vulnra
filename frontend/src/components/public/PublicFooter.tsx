import Link from "next/link";

// ── Column definitions ────────────────────────────────────────────────────────

const COLUMNS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Product",
    links: [
      ["Quick Scan",  "/quick-scan"],
      ["Pricing",     "/pricing"],
      ["Enterprise",  "/enterprise"],
      ["Changelog",   "/changelog"],
    ],
  },
  {
    title: "Platform",
    links: [
      ["Dashboard",     "/scanner"],
      ["Docs",          "/docs"],
      ["API Reference", "/docs/api"],
      ["Status",        "/status"],
    ],
  },
  {
    title: "Security",
    links: [
      ["OWASP LLM Top 10", "/security/owasp"],
      ["Compliance",        "/security/compliance"],
      ["Security",          "/security"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About",   "/about"],
      ["Contact", "/contact"],
      ["Sign In", "/login"],
      ["Sign Up", "/signup"],
    ],
  },
];

const LEGAL_LINKS: Array<[string, string]> = [
  ["Privacy Policy",   "/privacy"],
  ["Terms of Service", "/terms"],
  ["Acceptable Use",   "/terms"],
  ["Disclosure",       "/responsible-disclosure"],
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicFooter() {
  return (
    <>
      {/* ── Scoped styles — hover colours & responsive grid ── */}
      <style>{`
        .vf-link {
          font-family: var(--font-sans, 'DM Sans', sans-serif);
          font-size: 13px;
          color: #8A93A0;
          text-decoration: none;
          transition: color 0.15s;
          display: inline-block;
        }
        .vf-link:hover { color: #C8D0DC; }

        .vf-legal {
          font-family: var(--font-sans, 'DM Sans', sans-serif);
          font-size: 12px;
          color: #8A93A0;
          text-decoration: none;
          transition: color 0.15s;
        }
        .vf-legal:hover { color: #C8D0DC; }

        .vf-social {
          width: 32px; height: 32px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-mono, 'IBM Plex Mono', monospace);
          font-size: 11px; font-weight: 700;
          color: #8A93A0;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
          flex-shrink: 0;
        }
        .vf-social:hover { border-color: #b8ff57; color: #b8ff57; }

        /* Responsive grid breakpoints */
        .vf-grid {
          display: grid;
          grid-template-columns: 1.5fr repeat(4, 1fr);
          gap: 48px;
          margin-bottom: 48px;
        }
        @media (max-width: 1024px) {
          .vf-grid { grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
        }
        @media (max-width: 900px) {
          .vf-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
        }
        @media (max-width: 768px) {
          .vf-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
          .vf-brand { grid-column: 1 / -1; }
          .vf-bottom { flex-direction: column; align-items: flex-start; gap: 16px; }
        }
        @media (max-width: 480px) {
          .vf-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <footer
        style={{
          background: "#060608",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "64px 0 32px",
          marginTop: "80px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>

          {/* ── Top: brand + 4 link columns ─────────────────────── */}
          <div className="vf-grid">

            {/* Brand column */}
            <div className="vf-brand" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Logo */}
              <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <div
                  style={{
                    width: 24, height: 24, borderRadius: 4,
                    background: "#060608", border: "1.5px solid #b8ff57",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, animation: "neonBoxPulse 2s ease-in-out infinite",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <rect x="1"    y="1"    width="7.5" height="7.5" rx=".8" fill="#b8ff57"
                      style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0s" }} />
                    <rect x="11.5" y="1"    width="7.5" height="7.5" rx=".8" fill="#b8ff57"
                      style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.3s" }} />
                    <rect x="1"    y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
                      style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.6s" }} />
                    <rect x="11.5" y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57"
                      style={{ animation: "neonSqSeq 2.4s ease-in-out infinite 0.9s" }} />
                  </svg>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
                    fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "#ffffff",
                  }}
                >
                  VULN<span style={{ color: "#b8ff57" }}>RA</span>
                </span>
              </Link>

              {/* Tagline */}
              <p
                style={{
                  fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                  fontSize: 13, color: "#8A93A0", lineHeight: 1.6,
                  maxWidth: 200, margin: 0,
                }}
              >
                Red-team your AI.
                <br />
                Before someone else does.
              </p>

              {/* Social buttons */}
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <a
                  href="https://github.com/realjagsingh42-dotcom/vulnra-action"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="vf-social"
                >
                  GH
                </a>
                <a
                  href="https://twitter.com/vulnra_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X / Twitter"
                  className="vf-social"
                >
                  X
                </a>
              </div>
            </div>

            {/* Link columns */}
            {COLUMNS.map(col => (
              <div key={col.title}>
                <p
                  style={{
                    fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "#ffffff", marginBottom: 16, marginTop: 0,
                  }}
                >
                  {col.title}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="vf-link">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Bottom bar ──────────────────────────────────────── */}
          <div
            className="vf-bottom"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-sans, 'DM Sans', sans-serif)",
                fontSize: 12, color: "#8A93A0", margin: 0,
              }}
            >
              © 2026 VULNRA. All rights reserved.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              {LEGAL_LINKS.map(([label, href]) => (
                <Link key={label} href={href} className="vf-legal">
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}
