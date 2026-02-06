/**
 * Minimal structured logger for the Telegram bot.
 *
 * Writes JSON lines to stdout/stderr so output is easily parseable
 * by log aggregators. Includes timestamps and context fields.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  (process.env.BOT_LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatLog(
  level: LogLevel,
  message: string,
  ctx?: Record<string, unknown>
): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...ctx,
  });
}

export const logger = {
  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("debug")) console.debug(formatLog("debug", msg, ctx));
  },

  info(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("info")) console.log(formatLog("info", msg, ctx));
  },

  warn(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("warn")) console.warn(formatLog("warn", msg, ctx));
  },

  error(msg: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("error")) console.error(formatLog("error", msg, ctx));
  },
};
