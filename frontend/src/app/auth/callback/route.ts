import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as 'email' | 'recovery' | 'signup' | null
  const nextParam  = searchParams.get('next') ?? '/scanner'
  // Only allow relative paths — reject anything containing a scheme (open redirect prevention)
  const next       = nextParam.startsWith('/') && !nextParam.includes('://') ? nextParam : '/scanner'

  // Resolve the correct redirect base (Railway / Vercel use x-forwarded-host)
  const forwardedHost = (request as Request & { headers: Headers }).headers.get('x-forwarded-host')
  const isLocal       = process.env.NODE_ENV === 'development'
  const base          = isLocal ? origin : forwardedHost ? `https://${forwardedHost}` : origin

  const supabase = await createClient()

  // ── PKCE / OAuth code exchange ─────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  // ── Email confirmation / magic-link token_hash ─────────────────────────────
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  // Something went wrong
  return NextResponse.redirect(`${base}/auth/auth-error`)
}
