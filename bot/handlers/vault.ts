/**
 * /vault command handler — Interactive vault status with inline keyboard.
 *
 * Shows HedgeLP vault overview and provides action buttons:
 *   - Deposit / Withdraw / Rebalance / Refresh
 *
 * Currently uses mock data (dashboard-matching).
 * Will switch to on-chain reads once contracts deploy.
 */

import type TelegramBot from "node-telegram-bot-api";
import { fetchPrices } from "../services/api-client";
import { getVaultState } from "../services/mock-vault";
import {
  esc,
  bold,
  code,
  italic,
  fmtUsd,
  fmtNum,
  fmtPct,
  fmtCompact,
  divider,
} from "../utils/formatters";
import { logger } from "../utils/logger";

// ── Build vault message ──────────────────────────────────────────────────────

export async function buildVaultMessage(): Promise<string> {
  const v = getVaultState();

  // Fetch live ETH price
  let ethPrice = 2_500;
  try {
    const priceResult = await fetchPrices(["ethereum"]);
    if (priceResult.ok && priceResult.data.length > 0) {
      ethPrice = priceResult.data[0].current_price;
    }
  } catch {
    logger.warn("Could not fetch ETH price for vault display");
  }

  const lpValue = v.tvl * (v.lpAllocationPct / 100);
  const hedgeValue = v.tvl * (v.hedgeAllocationPct / 100);
  const hedgeSize = hedgeValue / ethPrice;
  const liquidationPrice = ethPrice * 1.85;

  const lines: string[] = [
    bold(esc("HedgeLP Delta-Neutral Vault")),
    code(v.status) + " " + esc("· Arbitrum, Base"),
    "",

    divider(),
    bold(esc("Strategy")),
    esc(`  ${v.lpAllocationPct}% LP → ${v.lpPool} on ${v.lpProtocol} (${v.lpFee})`),
    esc(`  ${v.hedgeAllocationPct}% Hedge → ${v.hedgeType} via ${v.hedgeProtocol}`),
    esc(`  Rebalance trigger: >${v.rebalanceThresholdPct}% deviation`),
    "",

    divider(),
    bold(esc("Performance")),
    esc(`  Estimated APR: ${fmtNum(v.estimatedAPR, 1)}%`),
    esc(`    LP Fees:    +${fmtNum(v.lpFeeAPY, 1)}%`),
    esc(`    Funding:    ${fmtNum(v.fundingCostAPY, 1)}%`),
    "",

    divider(),
    bold(esc("Vault Stats")),
    esc(`  TVL: $${fmtCompact(v.tvl)}  |  Share: ${fmtUsd(v.sharePrice)}`),
    esc(`  Utilization: ${fmtNum(v.vaultUtilization, 1)}%`),
    esc(`  Deposit range: ${fmtUsd(v.minDeposit)} – ${fmtUsd(v.maxDeposit)}`),
    "",

    divider(),
    bold(esc("Positions")) + " " + esc(`(ETH @ ${fmtUsd(ethPrice)})`),
    esc(`  📊 LP: $${fmtCompact(lpValue)} in ${v.lpPool}`),
    esc(`  🛡️ Hedge: $${fmtCompact(hedgeValue)} · ${fmtNum(hedgeSize, 2)} ETH short`),
    esc(`  💀 Liq. price: ~${fmtUsd(liquidationPrice)}`),
    "",

    divider(),
    bold(esc("Health")),
    esc(`  ${v.healthy ? "✅" : "⚠️"} Factor: ${fmtNum(v.healthFactor, 2)}  |  Funding: ${fmtPct(v.currentFundingRate)}/8h`),
    esc(`  ${v.needsRebalance ? "🔄 Rebalance needed" : "✅ Balanced"}  |  Last: ${v.lastRebalance}`),
    "",

    italic(esc("Simulated data — on-chain reads activate after deploy.")),
  ];

  return lines.join("\n");
}

// ── Inline keyboard ──────────────────────────────────────────────────────────

export function getVaultKeyboard(): TelegramBot.InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        { text: "💰 Deposit", callback_data: "vault:deposit" },
        { text: "📤 Withdraw", callback_data: "vault:withdraw" },
      ],
      [
        { text: "⚖️ Rebalance", callback_data: "vault:rebalance" },
        { text: "🔄 Refresh", callback_data: "vault:refresh" },
      ],
    ],
  };
}

// ── Command handler ──────────────────────────────────────────────────────────

export async function handleVault(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const chatId = msg.chat.id;
  const text = await buildVaultMessage();

  await bot.sendMessage(chatId, text, {
    parse_mode: "MarkdownV2",
    reply_markup: getVaultKeyboard(),
  });
}
