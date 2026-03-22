import { requireAuth } from "@/utils/supabase/auth-guard";
import OrgDashboard from "@/components/org/OrgDashboard";

export default async function OrgPage() {
  const user = await requireAuth();
  return <OrgDashboard user={user} />;
}
