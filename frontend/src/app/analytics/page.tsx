import { requireAuth } from "@/utils/supabase/auth-guard";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata = {
  title: "Analytics — VULNRA",
  description: "Security posture analytics and vulnerability trends across your scanned endpoints.",
};

export default async function AnalyticsPage() {
  const user = await requireAuth();
  return <AnalyticsDashboard user={user} />;
}
