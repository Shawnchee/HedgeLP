// ============ External API Base URLs ============

export const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
export const DEFILLAMA_BASE_URL = "https://yields.llama.fi";

// ============ Internal API Routes ============

export const API_ROUTES = {
  MARKET_RATE: "/api/market/rate",
  MARKET_PRICES: "/api/market/prices",
  MARKET_CHART: "/api/market/chart",
  MARKET_STATS: "/api/market/stats",
  POOLS: "/api/pools",
} as const;

// ============ Query Cache Timing (ms) ============

export const CACHE_TIMING = {
  /** Token prices — stale after 15s, refresh every 30s */
  PRICE_STALE: 15_000,
  PRICE_REFETCH: 30_000,

  /** Pool data — stale after 60s, refresh every 60s */
  POOL_STALE: 60_000,
  POOL_REFETCH: 60_000,

  /** Chart data — stale after 60s */
  CHART_STALE: 60_000,

  /** Market stats — stale after 5 min */
  STATS_STALE: 300_000,

  /** Server-side revalidation: prices */
  SERVER_PRICE_REVALIDATE: 15,
  /** Server-side revalidation: chart */
  SERVER_CHART_REVALIDATE: 60,
  /** Server-side revalidation: prices (markets endpoint) */
  SERVER_PRICES_REVALIDATE: 30,
  /** Server-side revalidation: pools & stats */
  SERVER_POOLS_REVALIDATE: 300,
  SERVER_STATS_REVALIDATE: 300,
} as const;

// ============ Navigation ============

export const NAV_ITEMS = [
  { name: "Swap", href: "/swap" },
  { name: "Tokens", href: "/tokens" },
  { name: "Pools", href: "/pools" },
  { name: "Vault", href: "/dashboard" },
  { name: "Calculator", href: "/calculator" },
] as const;

// ============ Chain Explorer URLs ============

export const EXPLORER_URLS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  42161: "https://arbiscan.io",
  8453: "https://basescan.org",
} as const;

/**
 * Get the block explorer URL for a given chain.
 * Falls back to Etherscan mainnet if chain is unknown.
 */
export function getExplorerUrl(chainId: number): string {
  return EXPLORER_URLS[chainId] ?? "https://etherscan.io";
}

/**
 * Get a block explorer link for a transaction hash.
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

/**
 * Get a block explorer link for an address.
 */
export function getExplorerAddressUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}

// ============ Financial Defaults ============

export const FINANCIAL_DEFAULTS = {
  /** Default LP allocation percentage */
  LP_ALLOCATION: 80,
  /** Default hedge allocation percentage */
  HEDGE_ALLOCATION: 20,
  /** Default LP fee APR (%) used in calculator */
  LP_FEE_APR: 0.45,
  /** Default daily funding rate (%) */
  FUNDING_RATE_DAILY: 0.00015,
  /** Liquidation price multiplier (spot-based, conservative) */
  LIQUIDATION_MULTIPLIER: 1.85,
  /** Rebalance threshold (basis points) */
  REBALANCE_THRESHOLD_BPS: 500,
  /** Default slippage tolerance for swaps (basis points) */
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
  /** Maximum slippage tolerance (basis points) */
  MAX_SLIPPAGE_BPS: 500, // 5%
} as const;

// ============ Wallet Config ============

export const WALLET_CONFIG = {
  /** WalletConnect project ID — MUST be set via env var in production */
  WALLETCONNECT_PROJECT_ID:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  /** App metadata for WalletConnect */
  APP_METADATA: {
    name: "HedgeLP",
    description: "Delta-Neutral Liquidity Provision",
    url: "https://hedgelp.xyz",
    icons: ["https://hedgelp.xyz/icon.png"],
  },
} as const;
