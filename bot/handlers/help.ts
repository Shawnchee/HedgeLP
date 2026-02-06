/**
 * /help and /start command handlers.
 */

import type TelegramBot from "node-telegram-bot-api";
import { esc, bold, divider } from "../utils/formatters";

const HELP_TEXT = [
  bold("HedgeLP Bot") + " — " + esc("Read-only DeFi data at your fingertips"),
  "",
  divider(),
  "",
  bold("Vault"),
  "",
  esc("/vault") + " — " + esc("HedgeLP vault status, APR, health & positions"),
  "",
  bold("Market Data"),
  "",
  esc("/price <token>") + " — " + esc("Get current price & 24h stats"),
  esc("  Examples: /price eth, /price btc sol"),
  "",
  esc("/pools [filter]") + " — " + esc("Top Uniswap/Curve/Aave pools by TVL"),
  esc("  Examples: /pools, /pools curve, /pools arbitrum"),
  "",
  esc("/apy [filter]") + " — " + esc("Top pools sorted by APY"),
  "",
  esc("/news") + " — " + esc("Trending coins from CoinGecko"),
  "",
  esc("/stats") + " — " + esc("Global crypto market overview"),
  "",
  esc("/help") + " — " + esc("Show this help message"),
  "",
  divider(),
  "",
  esc("Tip: You can pass multiple tokens to /price separated by spaces."),
  esc("Supported symbols: btc, eth, sol, arb, op, usdc, uni, aave, ..."),
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
    esc("👋 Welcome to ") + bold("HedgeLP Bot") + esc("!"),
    "",
    esc("I can help you check token prices, DeFi pool yields, vault status, and trending coins."),
    "",
    esc("Type /help to see all available commands."),
  ].join("\n");

  await bot.sendMessage(msg.chat.id, welcome, {
    parse_mode: "MarkdownV2",
  });
}
