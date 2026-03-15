import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DiffLayout from "@/components/scanner/DiffLayout";

export default async function DiffPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  return (
    <Suspense>
      <DiffLayout />
    </Suspense>
  );
}
