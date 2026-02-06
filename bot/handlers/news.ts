/**
 * /news command handler.
 *
 * Fetches CoinGecko trending coins as a proxy for "crypto news / what's hot."
 */

import type TelegramBot from "node-telegram-bot-api";
import { fetchTrending } from "../services/api-client";
import { esc, bold, code, fmtUsd, fmtPct, divider } from "../utils/formatters";
import { logger } from "../utils/logger";

const MAX_TRENDING = 10;

export async function handleNews(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;

  const result = await fetchTrending();

  if (!result.ok) {
    logger.error("Trending fetch failed", { error: result.message });
    await bot.sendMessage(
      chatId,
      esc(`❌ Failed to fetch trending data: ${result.message}`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const coins = result.data?.coins;

  if (!coins || coins.length === 0) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ No trending data available right now."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  const lines: string[] = [bold("Trending Coins") + " " + esc("🔥"), ""];

  const count = Math.min(coins.length, MAX_TRENDING);

  for (let i = 0; i < count; i++) {
    const { item } = coins[i];
    const rank = item.market_cap_rank ? `#${item.market_cap_rank}` : "N/A";

    lines.push(divider());
    lines.push(
      `${esc(`${i + 1}.`)} ${bold(item.name)} \\(${code(item.symbol.toUpperCase())}\\)`
    );
    lines.push(esc(`   Market Cap Rank: ${rank}`));

    // Include price data if available (newer CoinGecko API versions)
    if (item.data) {
      if (item.data.price != null) {
        lines.push(esc(`   Price: ${fmtUsd(item.data.price)}`));
      }
      const change24h = item.data.price_change_percentage_24h?.usd;
      if (change24h != null) {
        lines.push(esc(`   24h Change: ${fmtPct(change24h)}`));
      }
      if (item.data.market_cap) {
        lines.push(esc(`   Market Cap: ${item.data.market_cap}`));
      }
    }

    lines.push("");
  }

  lines.push(divider());
  lines.push(esc("Data from CoinGecko Trending"));

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "MarkdownV2",
  });
}
