import Link from "next/link";
import { Shield } from "lucide-react";

export default function PublicFooter() {
  return (
    <footer className="border-t border-v-border2 px-6 md:px-12 py-10">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 rounded bg-acid flex items-center justify-center">
            <Shield className="w-2.5 h-2.5 text-black" />
          </div>
          <span className="font-mono text-sm font-bold tracking-wider">VULNRA</span>
        </Link>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {[
            ["Features", "/#features"],
            ["Pricing", "/pricing"],
            ["Investors", "/investors"],
            ["Sign In", "/login"],
            ["Sign Up", "/signup"],
            ["Privacy", "/privacy"],
            ["Terms", "/terms"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="font-mono text-[10px] tracking-widest text-v-muted2 hover:text-acid transition-colors"
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
