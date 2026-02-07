"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "hlp-positions";

export interface VaultPosition {
    id: string;
    pool: string;
    protocol: string;
    chain: string;
    deposited: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    lpPercent: number;
    hedgePercent: number;
    apy: number;
    autoCompound: boolean;
    autoStopLoss: boolean;
    openedAt: string;
    /** ISO timestamp for ordering */
    timestamp: number;
    icon1: string;
    icon2: string;
    color1: string;
    color2: string;

    // ============ Real on-chain data (Sepolia) ============
    /** Whether this is a real on-chain position */
    isReal?: boolean;
    /** Network (e.g. "Sepolia") */
    network?: string;
    /** Total ETH deposited */
    totalEthDeposited?: string;
    /** ETH allocated to LP */
    lpEthAmount?: string;
    /** ETH kept as LP WETH side (returned via refundETH) */
    lpWethKept?: string;
    /** USDC received for LP pair side */
    lpUsdcReceived?: string;
    /** ETH allocated to Hedge (sold for USDC = 1x short) */
    hedgeEthAmount?: string;
    /** USDC received from hedge swap (= short entry size in USD) */
    hedgeUsdcReceived?: string;
    /** Total USDC received (LP side + hedge side) */
    totalUsdcReceived?: string;
    /** Single transaction hash (multicall) */
    txHash?: string;
    /** ETH price at time of deposit (USD) */
    ethPriceAtDeposit?: number;
    /** LP value in USD at deposit */
    lpValueUsd?: number;
    /** Hedge value in USD at deposit */
    hedgeValueUsd?: number;
    /** Deposit value in USD (real) */
    depositedUsd?: number;

    // ============ 1x Short / Delta-Neutral Tracking ============
    /** 1x short size in ETH (= hedgeEthAmount) */
    shortSizeEth?: string;
    /** LP ETH exposure (= lpWethKept, the WETH side of the LP) */
    lpEthExposure?: string;
    /** Hedge coverage: shortSizeEth / lpEthExposure * 100 */
    hedgeCoverage?: number;

    // ============ Backward compat (old multi-tx format) ============
    /** @deprecated Use txHash instead */
    lpTxHash?: string | null;
    /** @deprecated Use txHash instead */
    hedgeTxHash?: string | null;
}

const SEED_POSITIONS: VaultPosition[] = [
    {
        id: "seed-1",
        pool: "WETH / USDC",
        protocol: "Uniswap V4",
        chain: "Ethereum",
        deposited: 10000,
        currentValue: 10342.18,
        pnl: 342.18,
        pnlPercent: 3.42,
        lpPercent: 80,
        hedgePercent: 20,
        apy: 24.5,
        autoCompound: true,
        autoStopLoss: true,
        openedAt: "3 days ago",
        timestamp: Date.now() - 3 * 86400_000,
        icon1: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        icon2: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
        color1: "#627EEA",
        color2: "#2775CA",
    },
    {
        id: "seed-2",
        pool: "WBTC / WETH",
        protocol: "Uniswap V4",
        chain: "Arbitrum",
        deposited: 25000,
        currentValue: 25821.50,
        pnl: 821.50,
        pnlPercent: 3.29,
        lpPercent: 70,
        hedgePercent: 30,
        apy: 18.7,
        autoCompound: true,
        autoStopLoss: true,
        openedAt: "1 week ago",
        timestamp: Date.now() - 7 * 86400_000,
        icon1: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
        icon2: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        color1: "#F7931A",
        color2: "#627EEA",
    },
    {
        id: "seed-3",
        pool: "ARB / USDC",
        protocol: "Uniswap V4",
        chain: "Arbitrum",
        deposited: 5000,
        currentValue: 4872.30,
        pnl: -127.70,
        pnlPercent: -2.55,
        lpPercent: 60,
        hedgePercent: 40,
        apy: 42.1,
        autoCompound: false,
        autoStopLoss: true,
        openedAt: "5 days ago",
        timestamp: Date.now() - 5 * 86400_000,
        icon1: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
        icon2: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
        color1: "#213147",
        color2: "#2775CA",
    },
];

function loadPositions(): VaultPosition[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsed: VaultPosition[] = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
            }
        } catch { /* fall through */ }
    }
    // Seed on first load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_POSITIONS));
    return SEED_POSITIONS;
}

function savePositions(positions: VaultPosition[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

/**
 * Shared hook for reading and writing vault positions from localStorage.
 * Used by both the Pools page (to add new positions) and Dashboard (to display).
 */
export function usePositions() {
    const [positions, setPositions] = useState<VaultPosition[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Load on mount (client only)
    useEffect(() => {
        setPositions(loadPositions());
        setLoaded(true);
    }, []);

    // Listen for cross-tab / same-tab storage events so dashboard updates
    useEffect(() => {
        const handler = () => setPositions(loadPositions());
        window.addEventListener("storage", handler);
        return () => window.removeEventListener("storage", handler);
    }, []);

    const addPosition = useCallback((pos: VaultPosition) => {
        setPositions(prev => {
            const updated = [pos, ...prev];
            savePositions(updated);
            // Dispatch storage event so other tabs/components pick it up
            window.dispatchEvent(new Event("storage"));
            return updated;
        });
    }, []);

    const updatePosition = useCallback((id: string, patch: Partial<VaultPosition>) => {
        setPositions(prev => {
            const updated = prev.map(p => p.id === id ? { ...p, ...patch } : p);
            savePositions(updated);
            window.dispatchEvent(new Event("storage"));
            return updated;
        });
    }, []);

    const removePosition = useCallback((id: string) => {
        setPositions(prev => {
            const updated = prev.filter(p => p.id !== id);
            savePositions(updated);
            window.dispatchEvent(new Event("storage"));
            return updated;
        });
    }, []);

    return { positions, loaded, addPosition, updatePosition, removePosition };
}
