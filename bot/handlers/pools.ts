/**
 * /pools and /apy command handlers.
 *
 * /pools — Shows top Uniswap/Curve/Aave pools by TVL (matching the app's pool page)
 * /apy   — Shows top pools sorted by APY
 *
 * Data source: DeFiLlama yields API via /api/pools, filtered to match
 * the app's `use-pool-data.ts` hook logic (Uniswap + Curve + Aave, $1M+ TVL).
 */

import type TelegramBot from "node-telegram-bot-api";
import { fetchPools, type PoolItem } from "../services/api-client";
import { config } from "../config";
import {
  esc,
  bold,
  code,
  fmtCompact,
  fmtNum,
  divider,
} from "../utils/formatters";
import { logger } from "../utils/logger";

// ── Filters matching app/hooks/use-pool-data.ts ──────────────────────────────

/** Projects the app tracks — Uniswap (v2/v3/v4), Curve, and Aave */
function isTrackedProject(project: string): boolean {
  const p = project.toLowerCase();
  return (
    p.includes("uniswap") ||
    p.includes("curve") ||
    p.includes("aave")
  );
}

/** Minimum TVL matching useTopPools filter ($1M) */
const MIN_TVL = 1_000_000;

/** Parse Uniswap version from project name */
function parseVersion(project: string): string {
  const p = project.toLowerCase();
  if (p.includes("v4")) return "v4";
  if (p.includes("v3")) return "v3";
  return "v2";
}

/** Parse fee tier from poolMeta */
function parseFee(poolMeta?: string): string {
  if (!poolMeta) return "0.3%";
  const match = poolMeta.match(/(\d+\.?\d*)%?/);
  if (match) {
    const val = parseFloat(match[1]);
    return val < 1 ? `${val}%` : `${(val / 10000).toFixed(4)}%`;
  }
  return "0.3%";
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function handlePools(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string
): Promise<void> {
  await sendPoolsSorted(bot, msg.chat.id, "tvl", args);
}

export async function handleApy(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  args: string
): Promise<void> {
  await sendPoolsSorted(bot, msg.chat.id, "apy", args);
}

async function sendPoolsSorted(
  bot: TelegramBot,
  chatId: number,
  sortBy: "tvl" | "apy",
  filterArg: string
): Promise<void> {
  const result = await fetchPools();

  if (!result.ok) {
    logger.error("Pools fetch failed", { error: result.message });
    await bot.sendMessage(
      chatId,
      esc(`❌ Failed to fetch pools: ${result.message}`),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  let pools: PoolItem[] = result.data?.data ?? [];

  if (!pools || pools.length === 0) {
    await bot.sendMessage(
      chatId,
      esc("⚠️ No pool data available at the moment."),
      { parse_mode: "MarkdownV2" }
    );
    return;
  }

  // ── Filter ─────────────────────────────────────────────────────────────

  const filterToken = filterArg.trim().toLowerCase();

  if (filterToken) {
    // User-specified filter: search across project, symbol, chain
    pools = pools.filter(
      (p) =>
        p.project?.toLowerCase().includes(filterToken) ||
        p.symbol?.toLowerCase().includes(filterToken) ||
        p.chain?.toLowerCase().includes(filterToken)
    );

    if (pools.length === 0) {
      await bot.sendMessage(
        chatId,
        esc(`⚠️ No pools found matching "${filterArg.trim()}".\n\nTry: /pools uniswap, /pools curve, /pools ethereum`),
        { parse_mode: "MarkdownV2" }
      );
      return;
    }
  } else {
    // Default: Uniswap + Curve + Aave with $1M+ TVL (matching app logic)
    pools = pools.filter(
      (p) =>
        p.tvlUsd >= MIN_TVL && isTrackedProject(p.project ?? "")
    );
  }

  // ── Sort ───────────────────────────────────────────────────────────────

  if (sortBy === "apy") {
    pools.sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0));
  } else {
    pools.sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0));
  }

  // ── Format ─────────────────────────────────────────────────────────────

  const count = Math.min(pools.length, config.topPoolsCount);
  const topPools = pools.slice(0, count);

  const title =
    sortBy === "apy"
      ? bold(`Top ${count} Pools by APY`)
      : bold(`Top ${count} Pools by TVL`);

  const subtitle = filterToken
    ? esc(`Filter: "${filterArg.trim()}"`)
    : esc("Uniswap · Curve · Aave");

  const lines: string[] = [title, subtitle, ""];

  for (let i = 0; i < topPools.length; i++) {
    const p = topPools[i];
    const version = parseVersion(p.project ?? "");
    const fee = parseFee((p as any).poolMeta);

    lines.push(divider());

    // Pool name with version tag
    const poolLabel = p.symbol
      ? p.symbol.replace(/-/g, " / ")
      : "Unknown";

    lines.push(
      `${esc(`${i + 1}.`)} ${bold(poolLabel)} ${esc("on")} ${code(p.project || "?")} \\(${esc(version)}\\)`
    );
    lines.push(esc(`   Chain: ${p.chain || "?"}  |  Fee: ${fee}`));
    lines.push(esc(`   TVL: $${fmtCompact(p.tvlUsd)}`));

    const apyTotal = fmtNum(p.apy, 2);
    const apyBase = p.apyBase != null ? fmtNum(p.apyBase, 2) : "N/A";
    const apyReward = p.apyReward != null ? fmtNum(p.apyReward, 2) : "N/A";
    lines.push(esc(`   APY: ${apyTotal}% (base: ${apyBase}% + reward: ${apyReward}%)`));

    if (p.stablecoin) {
      lines.push(esc("   🏷️ Stablecoin pool"));
    }
    lines.push("");
  }

  // ── Pool stats summary ─────────────────────────────────────────────────

  const totalTvl = pools.reduce((sum, p) => sum + (p.tvlUsd ?? 0), 0);
  const avgApy =
    pools.length > 0
      ? pools.reduce((sum, p) => sum + (p.apy ?? 0), 0) / pools.length
      : 0;

  lines.push(divider());
  lines.push(
    esc(`Showing ${count} of ${pools.length} pools  |  Total TVL: $${fmtCompact(totalTvl)}  |  Avg APY: ${fmtNum(avgApy, 2)}%`)
  );
  lines.push("");
  lines.push(esc("💡 Filter by project/chain: /pools curve, /pools arbitrum"));

  await bot.sendMessage(chatId, lines.join("\n"), {
    parse_mode: "MarkdownV2",
  });
}
