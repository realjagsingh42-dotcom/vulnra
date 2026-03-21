import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://vulnra-production.up.railway.app";

// ── Security response headers ─────────────────────────────────────────────────
// Applied to every page and API route via the headers() config.
const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Block clickjacking — allow frames for OAuth providers that use popups
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  // Limit cross-origin info leakage
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  // Disable unused browser APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Strict Transport Security (1 year, include subdomains)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Content Security Policy
  // Notes:
  //   - 'unsafe-inline' for styles is required by Tailwind CSS v4 at runtime
  //   - 'unsafe-eval' for scripts is required by Next.js dev/hot-reload
  //   - connect-src includes Supabase REST + realtime + Google/GitHub OAuth
  //   - frame-src allows Supabase auth popups (some OAuth providers use iframes)
  //   - form-action omitted: Next.js server actions use same-origin POSTs and
  //     are correctly handled without this directive; adding it can interfere
  //     with OAuth provider redirects triggered inside async JS handlers
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      [
        "connect-src 'self'",
        API_ORIGIN,
        "https://*.supabase.co",
        "wss://*.supabase.co",
        "https://accounts.google.com",
        "https://api.github.com",
      ].join(" "),
      "img-src 'self' data: https:",
      "frame-src 'self' https://*.supabase.co https://accounts.google.com https://github.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
