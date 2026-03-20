import Link from "next/link";
import VulnraLogo from "@/components/VulnraLogo";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-15%] left-[-15%] w-[500px] h-[500px] bg-acid/10 rounded-full blur-[80px] animate-[orb1_12s_ease-in-out_infinite] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-v-red/5 rounded-full blur-[80px] animate-[orb2_14s_ease-in-out_infinite] pointer-events-none" />

      {/* Minimal nav */}
      <div className="h-14 flex items-center justify-between px-6 md:px-10 relative z-10">
        <Link href="/"><VulnraLogo /></Link>
        <Link
          href="/signup"
          className="font-mono text-[11px] tracking-widest text-v-muted hover:text-acid transition-colors"
        >
          No account? Sign up →
        </Link>
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <LoginForm message={message} />
      </div>
    </main>
  );
}
