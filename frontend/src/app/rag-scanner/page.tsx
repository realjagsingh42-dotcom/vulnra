import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RAGScanner from '@/components/rag-scanner/RAGScanner'

export default async function RAGScannerPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return <RAGScanner user={data.user} />
}
