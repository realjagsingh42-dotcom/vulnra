import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OrgDashboard from '@/components/org/OrgDashboard'

export default async function OrgPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/login')
  }

  return <OrgDashboard user={data.user} />
}
