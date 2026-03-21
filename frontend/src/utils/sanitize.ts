// ── Input sanitization utilities ──────────────────────────────────────────────
// Apply sanitizeUrl() to every scan form submission.
// Apply sanitizeApiKey() to every API key input field.

import { API_KEY_PREFIX_LIVE, API_KEY_PREFIX_TEST, API_KEY_TOTAL_LENGTH } from "./constants";

// ── Custom error class ────────────────────────────────────────────────────────

export class ValidationError extends Error {
  readonly field: string;
  readonly code: string;

  constructor(message: string, field: string, code: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.code = code;
  }
}

// ── Private / reserved IP detection ──────────────────────────────────────────

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,          // 127.0.0.0/8 — loopback
  /^10\.\d+\.\d+\.\d+$/,           // 10.0.0.0/8 — private class A
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12 — private class B
  /^192\.168\.\d+\.\d+$/,          // 192.168.0.0/16 — private class C
  /^169\.254\.\d+\.\d+$/,          // 169.254.0.0/16 — link-local
  /^0\.0\.0\.0$/,                  // unspecified
  /^::1$/,                         // IPv6 loopback
  /^fc[0-9a-f]{2}:/i,              // IPv6 unique-local fc00::/7
  /^fd[0-9a-f]{2}:/i,              // IPv6 unique-local fd00::/7
  /^fe80:/i,                       // IPv6 link-local
  /^metadata\.google\.internal$/i, // GCP metadata
  /^169\.254\.169\.254$/,          // AWS/Azure/GCP metadata endpoint
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(hostname));
}

// ── URL sanitization ──────────────────────────────────────────────────────────

/**
 * Validates and sanitizes a URL before sending to the scan API.
 *
 * - Rejects javascript:, data:, file:, and other non-HTTP(S) schemes
 * - Rejects private / loopback / cloud-metadata IP ranges (SSRF prevention)
 * - Returns the normalised URL string on success
 * - Throws ValidationError on failure — caller must handle
 */
export function sanitizeUrl(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ValidationError("URL is required", "url", "URL_EMPTY");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ValidationError(
      "Invalid URL — must be a valid absolute URL",
      "url",
      "URL_INVALID"
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError(
      `Unsupported protocol "${parsed.protocol}" — only http:// and https:// are allowed`,
      "url",
      "URL_PROTOCOL_DISALLOWED"
    );
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new ValidationError(
      "Scanning private/internal network addresses is not allowed",
      "url",
      "URL_PRIVATE_RANGE"
    );
  }

  // Return the normalised form (e.g. adds trailing slash on origin-only URLs)
  return parsed.toString();
}

// ── API key sanitization ──────────────────────────────────────────────────────

/**
 * Validates and strips an API key input.
 *
 * - Must start with vk_live_ or vk_test_
 * - Must be exactly API_KEY_TOTAL_LENGTH characters after trimming
 * - Throws ValidationError on failure
 */
export function sanitizeApiKey(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new ValidationError("API key is required", "apiKey", "API_KEY_EMPTY");
  }

  const hasValidPrefix =
    trimmed.startsWith(API_KEY_PREFIX_LIVE) ||
    trimmed.startsWith(API_KEY_PREFIX_TEST);

  if (!hasValidPrefix) {
    throw new ValidationError(
      `API key must start with "${API_KEY_PREFIX_LIVE}" or "${API_KEY_PREFIX_TEST}"`,
      "apiKey",
      "API_KEY_BAD_PREFIX"
    );
  }

  if (trimmed.length !== API_KEY_TOTAL_LENGTH) {
    throw new ValidationError(
      `API key must be exactly ${API_KEY_TOTAL_LENGTH} characters`,
      "apiKey",
      "API_KEY_BAD_LENGTH"
    );
  }

  return trimmed;
}
