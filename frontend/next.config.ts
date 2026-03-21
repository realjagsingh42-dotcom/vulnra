import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://vulnra-production.up.railway.app";

// ── Security response headers ─────────────────────────────────────────────────
// Applied to every page and API route via the headers() config.
const SECURITY_HEADERS = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options",    value: "nosniff" },
  // Block clickjacking
  { key: "X-Frame-Options",           value: "DENY" },
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
  // Note: nonces require middleware integration for inline scripts.
  // 'unsafe-inline' for styles is required by Tailwind CSS v4 at runtime.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      `connect-src 'self' ${API_ORIGIN} https://*.supabase.co wss://*.supabase.co`,
      "img-src 'self' data: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
