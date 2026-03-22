import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'

export default async function RootPage() {
  // Lazy import so createClient() never crashes the root page to error.tsx
  // if NEXT_PUBLIC_SUPABASE_URL is missing or Supabase is momentarily down.
  try {
    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) redirect('/scanner')
  } catch {
    // createClient() threw or getUser() threw — show landing page (safe fallback)
  }

  return <LandingPage />
}
