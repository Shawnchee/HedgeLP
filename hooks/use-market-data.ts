"use client";

import { useQuery } from "@tanstack/react-query";

// ============ Token Configuration ============

export const SUPPORTED_TOKENS = {
    ethereum: { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA", decimals: 18 },
    usdc: { id: "usd-coin", symbol: "USDC", name: "USD Coin", color: "#2775CA", decimals: 6 },
    usdt: { id: "tether", symbol: "USDT", name: "Tether", color: "#26A17B", decimals: 6 },
    dai: { id: "dai", symbol: "DAI", name: "Dai", color: "#F5AC37", decimals: 18 },
    wbtc: { id: "wrapped-bitcoin", symbol: "WBTC", name: "Wrapped Bitcoin", color: "#F7931A", decimals: 8 },
    uni: { id: "uniswap", symbol: "UNI", name: "Uniswap", color: "#FF007A", decimals: 18 },
    link: { id: "chainlink", symbol: "LINK", name: "Chainlink", color: "#375BD2", decimals: 18 },
    arb: { id: "arbitrum", symbol: "ARB", name: "Arbitrum", color: "#28A0F0", decimals: 18 },
    op: { id: "optimism", symbol: "OP", name: "Optimism", color: "#FF0420", decimals: 18 },
    aave: { id: "aave", symbol: "AAVE", name: "Aave", color: "#B6509E", decimals: 18 },
    sol: { id: "solana", symbol: "SOL", name: "Solana", color: "#14F195", decimals: 9 },
    matic: { id: "matic-network", symbol: "MATIC", name: "Polygon", color: "#8247E5", decimals: 18 },
} as const;

export type TokenId = keyof typeof SUPPORTED_TOKENS;

// ============ Types ============

export interface TokenPrice {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    market_cap: number;
    total_volume: number;
    circulating_supply: number;
    sparkline_in_7d?: { price: number[] };
    color: string;
}

export interface ChartDataPoint {
    time: string;
    timestamp: number;
    value: number;
}

export type TimeFrame = "1h" | "24h" | "7d" | "30d" | "90d" | "1y" | "max";

// ============ API Routes (proxied to avoid CORS) ============

const API_BASE = "/api/market";

// Map timeframe to CoinGecko days parameter
function getTimeframeDays(timeframe: TimeFrame): string {
    switch (timeframe) {
        case "1h": return "1";
        case "24h": return "1";
        case "7d": return "7";
        case "30d": return "30";
        case "90d": return "90";
        case "1y": return "365";
        case "max": return "max";
        default: return "7";
    }
}

// ============ Token Prices Hook ============

export function useTokenPrices() {
    const tokenIds = Object.values(SUPPORTED_TOKENS).map(t => t.id).join(",");

    return useQuery<TokenPrice[]>({
        queryKey: ["token-prices", tokenIds],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/prices?ids=${tokenIds}`);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Add color from our config
                return data.map((token: any) => {
                    const config = Object.values(SUPPORTED_TOKENS).find(t => t.id === token.id);
                    return {
                        ...token,
                        color: config?.color || "#627EEA",
                    };
                });
            } catch (error) {
                console.error("Failed to fetch token prices:", error);
                // Return fallback data
                return getFallbackTokenPrices();
            }
        },
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchInterval: 60 * 1000, // Refresh every minute
    });
}

// ============ Single Token Price Hook ============

export function useTokenPrice(tokenId: string) {
    const coingeckoId = SUPPORTED_TOKENS[tokenId as TokenId]?.id || tokenId;

    return useQuery<TokenPrice | null>({
        queryKey: ["token-price", coingeckoId],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/prices?ids=${coingeckoId}`);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.error || data.length === 0) return null;
                
                const config = Object.values(SUPPORTED_TOKENS).find(t => t.id === coingeckoId);
                return {
                    ...data[0],
                    color: config?.color || "#627EEA",
                };
            } catch (error) {
                console.error("Failed to fetch token price:", error);
                return null;
            }
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
}

// ============ Token Chart Data Hook ============

export function useTokenChart(tokenId: string, timeframe: TimeFrame = "7d") {
    const coingeckoId = SUPPORTED_TOKENS[tokenId as TokenId]?.id || tokenId;
    const days = getTimeframeDays(timeframe);

    return useQuery<ChartDataPoint[]>({
        queryKey: ["token-chart", coingeckoId, timeframe],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/chart?id=${coingeckoId}&days=${days}`);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Transform to chart format
                return data.prices.map(([timestamp, value]: [number, number]) => ({
                    timestamp,
                    time: formatChartTime(timestamp, timeframe),
                    value: parseFloat(value.toFixed(2)),
                }));
            } catch (error) {
                console.error("Failed to fetch chart data:", error);
                return getFallbackChartData(timeframe);
            }
        },
        staleTime: timeframe === "1h" ? 60 * 1000 : 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

// ============ Exchange Rate Hook ============

export function useExchangeRate(fromToken: string, toToken: string) {
    const fromId = SUPPORTED_TOKENS[fromToken as TokenId]?.id || fromToken;
    const toId = SUPPORTED_TOKENS[toToken as TokenId]?.id || toToken;

    return useQuery<{ rate: number; fromPrice: number; toPrice: number } | null>({
        queryKey: ["exchange-rate", fromId, toId],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/rate?ids=${fromId},${toId}`);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                const fromPrice = data[fromId]?.usd || 0;
                const toPrice = data[toId]?.usd || 1;
                
                return {
                    rate: toPrice > 0 ? fromPrice / toPrice : 0,
                    fromPrice,
                    toPrice,
                };
            } catch (error) {
                console.error("Failed to fetch exchange rate:", error);
                return null;
            }
        },
        staleTime: 10 * 1000, // 10 seconds for exchange rates
        gcTime: 60 * 1000,
        refetchInterval: 15 * 1000, // Refresh every 15 seconds
        enabled: !!fromToken && !!toToken && fromToken !== toToken,
    });
}

// ============ Market Stats Hook ============

export function useMarketStats() {
    return useQuery({
        queryKey: ["market-stats"],
        queryFn: async () => {
            try {
                const response = await fetch(`${API_BASE}/stats`);
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                return {
                    totalMarketCap: data.data.total_market_cap.usd,
                    totalVolume24h: data.data.total_volume.usd,
                    marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
                    btcDominance: data.data.market_cap_percentage.btc,
                    ethDominance: data.data.market_cap_percentage.eth,
                };
            } catch (error) {
                console.error("Failed to fetch market stats:", error);
                return {
                    totalMarketCap: 2680000000000,
                    totalVolume24h: 414000000000,
                    marketCapChange24h: -2.68,
                    btcDominance: 52.1,
                    ethDominance: 17.3,
                };
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000,
    });
}

// ============ Helper Functions ============

function formatChartTime(timestamp: number, timeframe: TimeFrame): string {
    const date = new Date(timestamp);
    
    switch (timeframe) {
        case "1h":
        case "24h":
            return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        case "7d":
            return date.toLocaleDateString("en-US", { weekday: "short" });
        case "30d":
        case "90d":
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        case "1y":
        case "max":
            return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        default:
            return date.toLocaleDateString();
    }
}

// ============ Fallback Data ============

function getFallbackTokenPrices(): TokenPrice[] {
    return [
        { id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 2314.87, price_change_percentage_24h: 0.22, price_change_percentage_7d: 2.5, market_cap: 282700000000, total_volume: 353900000, circulating_supply: 122000000, color: "#627EEA" },
        { id: "usd-coin", symbol: "usdc", name: "USD Coin", current_price: 1.00, price_change_percentage_24h: 0.01, price_change_percentage_7d: 0.02, market_cap: 70600000000, total_volume: 238300000, circulating_supply: 70600000000, color: "#2775CA" },
        { id: "wrapped-bitcoin", symbol: "wbtc", name: "Wrapped Bitcoin", current_price: 78032.59, price_change_percentage_24h: 0.20, price_change_percentage_7d: 3.1, market_cap: 9500000000, total_volume: 138100000, circulating_supply: 121000, color: "#F7931A" },
        { id: "uniswap", symbol: "uni", name: "Uniswap", current_price: 8.95, price_change_percentage_24h: -1.24, price_change_percentage_7d: -2.3, market_cap: 5400000000, total_volume: 45000000, circulating_supply: 600000000, color: "#FF007A" },
        { id: "chainlink", symbol: "link", name: "Chainlink", current_price: 14.82, price_change_percentage_24h: 1.5, price_change_percentage_7d: 4.2, market_cap: 8700000000, total_volume: 320000000, circulating_supply: 587000000, color: "#375BD2" },
        { id: "arbitrum", symbol: "arb", name: "Arbitrum", current_price: 1.15, price_change_percentage_24h: 2.1, price_change_percentage_7d: -1.5, market_cap: 2900000000, total_volume: 180000000, circulating_supply: 2500000000, color: "#28A0F0" },
    ];
}

function getFallbackChartData(timeframe: TimeFrame): ChartDataPoint[] {
    const now = Date.now();
    const points = timeframe === "1h" ? 12 : timeframe === "24h" ? 24 : timeframe === "7d" ? 7 : 30;
    const interval = timeframe === "1h" ? 5 * 60 * 1000 : timeframe === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    let basePrice = 2300;
    return Array.from({ length: points }, (_, i) => {
        const timestamp = now - (points - i - 1) * interval;
        basePrice += (Math.random() - 0.48) * 20;
        return {
            timestamp,
            time: formatChartTime(timestamp, timeframe),
            value: parseFloat(basePrice.toFixed(2)),
        };
    });
}

// ============ Format Helpers ============

export function formatCurrency(value: number, compact = false): string {
    if (compact) {
        if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
}
