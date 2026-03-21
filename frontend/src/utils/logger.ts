// ── Structured logger ─────────────────────────────────────────────────────────
// Logs only in development. In production, errors are silently swallowed here
// — wire up Sentry / PostHog / Datadog by replacing the production stubs.

const isDev = process.env.NODE_ENV === "development";

type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

export const logger = {
  info(msg: string, data?: LogData): void {
    if (isDev) {
      console.info(`[VULNRA] ${msg}`, data ?? "");
    }
  },

  warn(msg: string, data?: LogData): void {
    if (isDev) {
      console.warn(`[VULNRA WARN] ${msg}`, data ?? "");
    }
    // Production: send to observability platform
  },

  error(msg: string, error?: unknown): void {
    if (isDev) {
      console.error(`[VULNRA ERROR] ${msg}`, error ?? "");
    }
    // Production: report to Sentry/PostHog
    // Example: Sentry.captureException(error, { extra: { msg } })
  },

  debug(msg: string, data?: LogData): void {
    if (isDev) {
      console.debug(`[VULNRA DEBUG] ${msg}`, data ?? "");
    }
  },
};
