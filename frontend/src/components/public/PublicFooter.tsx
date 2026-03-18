import Link from "next/link";
import { Shield } from "lucide-react";

const FOOTER_LINKS = [
  ["Features", "/#features"],
  ["Pricing", "/pricing"],
  ["Docs", "/docs"],
  ["Compliance", "/compliance"],
  ["Status", "/status"],
  ["Compare", "/compare"],
  ["EU AI Act", "/eu-ai-act"],
  ["DPDP", "/dpdp"],
  ["About", "/about"],
  ["Sign In", "/login"],
  ["Sign Up", "/signup"],
  ["Terms", "/terms"],
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-v-border2 px-4 sm:px-6 md:px-12 py-10">
      <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 rounded bg-acid flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 text-black" />
          </div>
          <span className="font-mono text-sm font-bold tracking-wider">VULNRA</span>
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
