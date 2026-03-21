// ── Secure token storage ──────────────────────────────────────────────────────
// Tokens are managed exclusively through the Supabase SSR client which uses
// httpOnly cookies for server-side sessions and memory for client-side.
// This module provides a safe abstraction — never write tokens to localStorage.

import { createClient } from "./supabase/client";

/**
 * Retrieves the current access token from the active Supabase session.
 * Returns null if no session exists — do not fall back to localStorage.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Clears all auth-related session data.
 * Delegates to Supabase signOut which invalidates the server-side session
 * and removes the auth cookie.
 */
export async function clearAuthSession(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Best-effort — cookie will expire naturally
  }
  // Clear any residual session storage (belt-and-suspenders)
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
}

/**
 * Read-only token facade.
 * Use getAccessToken() for async operations instead of reading raw storage.
 */
export const TokenStorage = {
  /** Async — reads from Supabase session (httpOnly cookie path on server) */
  get: getAccessToken,
  /** Invalidates the session and clears local storage */
  clear: clearAuthSession,
} as const;
