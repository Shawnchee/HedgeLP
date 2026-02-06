/**
 * Callback query handler — processes inline keyboard button presses.
 *
 * Full interactive flows with simulated wallet connection + tx signing:
 *   1. Select parameters (amount / allocation)
 *   2. Preview the action
 *   3. Connect Wallet  →  shows mock wallet address
 *   4. Sign Transaction →  shows "broadcasting..." then mock tx receipt
 *   5. Success screen with tx hash
 */

import type TelegramBot from "node-telegram-bot-api";
import { sessionStore } from "../services/session-store";
import {
  getVaultState,
  rebalanceVault,
  depositToVault,
  withdrawFromVault,
} from "../services/mock-vault";
import { buildVaultMessage, getVaultKeyboard } from "./vault";
import {
  esc,
  bold,
  code,
  italic,
  fmtUsd,
  fmtNum,
  fmtCompact,
  divider,
} from "../utils/formatters";
import { logger } from "../utils/logger";

// ── Mock wallet helpers ──────────────────────────────────────────────────────

function randomAddress(): string {
  const hex = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += hex[Math.floor(Math.random() * 16)];
  return addr;
}

function randomTxHash(): string {
  const hex = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += hex[Math.floor(Math.random() * 16)];
  return hash;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

const EXPLORER_BASE = "https://arbiscan.io/tx/";

// ── Main dispatcher ──────────────────────────────────────────────────────────

export function registerCallbackHandler(bot: TelegramBot): void {
  bot.on("callback_query", async (query) => {
    const userId = query.from.id;
    const chatId = query.message?.chat.id;
    const messageId = query.message?.message_id;
    const data = query.data ?? "";

    if (!chatId || !messageId) {
      await bot.answerCallbackQuery(query.id);
      return;
    }

    logger.info("Callback query", { userId, chatId, data });

    try {
      // ── Vault top-level ────────────────────────────────────────────────
      if (data === "vault:refresh") {
        await handleRefresh(bot, query, chatId, messageId);
        return;
      }
      if (data === "vault:deposit") {
        await handleDepositStart(bot, query, chatId, userId);
        return;
      }
      if (data === "vault:withdraw") {
        await handleWithdrawStart(bot, query, chatId, userId);
        return;
      }
      if (data === "vault:rebalance") {
        await handleRebalanceStart(bot, query, chatId, userId);
        return;
      }
      if (data === "vault:back") {
        sessionStore.clear(userId);
        const text = await buildVaultMessage();
        await bot.editMessageText(text, {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: "MarkdownV2",
          reply_markup: getVaultKeyboard(),
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // ── Flow actions ───────────────────────────────────────────────────
      if (data.startsWith("rebalance:")) {
        await handleRebalanceAction(bot, query, chatId, messageId, userId, data);
        return;
      }
      if (data.startsWith("deposit:")) {
        await handleDepositAction(bot, query, chatId, messageId, userId, data);
        return;
      }
      if (data.startsWith("withdraw:")) {
        await handleWithdrawAction(bot, query, chatId, messageId, userId, data);
        return;
      }

      // ── Wallet connection + signing (shared across all flows) ──────────
      if (data === "wallet:connect") {
        await handleWalletConnect(bot, query, chatId, messageId, userId);
        return;
      }
      if (data === "wallet:sign") {
        await handleWalletSign(bot, query, chatId, messageId, userId);
        return;
      }

      // ── Cancel ─────────────────────────────────────────────────────────
      if (data === "flow:cancel") {
        sessionStore.clear(userId);
        await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
        await bot.editMessageText(
          esc("❌ Action cancelled\\.") + "\n\n" + esc("Use /vault to start again."),
          { chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2" }
        );
        return;
      }

      await bot.answerCallbackQuery(query.id, { text: "Unknown action" });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error("Callback handler error", { data, userId, error: errMsg });
      try {
        await bot.answerCallbackQuery(query.id, {
          text: "Something went wrong. Try again.",
          show_alert: true,
        });
      } catch { /* ignore */ }
    }
  });

  logger.info("Callback query handler registered");
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALLET CONNECTION + SIGNING (shared by all flows)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleWalletConnect(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  userId: number
): Promise<void> {
  const session = sessionStore.get(userId);
  if (!session) {
    await bot.answerCallbackQuery(query.id, { text: "Session expired. Use /vault", show_alert: true });
    return;
  }

  // Simulate wallet connection delay
  await bot.answerCallbackQuery(query.id, { text: "Connecting wallet..." });

  const walletAddr = randomAddress();
  sessionStore.update(userId, "wallet_connected", { walletAddr });

  // Show "connecting..." briefly
  await bot.editMessageText(
    bold(esc("🔗 Connecting Wallet")) + "\n\n" +
    esc("⏳ Requesting wallet connection..."),
    { chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2" }
  );

  // Simulate ~2s connection delay
  await sleep(1500);

  // Build the tx summary based on flow type
  const txSummary = buildTxSummary(session);

  const text = [
    bold(esc("🔗 Wallet Connected")),
    "",
    esc(`✅ Connected: `) + code(shortAddr(walletAddr)),
    esc(`Network: Arbitrum One`),
    esc(`Balance: 12,450.00 USDC`),
    "",
    divider(),
    bold(esc("Transaction Details")),
    ...txSummary,
    "",
    divider(),
    "",
    esc("⚠️ Please review and sign the transaction:"),
  ].join("\n");

  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✍️ Sign Transaction", callback_data: "wallet:sign" },
        ],
        [
          { text: "❌ Reject", callback_data: "flow:cancel" },
        ],
      ],
    },
  });
}

async function handleWalletSign(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  userId: number
): Promise<void> {
  const session = sessionStore.get(userId);
  if (!session) {
    await bot.answerCallbackQuery(query.id, { text: "Session expired. Use /vault", show_alert: true });
    return;
  }

  await bot.answerCallbackQuery(query.id, { text: "Signing..." });

  const walletAddr = (session.data.walletAddr as string) || randomAddress();
  const txHash = randomTxHash();

  // Show signing state
  await bot.editMessageText(
    bold(esc("✍️ Signing Transaction")) + "\n\n" +
    esc("⏳ Waiting for signature from ") + code(shortAddr(walletAddr)) + esc("..."),
    { chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2" }
  );

  await sleep(1200);

  // Show broadcasting state
  await bot.editMessageText(
    bold(esc("📡 Broadcasting Transaction")) + "\n\n" +
    esc("⏳ Submitting to Arbitrum network...\n") +
    esc("Tx: ") + code(shortHash(txHash)),
    { chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2" }
  );

  await sleep(2000);

  // Show confirmation state
  await bot.editMessageText(
    bold(esc("⛓️ Confirming")) + "\n\n" +
    esc("⏳ Waiting for block confirmation (1/2)...\n") +
    esc("Tx: ") + code(shortHash(txHash)),
    { chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2" }
  );

  await sleep(1500);

  // Execute the mock action and show final result
  const result = executeMockAction(session);
  sessionStore.clear(userId);

  const text = [
    bold(esc("✅ Transaction Confirmed")),
    "",
    divider(),
    esc("Tx: ") + code(shortHash(txHash)),
    esc(`Block: #${(182_345_678 + Math.floor(Math.random() * 1000)).toLocaleString()}`),
    esc("Gas used: 0.000342 ETH ($0.85)"),
    esc(`From: `) + code(shortAddr(walletAddr)),
    "",
    divider(),
    ...result,
    "",
    divider(),
    esc(`🔍 `) + esc(`${EXPLORER_BASE}${txHash}`),
  ].join("\n");

  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

// ── Build transaction summary lines based on flow ────────────────────────────

function buildTxSummary(session: ReturnType<typeof sessionStore.get>): string[] {
  if (!session) return [esc("Unknown transaction")];
  const v = getVaultState();

  switch (session.flow) {
    case "deposit": {
      const amount = (session.data.amount as number) || 0;
      return [
        esc(`  Action: Deposit`),
        esc(`  Amount: ${fmtUsd(amount)} USDC`),
        esc(`  To: HedgeLP Vault (Arbitrum)`),
        esc(`  Estimated shares: ~${fmtNum(amount / v.sharePrice, 2)} HLP`),
        esc(`  Gas estimate: ~0.000342 ETH`),
      ];
    }
    case "withdraw": {
      const amount = (session.data.amount as number) || 0;
      return [
        esc(`  Action: Withdraw`),
        esc(`  Amount: ${fmtUsd(amount)} USDC`),
        esc(`  From: HedgeLP Vault (Arbitrum)`),
        esc(`  Shares to burn: ~${fmtNum(amount / v.sharePrice, 2)} HLP`),
        esc(`  Gas estimate: ~0.000521 ETH`),
      ];
    }
    case "rebalance": {
      const newLpPct = (session.data.newLpPct as number) || 80;
      return [
        esc(`  Action: Rebalance`),
        esc(`  Current: ${v.lpAllocationPct}% LP / ${v.hedgeAllocationPct}% Hedge`),
        esc(`  Target:  ${newLpPct}% LP / ${100 - newLpPct}% Hedge`),
        esc(`  Vault: HedgeLP (Arbitrum)`),
        esc(`  Gas estimate: ~0.000815 ETH`),
      ];
    }
    default:
      return [esc("Unknown transaction")];
  }
}

// ── Execute mock action and return result lines ──────────────────────────────

function executeMockAction(session: ReturnType<typeof sessionStore.get>): string[] {
  if (!session) return [esc("Error: no session")];

  switch (session.flow) {
    case "deposit": {
      const amount = (session.data.amount as number) || 0;
      const newState = depositToVault(amount);
      const shares = amount / newState.sharePrice;
      return [
        bold(esc("Deposit Complete")),
        "",
        esc(`💰 Deposited: ${fmtUsd(amount)} USDC`),
        esc(`🪙 Shares minted: ${fmtNum(shares, 4)} HLP`),
        esc(`  📊 ${newState.lpAllocationPct}% → LP: $${fmtCompact(amount * newState.lpAllocationPct / 100)}`),
        esc(`  🛡️ ${newState.hedgeAllocationPct}% → Hedge: $${fmtCompact(amount * newState.hedgeAllocationPct / 100)}`),
        "",
        esc(`Vault TVL: $${fmtCompact(newState.tvl)}`),
        esc(`APR: ${fmtNum(newState.estimatedAPR, 1)}%`),
      ];
    }
    case "withdraw": {
      const amount = (session.data.amount as number) || 0;
      const v = getVaultState();
      const sharesRedeemed = amount / v.sharePrice;
      const newState = withdrawFromVault(amount);
      return [
        bold(esc("Withdrawal Complete")),
        "",
        esc(`📤 Withdrawn: ${fmtUsd(amount)} USDC`),
        esc(`🪙 Shares burned: ${fmtNum(sharesRedeemed, 4)} HLP`),
        esc(`  📊 Unwound ~$${fmtCompact(amount * v.lpAllocationPct / 100)} from LP`),
        esc(`  🛡️ Unwound ~$${fmtCompact(amount * v.hedgeAllocationPct / 100)} from Hedge`),
        "",
        esc(`Remaining TVL: $${fmtCompact(newState.tvl)}`),
      ];
    }
    case "rebalance": {
      const newLpPct = (session.data.newLpPct as number) || 80;
      const oldState = getVaultState();
      const newState = rebalanceVault(newLpPct);
      return [
        bold(esc("Rebalance Complete")),
        "",
        esc(`⚖️ ${oldState.lpAllocationPct}/${oldState.hedgeAllocationPct} → ${newState.lpAllocationPct}/${newState.hedgeAllocationPct}`),
        esc(`📈 APR: ${fmtNum(oldState.estimatedAPR, 1)}% → ${fmtNum(newState.estimatedAPR, 1)}%`),
        esc(`${newState.healthy ? "✅" : "⚠️"} Health: ${fmtNum(newState.healthFactor, 2)}`),
      ];
    }
    default:
      return [esc("Unknown action completed")];
  }
}

// ── Refresh ──────────────────────────────────────────────────────────────────

async function handleRefresh(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number
): Promise<void> {
  await bot.answerCallbackQuery(query.id, { text: "Refreshing..." });
  const text = await buildVaultMessage();
  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: getVaultKeyboard(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// REBALANCE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

async function handleRebalanceStart(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  userId: number
): Promise<void> {
  const v = getVaultState();
  sessionStore.start(userId, chatId, "rebalance", "select_allocation");

  const text = [
    bold(esc("⚖️ Rebalance Vault")),
    "",
    divider(),
    esc(`Current allocation: ${v.lpAllocationPct}% LP / ${v.hedgeAllocationPct}% Hedge`),
    esc(`Current APR: ${fmtNum(v.estimatedAPR, 1)}%`),
    "",
    esc("Select your target LP allocation:"),
    esc("(Hedge = 100% − LP, range: 50–95%)"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, text, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "60% LP", callback_data: "rebalance:60" },
          { text: "70% LP", callback_data: "rebalance:70" },
          { text: "80% LP ✓", callback_data: "rebalance:80" },
        ],
        [
          { text: "85% LP", callback_data: "rebalance:85" },
          { text: "90% LP", callback_data: "rebalance:90" },
          { text: "95% LP", callback_data: "rebalance:95" },
        ],
        [{ text: "✏️ Custom %", callback_data: "rebalance:custom" }],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

async function handleRebalanceAction(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  userId: number,
  data: string
): Promise<void> {
  const action = data.replace("rebalance:", "");

  if (action === "cancel") {
    sessionStore.clear(userId);
    await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
    await bot.editMessageText(esc("Rebalance cancelled\\."), {
      chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
    });
    return;
  }

  if (action === "confirm") {
    // → Go to wallet connect step
    sessionStore.update(userId, "awaiting_wallet");
    await showConnectWalletPrompt(bot, query, chatId, messageId, userId);
    return;
  }

  if (action === "custom") {
    sessionStore.update(userId, "awaiting_custom_allocation");
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(
      bold(esc("⚖️ Custom Allocation")) + "\n\n" +
      esc("Type your desired LP allocation percentage (50–95):") + "\n" +
      esc("Example: type 72 for 72% LP / 28% Hedge"),
      {
        chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "flow:cancel" }]] },
      }
    );
    return;
  }

  // Allocation selection
  const newLpPct = parseInt(action, 10);
  if (isNaN(newLpPct) || newLpPct < 50 || newLpPct > 95) {
    await bot.answerCallbackQuery(query.id, { text: "LP must be 50–95%", show_alert: true });
    return;
  }

  const newHedgePct = 100 - newLpPct;
  sessionStore.update(userId, "confirm_allocation", { newLpPct });

  const v = getVaultState();
  const simLpFee = 22.5 * (newLpPct / 80);
  const simFunding = -4.1 * (newHedgePct / 20);
  const simAPR = simLpFee + simFunding;

  const preview = [
    bold(esc("⚖️ Rebalance Preview")),
    "",
    divider(),
    esc(`Current: ${v.lpAllocationPct}% LP / ${v.hedgeAllocationPct}% Hedge → APR ${fmtNum(v.estimatedAPR, 1)}%`),
    esc(`    ↓`),
    esc(`New:     ${newLpPct}% LP / ${newHedgePct}% Hedge → APR ~${fmtNum(simAPR, 1)}%`),
    "",
    newHedgePct < 15
      ? esc("⚠️ Low hedge — reduced downside protection")
      : esc("✅ Healthy hedge ratio"),
    "",
    esc("Proceed to wallet connection?"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.editMessageText(preview, {
    chat_id: chatId,
    message_id: messageId,
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

// ═══════════════════════════════════════════════════════════════════════════════
// DEPOSIT FLOW
// ═══════════════════════════════════════════════════════════════════════════════

async function handleDepositStart(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  userId: number
): Promise<void> {
  const v = getVaultState();
  sessionStore.start(userId, chatId, "deposit", "select_amount");

  const text = [
    bold(esc("💰 Deposit to Vault")),
    "",
    divider(),
    esc(`Vault TVL: $${fmtCompact(v.tvl)}`),
    esc(`Share Price: ${fmtUsd(v.sharePrice)}`),
    esc(`Estimated APR: ${fmtNum(v.estimatedAPR, 1)}%`),
    esc(`Min: ${fmtUsd(v.minDeposit)}  |  Max: ${fmtUsd(v.maxDeposit)}`),
    "",
    esc("Select deposit amount (USDC):"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, text, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "$100", callback_data: "deposit:100" },
          { text: "$500", callback_data: "deposit:500" },
          { text: "$1,000", callback_data: "deposit:1000" },
        ],
        [
          { text: "$5,000", callback_data: "deposit:5000" },
          { text: "$10,000", callback_data: "deposit:10000" },
          { text: "$50,000", callback_data: "deposit:50000" },
        ],
        [{ text: "✏️ Custom Amount", callback_data: "deposit:custom" }],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

async function handleDepositAction(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  userId: number,
  data: string
): Promise<void> {
  const action = data.replace("deposit:", "");

  if (action === "cancel") {
    sessionStore.clear(userId);
    await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
    await bot.editMessageText(esc("Deposit cancelled\\."), {
      chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
    });
    return;
  }

  if (action === "custom") {
    sessionStore.update(userId, "awaiting_custom_amount");
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(
      bold(esc("💰 Custom Deposit")) + "\n\n" +
      esc("Type the amount in USDC (e.g., 2500):"),
      {
        chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "flow:cancel" }]] },
      }
    );
    return;
  }

  if (action === "confirm") {
    // → Wallet connect step
    sessionStore.update(userId, "awaiting_wallet");
    await showConnectWalletPrompt(bot, query, chatId, messageId, userId);
    return;
  }

  // Amount selection
  const amount = parseInt(action, 10);
  const v = getVaultState();

  if (isNaN(amount) || amount < v.minDeposit || amount > v.maxDeposit) {
    await bot.answerCallbackQuery(query.id, {
      text: `Amount must be $${v.minDeposit}–$${v.maxDeposit.toLocaleString()}`,
      show_alert: true,
    });
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
    esc(`  📊 ${v.lpAllocationPct}% → LP (${v.lpPool}): ${fmtUsd(lpAlloc)}`),
    esc(`  🛡️ ${v.hedgeAllocationPct}% → Hedge (${v.hedgeType}): ${fmtUsd(hedgeAlloc)}`),
    "",
    esc(`APR: ${fmtNum(v.estimatedAPR, 1)}%`),
    "",
    esc("Proceed to wallet connection?"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.editMessageText(preview, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔗 Connect Wallet & Sign", callback_data: "deposit:confirm" },
          { text: "❌ Cancel", callback_data: "deposit:cancel" },
        ],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WITHDRAW FLOW
// ═══════════════════════════════════════════════════════════════════════════════

async function handleWithdrawStart(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  userId: number
): Promise<void> {
  const v = getVaultState();
  sessionStore.start(userId, chatId, "withdraw", "select_amount");

  const text = [
    bold(esc("📤 Withdraw from Vault")),
    "",
    divider(),
    esc(`Your position: ~$10,000.00 (1,000.00 HLP)`),
    esc(`Share Price: ${fmtUsd(v.sharePrice)}`),
    "",
    esc("Select withdraw amount:"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.sendMessage(chatId, text, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "25%  ($2,500)", callback_data: "withdraw:pct25" },
          { text: "50%  ($5,000)", callback_data: "withdraw:pct50" },
        ],
        [
          { text: "75%  ($7,500)", callback_data: "withdraw:pct75" },
          { text: "100% ($10,000)", callback_data: "withdraw:pct100" },
        ],
        [
          { text: "$1,000", callback_data: "withdraw:1000" },
          { text: "$5,000", callback_data: "withdraw:5000" },
        ],
        [{ text: "✏️ Custom Amount", callback_data: "withdraw:custom" }],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

async function handleWithdrawAction(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  userId: number,
  data: string
): Promise<void> {
  const action = data.replace("withdraw:", "");
  const v = getVaultState();

  if (action === "cancel") {
    sessionStore.clear(userId);
    await bot.answerCallbackQuery(query.id, { text: "Cancelled" });
    await bot.editMessageText(esc("Withdrawal cancelled\\."), {
      chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
    });
    return;
  }

  if (action === "custom") {
    sessionStore.update(userId, "awaiting_custom_amount");
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageText(
      bold(esc("📤 Custom Withdraw")) + "\n\n" +
      esc("Type the amount in USDC (e.g., 2500):"),
      {
        chat_id: chatId, message_id: messageId, parse_mode: "MarkdownV2",
        reply_markup: { inline_keyboard: [[{ text: "❌ Cancel", callback_data: "flow:cancel" }]] },
      }
    );
    return;
  }

  if (action === "confirm") {
    sessionStore.update(userId, "awaiting_wallet");
    await showConnectWalletPrompt(bot, query, chatId, messageId, userId);
    return;
  }

  // Amount selection
  let amount: number;
  if (action.startsWith("pct")) {
    const pct = parseInt(action.replace("pct", ""), 10);
    const mockBalance = 10_000;
    amount = Math.round(mockBalance * (pct / 100));
  } else {
    amount = parseInt(action, 10);
  }

  if (isNaN(amount) || amount <= 0) {
    await bot.answerCallbackQuery(query.id, { text: "Invalid amount", show_alert: true });
    return;
  }

  sessionStore.update(userId, "confirm_withdraw", { amount });
  const sharesRedeemed = amount / v.sharePrice;

  const preview = [
    bold(esc("📤 Withdraw Preview")),
    "",
    divider(),
    esc(`Amount: ${fmtUsd(amount)} USDC`),
    esc(`Shares to burn: ~${fmtNum(sharesRedeemed, 2)} HLP`),
    "",
    esc(`Unwinding:`),
    esc(`  📊 ~${fmtUsd(amount * v.lpAllocationPct / 100)} from LP`),
    esc(`  🛡️ ~${fmtUsd(amount * v.hedgeAllocationPct / 100)} from Hedge`),
    "",
    esc("Proceed to wallet connection?"),
  ].join("\n");

  await bot.answerCallbackQuery(query.id);
  await bot.editMessageText(preview, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔗 Connect Wallet & Sign", callback_data: "withdraw:confirm" },
          { text: "❌ Cancel", callback_data: "withdraw:cancel" },
        ],
        [{ text: "🔙 Back to Vault", callback_data: "vault:back" }],
      ],
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED: Connect wallet prompt
// ═══════════════════════════════════════════════════════════════════════════════

async function showConnectWalletPrompt(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  chatId: number,
  messageId: number,
  _userId: number
): Promise<void> {
  await bot.answerCallbackQuery(query.id);

  const text = [
    bold(esc("🔗 Connect Your Wallet")),
    "",
    divider(),
    "",
    esc("Select your wallet to continue:"),
    "",
    esc("Your wallet will be prompted to:"),
    esc("  1. Connect to HedgeLP"),
    esc("  2. Approve token spending (if needed)"),
    esc("  3. Sign the transaction"),
  ].join("\n");

  await bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🦊 MetaMask", callback_data: "wallet:connect" },
          { text: "🌈 Rainbow", callback_data: "wallet:connect" },
        ],
        [
          { text: "💎 Rabby", callback_data: "wallet:connect" },
          { text: "📱 WalletConnect", callback_data: "wallet:connect" },
        ],
        [{ text: "❌ Cancel", callback_data: "flow:cancel" }],
      ],
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
