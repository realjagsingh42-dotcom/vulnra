// ── Centralised constants ─────────────────────────────────────────────────────
// Import from here instead of duplicating process.env reads across components.

/** Backend API base URL. Falls back to localhost for local dev. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Supabase project URL (required). */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Supabase anon/public key (required). */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── Rate limits per tier ──────────────────────────────────────────────────────

export const RATE_LIMIT_CONFIG = {
  free:       { limit: 1,   window: 60 },
  pro:        { limit: 10,  window: 60 },
  enterprise: { limit: 100, window: 60 },
} as const;

// ── Polling intervals (ms) ────────────────────────────────────────────────────

export const POLL_INTERVAL_MS = 3_000;
export const REQUEST_TIMEOUT_MS = 30_000;

// ── API key format ────────────────────────────────────────────────────────────

export const API_KEY_PREFIX_LIVE = "vk_live_";
export const API_KEY_PREFIX_TEST = "vk_test_";
export const API_KEY_TOTAL_LENGTH = 43;
