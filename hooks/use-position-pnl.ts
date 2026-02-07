"use client";

import { useMemo } from "react";
import type { VaultPosition } from "./use-positions";

/**
 * Real-time PnL breakdown for a single HedgeLP position.
 *
 * IMPORTANT: All USD values are computed using CoinGecko ETH prices (real-world),
 * NOT raw USDC amounts from Sepolia testnet swaps. Testnet pool prices can differ
 * wildly from real-world prices, so using raw USDC would show fake profits/losses.
 *
 * Calculations (CoinGecko-price-based):
 *
 * LP side:
 *   - Holds lpWethKept ETH + lpSwapEth swapped to USDC
 *   - LP value now  = lpWethKept * currentPrice + lpSwapEth * entryPrice
 *   - LP value entry = lpWethKept * entryPrice   + lpSwapEth * entryPrice
 *   - LP PnL = lpWethKept * (currentPrice - entryPrice)
 *
 * Hedge (1x Short) side:
 *   - Sold hedgeEthAmount ETH at entryPrice (CoinGecko)
 *   - Short entry notional = hedgeEthAmount * entryPrice
 *   - Short PnL = hedgeEthAmount * (entryPrice - currentPrice)
 *   - If ETH drops → profit, if ETH rises → loss
 *
 * Net (delta-neutral):
 *   - Net PnL = (lpWethKept - hedgeEthAmount) * (currentPrice - entryPrice)
 *   - ≈ 0 when well-hedged (lpWethKept ≈ hedgeEthAmount)
 *   - Real PnL comes from LP fees earned
 */
export interface PositionPnL {
    /** Current value of LP in USD (ETH side at current price + USDC side) */
    lpValueNow: number;
    /** Current value of hedge in USD (USDC held - unrealized short liability) */
    hedgeValueNow: number;
    /** Total position value now */
    totalValueNow: number;

    /** LP PnL from ETH price change */
    lpPnl: number;
    /** Short PnL from ETH price change */
    shortPnl: number;
    /** Net PnL (LP + Short) — should be ~0 if well-hedged */
    netPnl: number;
    /** Net PnL as percent of deposited */
    netPnlPercent: number;

    /** ETH price at entry */
    entryPrice: number;
    /** Current ETH price */
    currentPrice: number;
    /** ETH price change percent */
    ethPriceChangePercent: number;

    /** Whether this position has real on-chain data */
    isReal: boolean;

    // ============ Funding Rate (1x Short) ============
    /**
     * Funding rate per 8 hours (%).
     * Spot-based hedge: 0% (no funding).
     * Perp-based hedge: variable (~0.01% per 8h typical).
     */
    fundingRate8h: number;
    /** Accumulated funding cost since entry (USD) — simulated */
    accumulatedFundingCost: number;
    /** Short size in ETH */
    shortSizeEth: number;
    /** LP ETH exposure */
    lpEthExposure: number;
}

/**
 * Compute real-time PnL for a single position given the current ETH price.
 * Pure function — no hooks, no side effects.
 */
export function computePositionPnL(
    pos: VaultPosition,
    currentEthPrice: number
): PositionPnL {
    const isReal = !!pos.isReal && !!pos.ethPriceAtDeposit && currentEthPrice > 0;

    if (!isReal) {
        // Mock position — use stored pnl values
        return {
            lpValueNow: pos.currentValue * (pos.lpPercent / 100),
            hedgeValueNow: pos.currentValue * (pos.hedgePercent / 100),
            totalValueNow: pos.currentValue,
            lpPnl: pos.pnl * (pos.lpPercent / 100),
            shortPnl: 0,
            netPnl: pos.pnl,
            netPnlPercent: pos.pnlPercent,
            entryPrice: 0,
            currentPrice: currentEthPrice,
            ethPriceChangePercent: 0,
            isReal: false,
            fundingRate8h: 0,
            accumulatedFundingCost: 0,
            shortSizeEth: 0,
            lpEthExposure: 0,
        };
    }

    const entryPrice = pos.ethPriceAtDeposit!;
    const lpWethKept = parseFloat(pos.lpWethKept || pos.lpEthExposure || "0");
    const lpEthAmount = parseFloat(pos.lpEthAmount || "0");
    const hedgeEthAmount = parseFloat(pos.hedgeEthAmount || pos.shortSizeEth || "0");

    // ================================================================
    // IMPORTANT: We do NOT use raw USDC amounts from testnet swaps
    // (hedgeUsdcReceived, lpUsdcReceived, totalUsdcReceived) because
    // the Sepolia pool price can differ wildly from the real-world
    // CoinGecko ETH price. Instead, we compute all USD values from
    // ETH amounts × CoinGecko prices for consistency.
    // ================================================================

    // LP: the USDC side was obtained by swapping (lpEthAmount - lpWethKept) ETH.
    // We value it at the CoinGecko entry price (stable, doesn't change with ETH price).
    const lpSwapEth = lpEthAmount > 0
        ? Math.max(0, lpEthAmount - lpWethKept)
        : lpWethKept; // fallback: assume 50/50 split
    const lpUsdcAtEntry = lpSwapEth * entryPrice;

    // LP value now: WETH side at current price + USDC side at entry value (stable)
    const lpValueNow = lpWethKept * currentEthPrice + lpUsdcAtEntry;

    // Hedge (1x Short): entry notional = hedgeEthAmount × CoinGecko entry price.
    // The USDC held from the short doesn't change in USD terms.
    const hedgeEntryNotional = hedgeEthAmount * entryPrice;
    const hedgeValueNow = hedgeEntryNotional;

    // LP PnL: only the WETH side moves with price (USDC side is stable)
    const lpPnl = lpWethKept * (currentEthPrice - entryPrice);

    // Short PnL: profit/loss from 1x short since entry
    // If ETH rises → loss (you sold low), if ETH falls → profit (you sold high)
    const shortPnl = hedgeEthAmount * (entryPrice - currentEthPrice);

    // Net PnL = (lpWethKept - hedgeEthAmount) × (currentPrice - entryPrice)
    // ≈ 0 when well-hedged (lpWethKept ≈ hedgeEthAmount)
    const netPnl = lpPnl + shortPnl;

    const depositedUsd = pos.depositedUsd || parseFloat(pos.totalEthDeposited || "0") * entryPrice;
    const totalValueNow = lpValueNow + hedgeValueNow;
    const netPnlPercent = depositedUsd > 0 ? (netPnl / depositedUsd) * 100 : 0;

    const ethPriceChangePercent = entryPrice > 0
        ? ((currentEthPrice - entryPrice) / entryPrice) * 100
        : 0;

    // ============ Funding Rate ============
    // Spot-based hedge = 0% funding rate (no perp position).
    // For future perp integration (e.g. GMX), funding would be ~0.01% per 8h.
    // We track accumulated cost based on position age for informational display.
    const isSpotHedge = true; // TODO: detect perp vs spot
    const fundingRate8h = isSpotHedge ? 0 : 0.01; // % per 8h

    // Estimate accumulated funding cost (for perp: fundingRate * notional * periods elapsed)
    const positionAgeMs = pos.timestamp ? Date.now() - pos.timestamp : 0;
    const periodsElapsed = positionAgeMs / (8 * 60 * 60 * 1000); // number of 8h periods
    const hedgeNotional = hedgeEthAmount * entryPrice;
    const accumulatedFundingCost = isSpotHedge
        ? 0
        : (fundingRate8h / 100) * hedgeNotional * periodsElapsed;

    return {
        lpValueNow,
        hedgeValueNow,
        totalValueNow,
        lpPnl,
        shortPnl,
        netPnl,
        netPnlPercent,
        entryPrice,
        currentPrice: currentEthPrice,
        ethPriceChangePercent,
        isReal: true,
        fundingRate8h,
        accumulatedFundingCost,
        shortSizeEth: hedgeEthAmount,
        lpEthExposure: lpWethKept,
    };
}

/**
 * React hook: compute PnL for all positions given current ETH price.
 */
export function usePositionsPnL(
    positions: VaultPosition[],
    currentEthPrice: number
): Map<string, PositionPnL> {
    return useMemo(() => {
        const map = new Map<string, PositionPnL>();
        for (const pos of positions) {
            map.set(pos.id, computePositionPnL(pos, currentEthPrice));
        }
        return map;
    }, [positions, currentEthPrice]);
}
