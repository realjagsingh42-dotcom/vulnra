import { requireAuth } from "@/utils/supabase/auth-guard";
import ScheduledScansList from "@/components/scanner/ScheduledScansList";

export default async function ScheduledScansPage() {
  const user = await requireAuth();
  return <ScheduledScansList user={user} />;
}
