"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  Loader2, AlertTriangle, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

/* ── Brand SVG icons ── */
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

/* ── OAuth button with its own loading state ── */
function OAuthButton({
  provider,
  label,
}: {
  provider: "github" | "google";
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/scanner` },
    });
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className={cn(
        "group flex items-center justify-center gap-2.5 border rounded-sm py-2.5 text-[10px] font-mono tracking-widest transition-all duration-200",
        provider === "github"
          ? "bg-white/5 border-white/10 text-foreground hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)]"
          : "bg-white/5 border-white/10 text-foreground hover:bg-[#4285F4]/10 hover:border-[#4285F4]/30 hover:shadow-[0_0_12px_rgba(66,133,244,0.15)]",
        loading && "opacity-60 cursor-not-allowed"
      )}
    >
      {loading
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : provider === "google" ? <GoogleIcon /> : <GitHubIcon />
      }
      <span className="group-hover:tracking-[0.15em] transition-all duration-200">{label}</span>
    </button>
  );
}

/* ── Main form ── */
export default function LoginForm({ message }: { message?: string }) {
  const router = useRouter();
  const [showPw, setShowPw]   = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);

    const form     = e.currentTarget;
    const email    = (form.elements.namedItem("email")    as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    // Session cookies are now written to document.cookie by @supabase/ssr.
    // router.push sends them with the next request so the server can read them.
    router.push("/scanner");
    router.refresh();
  };

  return (
    <div className="card w-full max-w-[460px] bg-v-bg1 border border-v-border rounded-lg relative overflow-hidden z-10 opacity-0 animate-[fadeUp_0.6s_ease_forwards_0.1s]">
      {/* Top Border Glow */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/40 to-transparent" />

      {/* Scanline Animation */}
      <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-acid/35 to-transparent animate-[scanH_6s_ease-in-out_infinite_2s] pointer-events-none z-20" />

      <div className="p-8 pb-6 border-b border-v-border2 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.26em] text-acid">
          <div className="w-1.25 h-1.25 rounded-full bg-acid animate-pulse" />
          SECURE_ACCESS_GATE
        </div>
        <h1 className="text-2xl font-mono font-bold tracking-tight text-foreground">Sign In</h1>
        <p className="text-sm text-v-muted font-light leading-relaxed">
          Access your vulnerability dashboard and scanning suite.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-4.5">

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 bg-v-red/10 border border-v-red/30 rounded-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-v-red shrink-0 mt-0.5" />
            <p className="font-mono text-[10.5px] text-v-red leading-relaxed">{error}</p>
          </div>
        )}

        {/* Info banner (e.g. "Check your email") */}
        {message && !error && (
          <div className="flex items-start gap-2.5 px-3 py-2.5 bg-acid/10 border border-acid/30 rounded-sm">
            <Info className="w-3.5 h-3.5 text-acid shrink-0 mt-0.5" />
            <p className="font-mono text-[10.5px] text-acid leading-relaxed">
              {decodeURIComponent(message)}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.75">
          <label className="text-[9px] font-mono tracking-widest uppercase text-v-muted2">Email Address</label>
          <div className="relative flex items-center group">
            <Mail className="absolute left-3.25 w-4 h-4 text-v-muted2 group-focus-within:text-acid transition-colors" />
            <input
              name="email"
              type="email"
              required
              placeholder="operator@vulnra.ai"
              className="w-full bg-white/5 border border-v-border rounded-sm py-2.75 pl-10 pr-3.5 text-xs font-mono outline-none focus:border-acid/40 focus:bg-acid/5 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.75">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-mono tracking-widest uppercase text-v-muted2">Authorization Key</label>
            <Link href="#" className="text-[9.5px] font-mono text-v-muted2 hover:text-acid transition-colors">Forgot Key?</Link>
          </div>
          <div className="relative flex items-center group">
            <Lock className="absolute left-3.25 w-4 h-4 text-v-muted2 group-focus-within:text-acid transition-colors" />
            <input
              name="password"
              type={showPw ? "text" : "password"}
              required
              placeholder="••••••••••••"
              className="w-full bg-white/5 border border-v-border rounded-sm py-2.75 pl-10 pr-10 text-xs font-mono outline-none focus:border-acid/40 focus:bg-acid/5 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.25 text-v-muted2 hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "mt-2 w-full bg-acid text-black font-mono text-[10.5px] font-bold tracking-widest py-3 rounded-sm transition-all flex items-center justify-center gap-1.5",
            pending
              ? "opacity-70 cursor-not-allowed"
              : "hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)]"
          )}
        >
          {pending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AUTHENTICATING...</>
          ) : (
            <>AUTHENTICATE <ArrowRight className="w-3.5 h-3.5" /></>
          )}
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-[1px] bg-v-border" />
          <span className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase">Or Continue With</span>
          <div className="flex-1 h-[1px] bg-v-border" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <OAuthButton provider="github" label="GITHUB" />
          <OAuthButton provider="google" label="GOOGLE" />
        </div>

        <p className="mt-4 text-center text-[10px] font-mono text-v-muted2">
          New Operator?{" "}
          <Link href="/signup" className="text-acid underline underline-offset-4">
            Register Manifest
          </Link>
        </p>
      </form>
    </div>
  );
}
