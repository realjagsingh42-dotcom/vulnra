import { requireAuth } from "@/utils/supabase/auth-guard";
import SettingsShell from "@/components/settings/SettingsShell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireAuth() redirects to /login on any error — no uncaught throws reach error.tsx
  const user = await requireAuth();
  return <SettingsShell user={user}>{children}</SettingsShell>;
}
