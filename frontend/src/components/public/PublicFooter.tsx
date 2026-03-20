import Link from "next/link";

const FOOTER_LINKS = [
  ["Features", "/#features"],
  ["Pricing", "/pricing"],
  ["Enterprise", "/enterprise"],
  ["Use Cases", "/use-cases"],
  ["Blog", "/blog"],
  ["Docs", "/docs"],
  ["Integrations", "/integrations"],
  ["FAQ", "/faq"],
  ["Roadmap", "/roadmap"],
  ["Changelog", "/changelog"],
  ["OWASP LLM", "/owasp-llm"],
  ["Vuln DB", "/vuln-db"],
  ["Compliance", "/compliance"],
  ["Compare", "/compare"],
  ["EU AI Act", "/eu-ai-act"],
  ["DPDP", "/dpdp"],
  ["Status", "/status"],
  ["About", "/about"],
  ["Sign In", "/login"],
  ["Sign Up", "/signup"],
  ["Security", "/security"],
  ["Disclosure", "/responsible-disclosure"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-v-border2 px-4 sm:px-6 md:px-12 py-10">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div style={{
            width: 24, height: 24, borderRadius: 4,
            background: "#060608", border: "1.5px solid #b8ff57",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, animation: "neonBoxPulse 2s ease-in-out infinite",
          }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
              <rect x="1" y="1" width="7.5" height="7.5" rx=".8" fill="#b8ff57" />
              <rect x="11.5" y="1" width="7.5" height="7.5" rx=".8" fill="#b8ff57" />
              <rect x="1" y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57" />
              <rect x="11.5" y="11.5" width="7.5" height="7.5" rx=".8" fill="#b8ff57" />
            </svg>
          </div>
          <span className="font-mono text-sm font-bold tracking-wider">
            VULN<span style={{color:"#b8ff57"}}>RA</span>
          </span>
        </Link>

        {/* Links — 3-col grid on mobile, flex-wrap on desktop */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:gap-4 w-full max-w-2xl">
          {FOOTER_LINKS.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="font-mono text-[10px] tracking-widest text-v-muted2 hover:text-acid transition-colors text-center"
            >
              {label.toUpperCase()}
            </Link>
          ))}
        </div>

        {/* Copyright */}
        <div className="font-mono text-[9px] text-v-muted2 tracking-wider text-center">
          © 2026 VULNRA. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
}
