import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ScannerLayout from '@/components/scanner/ScannerLayout'

export default async function ScannerPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return <ScannerLayout user={data.user} />
}
