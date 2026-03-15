import Link from "next/link";
import { Shield } from "lucide-react";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-acid/10 rounded-full blur-[80px] animate-[orb1_12s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-v-red/5 rounded-full blur-[80px] animate-[orb2_14s_ease-in-out_infinite] pointer-events-none" />

      {/* Minimal nav */}
      <div className="h-14 flex items-center justify-between px-6 md:px-10 relative z-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded bg-acid flex items-center justify-center group-hover:shadow-[0_0_12px_rgba(184,255,87,0.5)] transition-all">
            <Shield className="w-3 h-3 text-black" />
          </div>
          <span className="font-mono text-sm font-bold tracking-wider">VULNRA</span>
        </Link>
        <Link
          href="/login"
          className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
        >
          Already have an account? Sign in →
        </Link>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <SignupForm />
      </div>
    </main>
  );
}
