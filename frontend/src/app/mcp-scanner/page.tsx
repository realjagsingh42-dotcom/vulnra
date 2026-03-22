import { requireAuth } from "@/utils/supabase/auth-guard";
import MCPServerScanner from "@/components/mcp-scanner/MCPServerScanner";

export default async function MCPScannerPage() {
  const user = await requireAuth();
  return <MCPServerScanner user={user} />;
}
