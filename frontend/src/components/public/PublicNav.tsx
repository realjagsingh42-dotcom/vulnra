"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Menu, X } from "lucide-react";

export default function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-6 md:px-10 transition-all duration-300 ${
        scrolled
          ? "bg-[#060608]/90 backdrop-blur-sm border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-6 h-6 rounded bg-acid flex items-center justify-center group-hover:shadow-[0_0_12px_rgba(184,255,87,0.5)] transition-all">
          <Shield className="w-3 h-3 text-black" />
        </div>
        <span className="font-mono text-sm font-bold tracking-wider">
          VULNRA
        </span>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          href="/#features"
          className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
        >
          FEATURES
        </Link>
        <Link
          href="/pricing"
          className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
        >
          PRICING
        </Link>
        <Link
          href="/login"
          className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
        >
          SIGN IN
        </Link>
        <Link
          href="/signup"
          className="font-mono text-[10.5px] font-semibold tracking-widest bg-acid text-black px-4 py-2 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(184,255,87,0.28)] transition-all"
        >
          START FREE
        </Link>
      </div>

      {/* Mobile Toggle */}
      <button
        className="md:hidden text-v-muted hover:text-acid transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-14 inset-x-0 bg-[#0a0b0f]/95 backdrop-blur-sm border-b border-v-border2 flex flex-col p-6 gap-5 md:hidden">
          <Link
            href="/#features"
            className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            FEATURES
          </Link>
          <Link
            href="/pricing"
            className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            PRICING
          </Link>
          <Link
            href="/login"
            className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            SIGN IN
          </Link>
          <Link
            href="/signup"
            className="font-mono text-[10.5px] font-semibold tracking-widest bg-acid text-black px-4 py-2.5 rounded-sm text-center"
            onClick={() => setMenuOpen(false)}
          >
            START FREE
          </Link>
        </div>
      )}
    </nav>
  );
}
