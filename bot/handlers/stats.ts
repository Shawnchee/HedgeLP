/**
 * /stats command handler.
 *
 * Shows global crypto market overview from CoinGecko.
 */

import type TelegramBot from "node-telegram-bot-api";
import { fetchMarketStats } from "../services/api-client";
import { esc, bold, fmtCompact, fmtPct, divider } from "../utils/formatters";
import { logger } from "../utils/logger";

export async function handleStats(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;

  const result = await fetchMarketStats();

  if (!result.ok) {
    logger.error("Market stats fetch failed", { error: result.message });
    await bot.sendMessage(
      chatId,
      esc(`❌ Failed to fetch market stats: ${result.message}`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const stats = result.data?.data;

  if (!stats) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ Market data unavailable at the moment."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const totalMcap = stats.total_market_cap?.usd;
  const totalVolume = stats.total_volume?.usd;
  const mcapChange = stats.market_cap_change_percentage_24h_usd;
  const btcDom = stats.market_cap_percentage?.btc;
  const ethDom = stats.market_cap_percentage?.eth;

  const lines: string[] = [
    bold("Global Market Overview") + " " + esc("🌍"),
    "",
    divider(),
    "",
    esc(`Total Market Cap: $${fmtCompact(totalMcap)}`),
    esc(`24h Volume: $${fmtCompact(totalVolume)}`),
    esc(`Market Cap Change (24h): ${fmtPct(mcapChange)}`),
    "",
    divider(),
    "",
    bold("Dominance"),
    esc(`  BTC: ${btcDom?.toFixed(1) ?? "N/A"}%`),
    esc(`  ETH: ${ethDom?.toFixed(1) ?? "N/A"}%`),
    "",
    divider(),
    "",
    esc(`Active Cryptocurrencies: ${stats.active_cryptocurrencies?.toLocaleString() ?? "N/A"}`),
    esc(`Exchanges: ${stats.markets?.toLocaleString() ?? "N/A"}`),
  ];

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "MarkdownV2",
  });
}
