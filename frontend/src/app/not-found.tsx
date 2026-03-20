import Link from "next/link";
import { Terminal } from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-15%] w-[500px] h-[500px] bg-acid/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] bg-v-red/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Scan-line texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
        }}
      />

      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <Link href="/" className="inline-flex mb-12"><VulnraLogo /></Link>

        {/* Terminal card */}
        <div className="border border-v-border2 rounded-xl overflow-hidden bg-[#0a0a0c] mb-10 text-left">
          {/* Terminal bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-v-border2 bg-white/[0.02]">
            <div className="w-2.5 h-2.5 rounded-full bg-v-red/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-acid/60" />
            <span className="font-mono text-[10px] tracking-widest text-v-muted2 ml-2 flex items-center gap-1.5">
              <Terminal className="w-3 h-3" /> vulnra-scanner — bash
            </span>
          </div>

          {/* Terminal content */}
          <div className="p-5 font-mono text-[13px] leading-[1.9] space-y-1">
            <div>
              <span className="text-acid">$</span>{" "}
              <span className="text-v-muted">vulnra scan --url current_page</span>
            </div>
            <div className="text-v-muted2">
              [INFO] Initializing probe suite...
            </div>
            <div className="text-v-muted2">
              [WARN] Target endpoint returned HTTP{" "}
              <span className="text-v-red font-bold">404</span>
            </div>
            <div className="text-v-muted2">
              [INFO] Probe halted — resource not found
            </div>
            <div className="mt-3">
              <span className="text-acid">$</span>{" "}
              <span className="text-white">
                echo "This page does not exist"
              </span>
            </div>
            <div className="text-acid">
              This page does not exist
              <span className="inline-block w-2 h-4 bg-acid ml-1 align-middle animate-pulse" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-3">
          <span className="font-mono text-[80px] md:text-[100px] font-bold leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/60 to-white/10 select-none">
            404
          </span>
        </div>
        <p className="font-mono text-[14px] text-v-muted mb-8 leading-relaxed">
          The page you're looking for has been moved, deleted, or never existed.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-acid text-black font-mono text-[12px] tracking-widest uppercase px-6 py-3 rounded-lg font-bold hover:bg-acid/90 transition-colors w-full sm:w-auto justify-center"
          >
            ← Back to Home
          </Link>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-2 border border-v-border2 text-v-muted font-mono text-[12px] tracking-widest uppercase px-6 py-3 rounded-lg hover:border-acid/30 hover:text-white transition-colors w-full sm:w-auto justify-center"
          >
            Open Scanner
          </Link>
        </div>

        {/* Help links */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            { href: "/docs", label: "API Docs" },
            { href: "/pricing", label: "Pricing" },
            { href: "/login", label: "Sign In" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] text-v-muted2 hover:text-acid transition-colors tracking-wider"
            >
              {l.label} →
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
