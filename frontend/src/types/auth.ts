// ── Auth domain types ─────────────────────────────────────────────────────────

import type { Tier } from "./scan";

export interface VulnraUser {
  id: string;
  email: string;
  tier: Tier;
  full_name?: string;
  org_name?: string;
  created_at: string;
}

export interface AuthState {
  user: VulnraUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SubscriptionInfo {
  tier: Tier;
  subscription_id?: string;
  plan_name?: string;
  status?: "active" | "cancelled" | "past_due";
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
