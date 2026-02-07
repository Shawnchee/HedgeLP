"use client";

import { useMemo } from "react";
import type { VaultPosition } from "./use-positions";

/**
 * Real-time PnL breakdown for a single HedgeLP position.
 *
 * Calculations:
 *
 * LP side:
 *   - Holds lpWethKept ETH + lpUsdcReceived USDC
 *   - LP value now = lpWethKept * currentPrice + lpUsdc
 *   - LP value at entry = lpWethKept * entryPrice + lpUsdc
 *   - LP PnL (from price) = lpWethKept * (currentPrice - entryPrice)
 *
 * Hedge (1x Short) side:
 *   - Sold hedgeEthAmount ETH for hedgeUsdc at entry
 *   - To close: buy back hedgeEthAmount ETH at current price
 *   - Short PnL = hedgeUsdc - hedgeEthAmount * currentPrice
 *   - If ETH drops → profit, if ETH rises → loss
 *
 * Net (delta-neutral):
 *   - Net PnL ≈ 0 from price movement (if well-hedged)
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
    const lpUsdc = parseFloat(pos.lpUsdcReceived || "0");
    const hedgeEthAmount = parseFloat(pos.hedgeEthAmount || pos.shortSizeEth || "0");
    const hedgeUsdc = parseFloat(pos.hedgeUsdcReceived || "0");

    // If lpUsdcReceived not stored, estimate from totalUsdcReceived - hedgeUsdcReceived
    const totalUsdc = parseFloat(pos.totalUsdcReceived || "0");
    const effectiveLpUsdc = lpUsdc > 0 ? lpUsdc : Math.max(0, totalUsdc - hedgeUsdc);

    // LP value now: WETH at current price + USDC (stable)
    const lpValueNow = lpWethKept * currentEthPrice + effectiveLpUsdc;

    // Short: user holds hedgeUsdc USDC, "owes" hedgeEthAmount ETH at current price
    // Short value = hedgeUsdc (what they hold) — the "liability" is hedgeEthAmount * currentPrice
    // But for display, hedge value = the USDC they actually hold
    const hedgeValueNow = hedgeUsdc; // USDC doesn't change in USD terms

    // LP PnL from price movement (WETH side only; USDC is stable)
    const lpPnl = lpWethKept * (currentEthPrice - entryPrice);

    // Short PnL: gained hedgeUsdc by selling ETH at entry; to close need hedgeEthAmount * current
    const shortPnl = hedgeUsdc - hedgeEthAmount * currentEthPrice;

    // Net PnL from price movement (should be ~0 if well-hedged)
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
