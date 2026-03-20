"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
import {
  User as UserIcon,
  Bell,
  Webhook,
  Key,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import VulnraLogo from "@/components/VulnraLogo";

const NAV_ITEMS = [
  { href: "/settings/account", label: "Account", icon: UserIcon },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export default function SettingsShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-acid selection:text-black">
      {/* Top nav */}
      <nav className="h-13 bg-v-bg1 border-b border-v-border2 flex items-center justify-between px-5 z-50 sticky top-0">
        <div className="flex items-center gap-4">
          <VulnraLogo suffix="SETTINGS" />
        </div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-[10px] text-v-muted2 truncate max-w-[180px]">
            {user.email}
          </div>
          <Link
            href="/scanner"
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-v-muted2 hover:text-acid transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK TO SCANNER
          </Link>
        </div>
      </nav>

      <div className="flex max-w-[1100px] mx-auto px-6 py-10 gap-10">
        {/* Sidebar */}
        <aside className="w-48 shrink-0">
          <div className="font-mono text-[8.5px] tracking-[0.2em] uppercase text-v-muted2 mb-4 px-2">
            Settings
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-sm font-mono text-[12px] tracking-wide transition-colors ${
                    active
                      ? "bg-acid/10 text-acid border border-acid/20"
                      : "text-v-muted hover:text-foreground hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
