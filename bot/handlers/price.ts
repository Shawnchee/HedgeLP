/**
 * /price command handler.
 *
 * Usage: /price <symbol|id> [symbol2 ...]
 * Examples: /price eth, /price btc sol uni
 */

import type TelegramBot from "node-telegram-bot-api";
import { fetchPrices, type MarketPriceItem } from "../services/api-client";
import { resolveTokenIds } from "../utils/token-map";
import {
  esc,
  bold,
  code,
  fmtUsd,
  fmtPct,
  fmtCompact,
  changeArrow,
  divider,
} from "../utils/formatters";
import { logger } from "../utils/logger";

const MAX_TOKENS_PER_QUERY = 10;

export async function handlePrice(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string
): Promise<void> {
  const chatId = msg.chat.id;

  // ── Validate input ───────────────────────────────────────────────────────

  if (!args.trim()) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ Please provide a token symbol.\n\nUsage: /price <symbol>\nExamples: /price eth, /price btc sol"),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const ids = resolveTokenIds(args);

  if (ids.length === 0) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ Could not parse any valid token identifiers."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  if (ids.length > MAX_TOKENS_PER_QUERY) {
    await bot.sendMessage(
      chatId,
      esc(`⚠️ Too many tokens. Maximum is ${MAX_TOKENS_PER_QUERY} per query.`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // ── Fetch data ───────────────────────────────────────────────────────────

  const result = await fetchPrices(ids);

  if (!result.ok) {
    logger.error("Price fetch failed", { ids, error: result.message });
    await bot.sendMessage(
      chatId,
      esc(`❌ Failed to fetch prices: ${result.message}`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const coins = result.data;

  if (!coins || coins.length === 0) {
    const notFound = ids.join(", ");
    await bot.sendMessage(
      chatId,
      esc(`⚠️ No data found for: ${notFound}\n\nMake sure you're using a valid CoinGecko ID or supported symbol.`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // ── Format response ──────────────────────────────────────────────────────

  const lines: string[] = [bold("Token Prices"), ""];

  for (const coin of coins) {
    lines.push(...formatCoinEntry(coin));
    lines.push("");
  }

  // Note any IDs that weren't found
  const foundIds = new Set(coins.map((c) => c.id));
  const missing = ids.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    lines.push(divider());
    lines.push(esc(`⚠️ Not found: ${missing.join(", ")}`));
  }

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "MarkdownV2",
  });
}

function formatCoinEntry(coin: MarketPriceItem): string[] {
  const change24h = coin.price_change_percentage_24h_in_currency;
  const change7d = coin.price_change_percentage_7d_in_currency;
  const arrow = changeArrow(change24h);

  return [
    divider(),
    `${arrow} ${bold(coin.name)} \\(${code(coin.symbol.toUpperCase())}\\)`,
    esc(`  Price: ${fmtUsd(coin.current_price)}`),
    esc(`  24h: ${fmtPct(change24h)}  |  7d: ${fmtPct(change7d)}`),
    esc(`  24h High/Low: ${fmtUsd(coin.high_24h)} / ${fmtUsd(coin.low_24h)}`),
    esc(`  Volume: $${fmtCompact(coin.total_volume)}  |  MCap: $${fmtCompact(coin.market_cap)}`),
  ];
}
