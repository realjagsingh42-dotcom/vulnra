"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Github, Chrome, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { login } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm() {
  const [showPw, setShowPw] = useState(false);

  const handleOAuth = async (provider: 'github' | 'google') => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/scanner`,
      },
    });
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

      <form action={login} className="p-8 flex flex-col gap-4.5">
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
          className="mt-2 w-full bg-acid text-black font-mono text-[10.5px] font-bold tracking-widest py-3 rounded-sm hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(184,255,87,0.3)] transition-all flex items-center justify-center gap-1.5"
        >
          AUTHENTICATE <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-[1px] bg-v-border" />
          <span className="text-[9px] font-mono tracking-widest text-v-muted2 uppercase">Or Continue With</span>
          <div className="flex-1 h-[1px] bg-v-border" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button" 
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center gap-2 bg-white/5 border border-v-border rounded-sm py-2.5 text-[10px] font-mono hover:bg-white/10 transition-colors"
          >
            <Github className="w-3.5 h-3.5" /> GITHUB
          </button>
          <button 
            type="button" 
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center gap-2 bg-white/5 border border-v-border rounded-sm py-2.5 text-[10px] font-mono hover:bg-white/10 transition-colors"
          >
            <Chrome className="w-3.5 h-3.5" /> GOOGLE
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] font-mono text-v-muted2">
          New Operator? <Link href="/signup" className="text-acid underline underline-offset-4">Register Manifest</Link>
        </p>
      </form>
    </div>
  );
}
