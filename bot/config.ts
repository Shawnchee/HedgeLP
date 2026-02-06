/**
 * Bot configuration — validates environment variables at startup
 * and exports typed, immutable config constants.
 */

import { config as dotenvConfig } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for both ESM and CJS contexts
const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

// Load .env.local first, fall back to .env.example
const root = resolve(_dirname, "..");
dotenvConfig({ path: resolve(root, ".env.local") });
dotenvConfig({ path: resolve(root, ".env.example") }); // won't override existing

// ── Env helpers ──────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    console.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

// ── Configuration ────────────────────────────────────────────────────────────

export const config = Object.freeze({
  /** Telegram bot token from @BotFather */
  telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),

  /** Base URL of the Next.js API (no trailing slash) */
  apiBaseUrl: optionalEnv("BOT_API_BASE_URL", "http://localhost:3000"),

  /** Polling interval in ms */
  pollingInterval: Number(optionalEnv("BOT_POLLING_INTERVAL_MS", "2000")),

  /** Per-user rate limit: max commands within the window */
  rateLimitMax: Number(optionalEnv("BOT_RATE_LIMIT_MAX", "20")),

  /** Rate limit window in seconds */
  rateLimitWindowSec: Number(optionalEnv("BOT_RATE_LIMIT_WINDOW_SEC", "60")),

  /** HTTP request timeout for API calls (ms) */
  httpTimeoutMs: Number(optionalEnv("BOT_HTTP_TIMEOUT_MS", "10000")),

  /** Max HTTP retries for transient failures */
  httpMaxRetries: Number(optionalEnv("BOT_HTTP_MAX_RETRIES", "2")),

  /** Allowed chat IDs (comma-separated). Empty string = allow all */
  allowedChatIds: optionalEnv("BOT_ALLOWED_CHAT_IDS", ""),

  /** Number of top pools to show */
  topPoolsCount: Number(optionalEnv("BOT_TOP_POOLS_COUNT", "10")),
});

// ── Derived helpers ──────────────────────────────────────────────────────────

/** Returns the set of allowed chat IDs (empty set = unrestricted). */
export function getAllowedChatIds(): Set<number> {
  if (!config.allowedChatIds) return new Set();
  return new Set(
    config.allowedChatIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))
  );
}

export type Config = typeof config;
