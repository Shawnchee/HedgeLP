/**
 * /help and /start command handlers.
 */

import type TelegramBot from "node-telegram-bot-api";
import { esc, bold, code, divider } from "../utils/formatters";

const HELP_TEXT = [
  bold("HedgeLP Army Bot") + " — " + esc("DeFi data & vault management"),
  "",
  divider(),
  "",
  // ── Vault ──────────────────────────────────────────
  bold("🏦 Vault"),
  "",
  code("/vault") + " — " + esc("Vault status, APR, TVL & positions"),
  esc("  → Tap Deposit / Withdraw / Rebalance buttons"),
  esc("  → Rebalance supports preset or custom % (50–95)"),
  "",
  // ── Market Data ────────────────────────────────────
  bold("📊 Market Data"),
  "",
  code("/price <token>") + " — " + esc("Token price & 24h stats"),
  esc("  /price eth          — single token"),
  esc("  /price btc sol uni  — multiple tokens"),
  esc("  /price arb          — any CoinGecko-listed token"),
  "",
  code("/pools [filter]") + " — " + esc("Top pools by TVL (Uniswap/Curve/Aave)"),
  esc("  /pools              — all chains, sorted by TVL"),
  esc("  /pools ethereum     — filter by chain"),
  esc("  /pools curve        — filter by protocol"),
  esc("  /pools arbitrum     — filter by L2"),
  "",
  code("/apy [filter]") + " — " + esc("Top pools sorted by APY"),
  esc("  /apy                — highest APY across all pools"),
  esc("  /apy ethereum       — best APY on Ethereum"),
  esc("  /apy uniswap        — best Uniswap APY"),
  "",
  code("/news") + " — " + esc("Trending coins on CoinGecko"),
  "",
  code("/stats") + " — " + esc("Global crypto market overview"),
  "",
  // ── Utility ────────────────────────────────────────
  bold("🛠 Utility"),
  "",
  code("/clear") + " — " + esc("Clear bot messages from this chat"),
  code("/help") + " — " + esc("Show this help message"),
  "",
  divider(),
  "",
  esc("💡 Supported symbols: btc, eth, sol, arb, op, usdc, uni, aave, link, matic, ..."),
].join("\n");

export async function handleHelp(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  await bot.sendMessage(msg.chat.id, HELP_TEXT, {
    parse_mode: "MarkdownV2",
  });
}

export async function handleStart(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const welcome = [
    esc("👋 Welcome to ") + bold("HedgeLP Army Bot") + esc("!"),
    "",
    esc("I can help you check token prices, DeFi pool yields, vault status, and trending coins."),
    "",
    esc("Type /help to see all available commands."),
  ].join("\n");

  await bot.sendMessage(msg.chat.id, welcome, {
    parse_mode: "MarkdownV2",
  });
}

/**
 * /clear — Bulk-delete recent bot messages from the chat.
 *
 * Telegram only allows deleting messages < 48h old and the bot can only
 * delete its own messages (or any message in groups where it is admin).
 * We delete up to `count` most-recent messages starting from the user's
 * /clear command itself.
 */
const DEFAULT_CLEAR_COUNT = 50;
const MAX_CLEAR_COUNT = 200;

export async function handleClear(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string
): Promise<void> {
  const chatId = msg.chat.id;
  const requestedCount = parseInt(args, 10);
  const count = Math.min(
    Number.isFinite(requestedCount) && requestedCount > 0 ? requestedCount : DEFAULT_CLEAR_COUNT,
    MAX_CLEAR_COUNT
  );

  // Delete the /clear command itself first
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch {
    // May fail if bot lacks permission — continue anyway
  }

  let deleted = 0;
  // Walk backwards from the message just before /clear
  for (let id = msg.message_id - 1; id > msg.message_id - count - 1 && id > 0; id--) {
    try {
      await bot.deleteMessage(chatId, id);
      deleted++;
    } catch {
      // Skip messages we can't delete (other users', too old, already gone)
    }
  }

  // Send a brief confirmation, then auto-delete it after 3 seconds
  const confirmation = await bot.sendMessage(
    chatId,
    esc(`🧹 Cleared ${deleted} message${deleted !== 1 ? "s" : ""}.`),
    { parse_mode: "MarkdownV2" }
  );

  setTimeout(async () => {
    try {
      await bot.deleteMessage(chatId, confirmation.message_id);
    } catch {
      // ignore
    }
  }, 3000);
}
