/**
 * Command router — registers all bot commands and dispatches messages.
 *
 * Responsibilities:
 *  - Parse command + arguments from incoming messages
 *  - Handle custom amount input for deposit/withdraw flows
 *  - Enforce rate limiting per user
 *  - Enforce chat-ID allow-list (guardrail)
 *  - Dispatch to the appropriate handler
 *  - Catch and report handler errors gracefully
 */

import type TelegramBot from "node-telegram-bot-api";
import { config, getAllowedChatIds } from "./config";
import { RateLimiter } from "./utils/rate-limiter";
import { esc, bold } from "./utils/formatters";
import { logger } from "./utils/logger";
import { sessionStore } from "./services/session-store";
import {
  getVaultState,
  depositToVault,
  withdrawFromVault,
} from "./services/mock-vault";
import { fmtUsd, fmtNum, fmtCompact, italic, divider } from "./utils/formatters";

// ── Handlers ─────────────────────────────────────────────────────────────────

import { handleStart, handleHelp } from "./handlers/help";
import { handlePrice } from "./handlers/price";
import { handlePools, handleApy } from "./handlers/pools";
import { handleNews } from "./handlers/news";
import { handleStats } from "./handlers/stats";
import { handleVault } from "./handlers/vault";
import { registerCallbackHandler } from "./handlers/callbacks";

// ── Types ────────────────────────────────────────────────────────────────────

type CommandHandler = (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string
) => Promise<void>;

interface CommandDef {
  description: string;
  handler: CommandHandler;
}

// ── Command registry ─────────────────────────────────────────────────────────

const COMMANDS: Record<string, CommandDef> = {
  start: {
    description: "Welcome message",
    handler: (bot, msg) => handleStart(bot, msg),
  },
  help: {
    description: "Show available commands",
    handler: (bot, msg) => handleHelp(bot, msg),
  },
  price: {
    description: "Get token price & stats",
    handler: (bot, msg, args) => handlePrice(bot, msg, args),
  },
  vault: {
    description: "HedgeLP vault status & actions",
    handler: (bot, msg) => handleVault(bot, msg),
  },
  pools: {
    description: "Top Uniswap/Curve/Aave pools by TVL",
    handler: (bot, msg, args) => handlePools(bot, msg, args),
  },
  apy: {
    description: "Top pools sorted by APY",
    handler: (bot, msg, args) => handleApy(bot, msg, args),
  },
  news: {
    description: "Trending coins on CoinGecko",
    handler: (bot, msg) => handleNews(bot, msg),
  },
  stats: {
    description: "Global market overview",
    handler: (bot, msg) => handleStats(bot, msg),
  },
};

// ── Guardrails ───────────────────────────────────────────────────────────────

const rateLimiter = new RateLimiter(
  config.rateLimitMax,
  config.rateLimitWindowSec
);

const allowedChatIds = getAllowedChatIds();

function isChatAllowed(chatId: number): boolean {
  if (allowedChatIds.size === 0) return true;
  return allowedChatIds.has(chatId);
}

// ── Input sanitisation ───────────────────────────────────────────────────────

const MAX_ARG_LENGTH = 200;
const SAFE_ARG_REGEX = /^[a-zA-Z0-9\s,._-]*$/;

function sanitizeArgs(raw: string): string {
  const trimmed = raw.trim().slice(0, MAX_ARG_LENGTH);
  if (!SAFE_ARG_REGEX.test(trimmed)) {
    return trimmed.replace(/[^a-zA-Z0-9\s,._-]/g, "");
  }
  return trimmed;
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register all commands with the Telegram bot and set up the
 * message-based command router + callback query handler.
 */
export function registerCommands(bot: TelegramBot): void {
  // Set bot command menu in Telegram
  const menuCommands = Object.entries(COMMANDS)
    .filter(([name]) => name !== "start")
    .map(([command, def]) => ({
      command,
      description: def.description,
    }));

  bot.setMyCommands(menuCommands).catch((err) => {
    logger.warn("Failed to set bot menu commands", { error: String(err) });
  });

  // Register inline keyboard callback handler
  registerCallbackHandler(bot);

  // Listen for text messages
  bot.on("message", async (msg) => {
    if (!msg.text) return;

    const userId = msg.from?.id ?? 0;
    const chatId = msg.chat.id;
    const username = msg.from?.username ?? "unknown";

    // ── Handle custom amount input for active flows ──────────────────────

    if (!msg.text.startsWith("/")) {
      const session = sessionStore.get(userId);
      if (session && session.step === "awaiting_custom_amount") {
        await handleCustomAmountInput(bot, msg, userId, chatId, session.flow);
        return;
      }
      if (session && session.step === "awaiting_custom_allocation") {
        await handleCustomAllocationInput(bot, msg, userId, chatId);
        return;
      }
      return; // Ignore non-command, non-flow text
    }

    // ── Parse command ────────────────────────────────────────────────────

    const parsed = parseCommand(msg.text);
    if (!parsed) return;

    const { command, args } = parsed;

    // Clear any active session when a new command is issued
    sessionStore.clear(userId);

    logger.info("Command received", {
      command,
      args: args.slice(0, 50),
      userId,
      chatId,
      username,
    });

    // ── Guardrail: Chat allow-list ──────────────────────────────────────

    if (!isChatAllowed(chatId)) {
      logger.warn("Blocked command from disallowed chat", { chatId, userId });
      await bot.sendMessage(
        chatId,
        esc("🔒 This bot is not available in this chat."),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // ── Guardrail: Rate limiting ────────────────────────────────────────

    if (!rateLimiter.check(userId)) {
      const retryAfter = rateLimiter.retryAfterSec(userId);
      logger.warn("Rate limited", { userId, retryAfter });
      await bot.sendMessage(
        chatId,
        esc(`⏳ You're sending commands too fast. Please wait ${retryAfter}s.`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    // ── Dispatch ─────────────────────────────────────────────────────────

    const def = COMMANDS[command];
    if (!def) {
      await bot.sendMessage(
        chatId,
        esc(`❓ Unknown command: /${command}\n\nType /help for available commands.`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    try {
      const sanitizedArgs = sanitizeArgs(args);
      await def.handler(bot, msg, sanitizedArgs);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("Command handler error", {
        command,
        userId,
        chatId,
        error: errMsg,
      });

      try {
        await bot.sendMessage(
          chatId,
          esc("❌ Something went wrong processing your command. Please try again later."),
          { parse_mode: "MarkdownV2" }
        );
      } catch (sendErr) {
        logger.error("Failed to send error message to user", {
          error: String(sendErr),
        });
      }
    }
  });

  logger.info("Commands registered", {
    commands: Object.keys(COMMANDS),
  });
}

// ── Custom amount input handler ──────────────────────────────────────────────

const APP_BASE_URL = process.env.BOT_APP_BASE_URL || "https://hedgelp.app";

async function handleCustomAmountInput(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  userId: number,
  chatId: number,
  flow: string
): Promise<void> {
  const raw = msg.text?.trim() ?? "";
  const amount = parseFloat(raw.replace(/[,$\s]/g, ""));

  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ Please enter a valid number (e.g., 2500):"),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const v = getVaultState();

  if (flow === "deposit") {
    if (amount < v.minDeposit || amount > v.maxDeposit) {
      await bot.sendMessage(
        chatId,
        esc(`⚠️ Deposit must be between ${fmtUsd(v.minDeposit)} and ${fmtUsd(v.maxDeposit)}`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }

    sessionStore.update(userId, "confirm_deposit", { amount });

    const shares = amount / v.sharePrice;
    const lpAlloc = amount * (v.lpAllocationPct / 100);
    const hedgeAlloc = amount * (v.hedgeAllocationPct / 100);

    const preview = [
      bold(esc("💰 Deposit Preview")),
      "",
      divider(),
      esc(`Amount: ${fmtUsd(amount)} USDC`),
      esc(`Estimated shares: ~${fmtNum(shares, 2)} HLP`),
      "",
      esc(`Allocation:`),
      esc(`  📊 ${v.lpAllocationPct}% → LP: ${fmtUsd(lpAlloc)}`),
      esc(`  🛡️ ${v.hedgeAllocationPct}% → Hedge: ${fmtUsd(hedgeAlloc)}`),
      esc(`  APR: ${fmtNum(v.estimatedAPR, 1)}%`),
    ].join("\n");

    await bot.sendMessage(chatId, preview, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm Deposit", callback_data: "deposit:confirm" },
            { text: "❌ Cancel", callback_data: "deposit:cancel" },
          ],
        ],
      },
    });
  } else if (flow === "withdraw") {
    sessionStore.update(userId, "confirm_withdraw", { amount });

    const sharesRedeemed = amount / v.sharePrice;

    const preview = [
      bold(esc("📤 Withdraw Preview")),
      "",
      divider(),
      esc(`Amount: ${fmtUsd(amount)} USDC`),
      esc(`Shares to redeem: ~${fmtNum(sharesRedeemed, 2)} HLP`),
      "",
      esc(`Unwinding:`),
      esc(`  📊 ~${fmtUsd(amount * v.lpAllocationPct / 100)} from LP`),
      esc(`  🛡️ ~${fmtUsd(amount * v.hedgeAllocationPct / 100)} from Hedge`),
    ].join("\n");

    await bot.sendMessage(chatId, preview, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm Withdraw", callback_data: "withdraw:confirm" },
            { text: "❌ Cancel", callback_data: "withdraw:cancel" },
          ],
        ],
      },
    });
  }
}

// ── Custom allocation input handler (rebalance) ─────────────────────────────

async function handleCustomAllocationInput(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  userId: number,
  chatId: number
): Promise<void> {
  const raw = msg.text?.trim() ?? "";
  const pct = parseInt(raw.replace(/[%\s]/g, ""), 10);

  if (isNaN(pct) || pct < 50 || pct > 95) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ Please enter a number between 50 and 95 (e.g., 72):"),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const hedgePct = 100 - pct;
  const v = getVaultState();
  const simLpFee = 22.5 * (pct / 80);
  const simFunding = -4.1 * (hedgePct / 20);
  const simAPR = simLpFee + simFunding;

  sessionStore.update(userId, "confirm_allocation", { newLpPct: pct });

  const preview = [
    bold(esc("⚖️ Rebalance Preview")),
    "",
    divider(),
    esc(`Current: ${v.lpAllocationPct}% LP / ${v.hedgeAllocationPct}% Hedge → APR ${fmtNum(v.estimatedAPR, 1)}%`),
    esc(`    ↓`),
    esc(`New:     ${pct}% LP / ${hedgePct}% Hedge → APR ~${fmtNum(simAPR, 1)}%`),
    "",
    hedgePct < 15
      ? esc("⚠️ Low hedge — reduced downside protection")
      : hedgePct < 10
        ? esc("🚨 Very low hedge — high IL risk")
        : esc("✅ Healthy hedge ratio"),
    "",
    esc("Proceed to wallet connection?"),
  ].join("\n");

  await bot.sendMessage(chatId, preview, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔗 Connect Wallet & Sign", callback_data: "rebalance:confirm" },
          { text: "❌ Cancel", callback_data: "rebalance:cancel" },
        ],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

// ── Command parsing ──────────────────────────────────────────────────────────

interface ParsedCommand {
  command: string;
  args: string;
}

function parseCommand(text: string): ParsedCommand | null {
  if (!text.startsWith("/")) return null;

  const parts = text.slice(1).split(/\s+/);
  const commandPart = parts[0].toLowerCase();
  const command = commandPart.split("@")[0];
  if (!command) return null;

  const args = parts.slice(1).join(" ");
  return { command, args };
}

/** Expose for graceful shutdown */
export function destroyRateLimiter(): void {
  rateLimiter.destroy();
}
