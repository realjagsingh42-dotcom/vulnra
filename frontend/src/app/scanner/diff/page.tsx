import { Suspense } from "react";
import { requireAuth } from "@/utils/supabase/auth-guard";
import DiffLayout from "@/components/scanner/DiffLayout";

export default async function DiffPage() {
  await requireAuth();
  return (
    <Suspense>
      <DiffLayout />
    </Suspense>
  );
}
