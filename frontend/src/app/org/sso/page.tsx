import { requireAuth } from "@/utils/supabase/auth-guard";
import SSOSettings from "@/components/org/SSOSettings";

export default async function SSOPage() {
  const user = await requireAuth();
  return <SSOSettings user={user} />;
}
