/**
 * utils/supabase/auth-guard.ts
 *
 * Server-side auth guard used by every protected Server Component page/layout.
 *
 * WHY THIS EXISTS:
 *   Every page that calls createClient() directly is one missing env var or
 *   transient Supabase network error away from throwing an uncaught exception
 *   that propagates to the root error.tsx ("CRITICAL: Application error occurred").
 *   This helper centralises the auth check and handles ALL errors by redirecting
 *   to /login instead of crashing to the error boundary.
 *
 * USAGE:
 *   import { requireAuth } from "@/utils/supabase/auth-guard";
 *
 *   export default async function SomePage() {
 *     const user = await requireAuth();
 *     return <SomeComponent user={user} />;
 *   }
 */

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

/**
 * Returns the authenticated Supabase user, or redirects to /login.
 *
 * Handles three failure modes gracefully (without crashing to error boundary):
 *   1. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from
 *      Railway frontend service env vars → createClient() throws
 *   2. Supabase API unreachable (network error, maintenance) → getUser() throws
 *   3. No active session (user not logged in) → getUser() returns null user
 *
 * In all three cases the user is redirected to `redirectTo` (default: /login).
 * Next.js redirect() is called OUTSIDE the try-catch so the NEXT_REDIRECT
 * internal error propagates correctly through the framework.
 */
export async function requireAuth(redirectTo = "/login"): Promise<User> {
  try {
    // Dynamic import keeps createClient() out of the module's top-level scope,
    // ensuring it doesn't execute during build-time static analysis.
    const { createClient } = await import("./server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
    // No user → fall through to redirect below
  } catch {
    // createClient() threw (env vars missing) or getUser() threw (network error).
    // Fall through to redirect — do NOT re-throw (that would reach error.tsx).
  }

  // redirect() throws Next.js's internal NEXT_REDIRECT error which the framework
  // catches and converts to a 307 response. Must be outside the catch block.
  redirect(redirectTo);
}
