import { Suspense } from "react";
import { requireAuth } from "@/utils/supabase/auth-guard";
import ScannerLayout from "@/components/scanner/ScannerLayout";

export default async function ScannerPage() {
  const user = await requireAuth();
  return (
    <Suspense>
      <ScannerLayout user={user} />
    </Suspense>
  );
}
