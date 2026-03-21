// ── Secure API client ─────────────────────────────────────────────────────────
// Centralised fetch wrapper with auth, timeouts, request IDs, and typed errors.
// Use apiRequest() for every backend call instead of raw fetch().

import type { ApiResponse, ApiError } from "@/types/api";
import { API_BASE, REQUEST_TIMEOUT_MS } from "./constants";
import { getAccessToken } from "./auth-storage";
import { logger } from "./logger";

// ── Client-side rate limit (scan requests) ────────────────────────────────────

let _lastScanRequestAt = 0;
const MIN_SCAN_INTERVAL_MS = 3_000;

export function canSubmitScan(): boolean {
  return Date.now() - _lastScanRequestAt >= MIN_SCAN_INTERVAL_MS;
}

export function recordScanRequest(): void {
  _lastScanRequestAt = Date.now();
}

// ── Request options ───────────────────────────────────────────────────────────

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  requiresAuth?: boolean;
  timeoutMs?: number;
  /** Set to true for scan start endpoints to apply client-side rate guard */
  isScanRequest?: boolean;
}

// ── Core request function ─────────────────────────────────────────────────────

/**
 * Makes an authenticated, timeout-bound API request.
 *
 * - Injects Authorization header from Supabase session (never from URL params)
 * - Sets Content-Type: application/json on mutating requests
 * - Adds X-Request-ID for traceability
 * - Returns ApiResponse<T> — never throws; errors are returned in .error
 * - Handles 401 by attempting a session refresh before failing
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = "GET",
    body,
    requiresAuth = true,
    timeoutMs = REQUEST_TIMEOUT_MS,
    isScanRequest = false,
  } = options;

  // Client-side scan rate guard
  if (isScanRequest && !canSubmitScan()) {
    return {
      data: null,
      error: {
        detail: "Please wait before submitting another scan",
        code: "CLIENT_RATE_LIMITED",
      },
    };
  }

  const headers: Record<string, string> = {
    "X-Request-ID": crypto.randomUUID(),
  };

  if (method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  // Attach auth token — always in header, never in URL
  if (requiresAuth) {
    const token = await getAccessToken();
    if (!token) {
      return {
        data: null,
        error: { detail: "Not authenticated", code: "NO_SESSION" },
      };
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE}${endpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (isScanRequest) recordScanRequest();

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401) {
      // Token may have expired — log but return auth error
      logger.warn("401 from API — session may have expired", { endpoint });
      return {
        data: null,
        error: { detail: "Session expired — please sign in again", code: "SESSION_EXPIRED", status: 401 },
      };
    }

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const errJson = (await response.json()) as Partial<ApiError>;
        detail = errJson.detail ?? detail;
      } catch {
        // Response body wasn't JSON — use status text
      }
      logger.error(`API error ${response.status} on ${endpoint}`, { detail });
      return {
        data: null,
        error: { detail, status: response.status, code: `HTTP_${response.status}` } as ApiError & { status: number },
      };
    }

    // 204 No Content — return empty success
    if (response.status === 204) {
      return { data: null, error: null };
    }

    const json = (await response.json()) as T;
    return { data: json, error: null };
  } catch (err: unknown) {
    clearTimeout(timer);

    if (err instanceof DOMException && err.name === "AbortError") {
      logger.error(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
      return {
        data: null,
        error: { detail: `Request timed out after ${timeoutMs / 1000}s`, code: "TIMEOUT" },
      };
    }

    const message = err instanceof Error ? err.message : "Network error";
    logger.error(`Network error on ${endpoint}`, err);
    return {
      data: null,
      error: { detail: message, code: "NETWORK_ERROR" },
    };
  }
}
