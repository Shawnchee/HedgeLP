/**
 * HedgeLP Telegram Bot — Main Entrypoint
 *
 * Starts the bot in long-polling mode and registers all commands.
 * Run via: npm run bot:telegram
 *
 * Required env vars:
 *   TELEGRAM_BOT_TOKEN  — Token from @BotFather
 *
 * Optional env vars:
 *   BOT_API_BASE_URL        — Next.js API base (default: http://localhost:3000)
 *   BOT_POLLING_INTERVAL_MS — Polling interval (default: 2000)
 *   BOT_RATE_LIMIT_MAX      — Max commands per window (default: 20)
 *   BOT_RATE_LIMIT_WINDOW_SEC — Rate limit window (default: 60)
 *   BOT_ALLOWED_CHAT_IDS    — Comma-separated allowed chat IDs (empty = allow all)
 *   BOT_HTTP_TIMEOUT_MS     — API call timeout (default: 10000)
 *   BOT_HTTP_MAX_RETRIES    — API retry count (default: 2)
 *   BOT_TOP_POOLS_COUNT     — Number of pools to display (default: 10)
 *   BOT_LOG_LEVEL           — Logging level: debug|info|warn|error (default: info)
 */

import TelegramBot from "node-telegram-bot-api";
import { config } from "./config";
import { registerCommands, destroyRateLimiter } from "./commands";
import { sessionStore } from "./services/session-store";
import { logger } from "./utils/logger";

// ── Startup banner ───────────────────────────────────────────────────────────

logger.info("Starting HedgeLP Telegram Bot", {
  apiBaseUrl: config.apiBaseUrl,
  pollingInterval: config.pollingInterval,
  rateLimitMax: config.rateLimitMax,
  rateLimitWindowSec: config.rateLimitWindowSec,
  allowedChatIds: config.allowedChatIds || "(unrestricted)",
});

// ── Create bot instance ──────────────────────────────────────────────────────

const bot = new TelegramBot(config.telegramBotToken, {
  polling: {
    interval: config.pollingInterval,
    autoStart: false, // We'll start manually after setup
    params: {
      timeout: 30, // Long-polling timeout in seconds
      allowed_updates: ["message", "callback_query"], // Messages + inline keyboard presses
    },
  },
});

// ── Error handling ───────────────────────────────────────────────────────────

bot.on("polling_error", (error) => {
  const errMsg = error instanceof Error ? error.message : String(error);

  // Detect common issues and give actionable messages
  if (errMsg.includes("401") || errMsg.includes("Unauthorized")) {
    logger.error(
      "FATAL: Invalid TELEGRAM_BOT_TOKEN. Please check your .env file.",
      { error: errMsg }
    );
    shutdown(1);
    return;
  }

  if (errMsg.includes("409") || errMsg.includes("Conflict")) {
    logger.error(
      "FATAL: Another bot instance is already polling with this token. " +
        "Only one polling instance is allowed at a time.",
      { error: errMsg }
    );
    shutdown(1);
    return;
  }

  if (errMsg.includes("ECONNREFUSED") || errMsg.includes("ETIMEDOUT")) {
    logger.warn("Network issue with Telegram API, will retry...", {
      error: errMsg,
    });
    return;
  }

  logger.error("Polling error", { error: errMsg });
});

bot.on("error", (error) => {
  logger.error("Bot error", {
    error: error instanceof Error ? error.message : String(error),
  });
});

// ── Register commands ────────────────────────────────────────────────────────

registerCommands(bot);

// ── Start polling ────────────────────────────────────────────────────────────

bot.startPolling();

logger.info("Bot is now polling for updates. Press Ctrl+C to stop.");

// ── Healthcheck: verify the token by calling getMe ───────────────────────────

bot
  .getMe()
  .then((me) => {
    logger.info("Bot identity verified", {
      id: me.id,
      username: me.username,
      firstName: me.first_name,
    });
  })
  .catch((err) => {
    logger.error("Failed to verify bot identity — is the token correct?", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

// ── Graceful shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function shutdown(exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Shutting down bot...");

  try {
    bot.stopPolling({ cancel: true });
    destroyRateLimiter();
    sessionStore.destroy();
    logger.info("Bot stopped gracefully.");
  } catch (err) {
    logger.error("Error during shutdown", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

// Catch unhandled rejections/exceptions to prevent silent crashes
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — shutting down", {
    error: err.message,
    stack: err.stack,
  });
  shutdown(1);
});
