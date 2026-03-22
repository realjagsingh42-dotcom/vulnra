import { requireAuth } from "@/utils/supabase/auth-guard";
import RAGScanner from "@/components/rag-scanner/RAGScanner";

export default async function RAGScannerPage() {
  const user = await requireAuth();
  return <RAGScanner user={user} />;
}
