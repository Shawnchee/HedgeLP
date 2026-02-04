"use client";

import { useQuery } from "@tanstack/react-query";

// ============ Types ============

export interface Pool {
    id: string;
    name: string;
    symbol: string;
    chain: string;
    project: string;
    tvlUsd: number;
    apyBase: number;
    apyReward: number;
    apy: number;
    rewardTokens: string[];
    pool: string;
    poolMeta?: string;
    underlyingTokens: string[];
    volumeUsd1d?: number;
    volumeUsd7d?: number;
    il7d?: number;
    // UI properties
    color1: string;
    color2: string;
    version: string;
    fee: string;
}

export interface PoolStats {
    totalTvl: number;
    totalVolume24h: number;
    avgApy: number;
    poolCount: number;
}

// ============ Token Colors ============

const TOKEN_COLORS: Record<string, string> = {
    ETH: "#627EEA",
    WETH: "#627EEA",
    USDC: "#2775CA",
    USDT: "#26A17B",
    DAI: "#F5AC37",
    WBTC: "#F7931A",
    UNI: "#FF007A",
    LINK: "#375BD2",
    ARB: "#28A0F0",
    OP: "#FF0420",
    AAVE: "#B6509E",
    WISE: "#14F195",
    USDE: "#565D6D",
    CRV: "#FF5F00",
    MKR: "#1AAB9B",
};

function getTokenColor(symbol: string): string {
    // Extract base symbol (remove chain prefixes, etc.)
    const baseSymbol = symbol.replace(/^[a-z]+/, "").toUpperCase();
    return TOKEN_COLORS[baseSymbol] || TOKEN_COLORS[symbol.toUpperCase()] || "#627EEA";
}

// ============ API Routes (proxied to avoid CORS) ============

const API_BASE = "/api/pools";

// ============ Uniswap Pools Hook ============

export function useUniswapPools(chain: string = "Ethereum") {
    return useQuery<Pool[]>({
        queryKey: ["uniswap-pools", chain],
        queryFn: async () => {
            try {
                const response = await fetch(API_BASE);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Filter for Uniswap pools on specified chain
                const uniswapPools = data.data
                    .filter((pool: any) => 
                        pool.project.toLowerCase().includes("uniswap") &&
                        (chain === "all" || pool.chain.toLowerCase() === chain.toLowerCase())
                    )
                    .slice(0, 20)
                    .map((pool: any) => transformPool(pool));
                
                return uniswapPools.length > 0 ? uniswapPools : getFallbackPools();
            } catch (error) {
                console.error("Failed to fetch Uniswap pools:", error);
                return getFallbackPools();
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
    });
}

// ============ Top Pools by TVL Hook ============

export function useTopPools(limit: number = 10) {
    return useQuery<Pool[]>({
        queryKey: ["top-pools", limit],
        queryFn: async () => {
            try {
                const response = await fetch(API_BASE);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Get top pools by TVL (Uniswap + Curve + Aave)
                const topPools = data.data
                    .filter((pool: any) => 
                        (pool.project.toLowerCase().includes("uniswap") ||
                         pool.project.toLowerCase().includes("curve") ||
                         pool.project.toLowerCase().includes("aave")) &&
                        pool.tvlUsd > 1000000 // Min $1M TVL
                    )
                    .sort((a: any, b: any) => b.tvlUsd - a.tvlUsd)
                    .slice(0, limit)
                    .map((pool: any) => transformPool(pool));
                
                return topPools.length > 0 ? topPools : getFallbackPools();
            } catch (error) {
                console.error("Failed to fetch top pools:", error);
                return getFallbackPools();
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

// ============ Pools with Rewards Hook ============

export function useRewardPools(limit: number = 5) {
    return useQuery<Pool[]>({
        queryKey: ["reward-pools", limit],
        queryFn: async () => {
            try {
                const response = await fetch(API_BASE);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Get pools with reward APY
                const rewardPools = data.data
                    .filter((pool: any) => 
                        pool.apyReward > 0 &&
                        pool.tvlUsd > 500000 &&
                        (pool.project.toLowerCase().includes("uniswap") ||
                         pool.project.toLowerCase().includes("curve"))
                    )
                    .sort((a: any, b: any) => b.apyReward - a.apyReward)
                    .slice(0, limit)
                    .map((pool: any) => transformPool(pool));
                
                return rewardPools.length > 0 ? rewardPools : getFallbackRewardPools();
            } catch (error) {
                console.error("Failed to fetch reward pools:", error);
                return getFallbackRewardPools();
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

// ============ Pool Stats Hook ============

export function usePoolStats() {
    return useQuery<PoolStats>({
        queryKey: ["pool-stats"],
        queryFn: async () => {
            try {
                const response = await fetch(API_BASE);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Calculate stats for Uniswap pools
                const uniswapPools = data.data.filter((pool: any) => 
                    pool.project.toLowerCase().includes("uniswap")
                );
                
                const totalTvl = uniswapPools.reduce((sum: number, pool: any) => sum + (pool.tvlUsd || 0), 0);
                const totalVolume = uniswapPools.reduce((sum: number, pool: any) => sum + (pool.volumeUsd1d || 0), 0);
                const avgApy = uniswapPools.reduce((sum: number, pool: any) => sum + (pool.apy || 0), 0) / uniswapPools.length;
                
                return {
                    totalTvl,
                    totalVolume24h: totalVolume || totalTvl * 0.02, // Estimate if not available
                    avgApy,
                    poolCount: uniswapPools.length,
                };
            } catch (error) {
                console.error("Failed to fetch pool stats:", error);
                return {
                    totalTvl: 2680000000,
                    totalVolume24h: 4140000000,
                    avgApy: 12.5,
                    poolCount: 1500,
                };
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

// ============ Transform Functions ============

function transformPool(pool: any): Pool {
    // Parse pool symbol to get token names
    const symbol = pool.symbol || "";
    const tokens = symbol.split("-").map((s: string) => s.trim().toUpperCase());
    const token1 = tokens[0] || "ETH";
    const token2 = tokens[1] || "USDC";
    
    // Determine version from project name
    let version = "v2";
    if (pool.project.toLowerCase().includes("v3")) version = "v3";
    else if (pool.project.toLowerCase().includes("v4")) version = "v4";
    
    // Parse fee from pool metadata
    let fee = "0.3%";
    if (pool.poolMeta) {
        const feeMatch = pool.poolMeta.match(/(\d+\.?\d*)%?/);
        if (feeMatch) {
            const feeValue = parseFloat(feeMatch[1]);
            fee = feeValue < 1 ? `${feeValue}%` : `${(feeValue / 10000).toFixed(4)}%`;
        }
    }
    
    return {
        id: pool.pool,
        name: `${token1} / ${token2}`,
        symbol: pool.symbol,
        chain: pool.chain,
        project: pool.project,
        tvlUsd: pool.tvlUsd || 0,
        apyBase: pool.apyBase || 0,
        apyReward: pool.apyReward || 0,
        apy: pool.apy || (pool.apyBase || 0) + (pool.apyReward || 0),
        rewardTokens: pool.rewardTokens || [],
        pool: pool.pool,
        poolMeta: pool.poolMeta,
        underlyingTokens: pool.underlyingTokens || [],
        volumeUsd1d: pool.volumeUsd1d,
        volumeUsd7d: pool.volumeUsd7d,
        il7d: pool.il7d,
        color1: getTokenColor(token1),
        color2: getTokenColor(token2),
        version,
        fee,
    };
}

// ============ Fallback Data ============

function getFallbackPools(): Pool[] {
    return [
        { id: "eth-usdc-1", name: "ETH / USDC", symbol: "ETH-USDC", chain: "Ethereum", project: "Uniswap V3", tvlUsd: 120400000, apyBase: 7.55, apyReward: 0, apy: 7.55, rewardTokens: [], pool: "eth-usdc-1", underlyingTokens: [], color1: "#627EEA", color2: "#2775CA", version: "v3", fee: "0.05%" },
        { id: "wbtc-eth-1", name: "WBTC / ETH", symbol: "WBTC-ETH", chain: "Ethereum", project: "Uniswap V3", tvlUsd: 82100000, apyBase: 11.52, apyReward: 0, apy: 11.52, rewardTokens: [], pool: "wbtc-eth-1", underlyingTokens: [], color1: "#F7931A", color2: "#627EEA", version: "v3", fee: "0.3%" },
        { id: "eth-usdt-1", name: "ETH / USDT", symbol: "ETH-USDT", chain: "Ethereum", project: "Uniswap V3", tvlUsd: 45200000, apyBase: 38.69, apyReward: 0, apy: 38.69, rewardTokens: [], pool: "eth-usdt-1", underlyingTokens: [], color1: "#627EEA", color2: "#26A17B", version: "v3", fee: "0.3%" },
        { id: "usdc-usdt-1", name: "USDC / USDT", symbol: "USDC-USDT", chain: "Ethereum", project: "Uniswap V3", tvlUsd: 65000000, apyBase: 3.21, apyReward: 0, apy: 3.21, rewardTokens: [], pool: "usdc-usdt-1", underlyingTokens: [], color1: "#2775CA", color2: "#26A17B", version: "v3", fee: "0.01%" },
        { id: "arb-eth-1", name: "ARB / ETH", symbol: "ARB-ETH", chain: "Arbitrum", project: "Uniswap V3", tvlUsd: 28500000, apyBase: 15.32, apyReward: 2.5, apy: 17.82, rewardTokens: ["ARB"], pool: "arb-eth-1", underlyingTokens: [], color1: "#28A0F0", color2: "#627EEA", version: "v3", fee: "0.3%" },
    ];
}

function getFallbackRewardPools(): Pool[] {
    return [
        { id: "usde-usdt-1", name: "USDE / USDT", symbol: "USDE-USDT", chain: "Ethereum", project: "Uniswap V4", tvlUsd: 15000000, apyBase: 1.53, apyReward: 7.04, apy: 8.57, rewardTokens: ["UNI"], pool: "usde-usdt-1", underlyingTokens: [], color1: "#565D6D", color2: "#26A17B", version: "v4", fee: "0.0045%" },
        { id: "usdc-usdt-2", name: "USDC / USDT", symbol: "USDC-USDT", chain: "Ethereum", project: "Uniswap V4", tvlUsd: 25000000, apyBase: 1.9, apyReward: 5.12, apy: 7.02, rewardTokens: ["UNI"], pool: "usdc-usdt-2", underlyingTokens: [], color1: "#2775CA", color2: "#26A17B", version: "v4", fee: "0.0008%" },
    ];
}

// ============ Format Helpers ============

export function formatTvl(tvl: number): string {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(1)}K`;
    return `$${tvl.toFixed(0)}`;
}

export function formatApy(apy: number): string {
    return `${apy.toFixed(2)}%`;
}
