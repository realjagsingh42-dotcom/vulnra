import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import LandingPage from '@/components/landing/LandingPage'

export default async function RootPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (data?.user) {
    redirect('/scanner')
  }

  return <LandingPage />
}
