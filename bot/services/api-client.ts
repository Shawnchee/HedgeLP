/**
 * HTTP client that calls external APIs directly.
 *
 * The bot is a standalone process — it does NOT depend on the Next.js
 * server running. All data comes from:
 *   - CoinGecko (prices, market stats, trending)
 *   - DeFiLlama (pool yields)
 *
 * Features:
 *  - Configurable timeout + retries with exponential back-off
 *  - Typed response helpers
 *  - AbortController-based timeouts
 */

import { config } from "../config";
import { logger } from "../utils/logger";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  status: number;
  message: string;
}

export type ApiResult<T = unknown> = ApiResponse<T> | ApiError;

// ── External API base URLs ───────────────────────────────────────────────────

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const DEFILLAMA_BASE = "https://yields.llama.fi";

// ── Generic fetcher with retries ─────────────────────────────────────────────

function isTransient(status: number): boolean {
  return status >= 500 || status === 429;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry<T>(
  url: string,
  label: string
): Promise<ApiResult<T>> {
  let lastError = "Unknown error";
  let lastStatus = 500;

  for (let attempt = 0; attempt <= config.httpMaxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.httpTimeoutMs);

    try {
      if (attempt > 0) {
        const backoff = Math.min(1000 * 2 ** (attempt - 1), 8000);
        logger.debug("Retrying fetch", { label, attempt, backoffMs: backoff });
        await sleep(backoff);
      }

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as T;
        return { ok: true, data };
      }

      lastStatus = res.status;
      try {
        const body = await res.json();
        lastError = body?.error || body?.message || res.statusText;
      } catch {
        lastError = res.statusText || `HTTP ${res.status}`;
      }

      if (!isTransient(res.status)) break;

      logger.warn("Transient API error, will retry", {
        label,
        status: res.status,
        attempt,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = `Request timed out after ${config.httpTimeoutMs}ms`;
        lastStatus = 408;
        logger.warn("Request timed out", { label, attempt });
      } else {
        lastError = err instanceof Error ? err.message : String(err);
        lastStatus = 503;
        logger.warn("Network error", { label, attempt, error: lastError });
      }
    }
  }

  return { ok: false, status: lastStatus, message: lastError };
}

// ── Data types ───────────────────────────────────────────────────────────────

export interface MarketPriceItem {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
}

export interface PoolItem {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
  exposure: string;
  poolMeta?: string;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  il7d?: number;
}

export interface PoolsResponse {
  status: string;
  data: PoolItem[];
}

export interface MarketStatsData {
  data: {
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
    active_cryptocurrencies: number;
    markets: number;
  };
}

export interface TrendingCoin {
  item: {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    score: number;
    data?: {
      price: number;
      price_change_percentage_24h?: Record<string, number>;
      market_cap?: string;
    };
  };
}

export interface TrendingResponse {
  coins: TrendingCoin[];
}

// ── CoinGecko endpoints ──────────────────────────────────────────────────────

/** Fetch market prices for given CoinGecko IDs (direct). */
export function fetchPrices(ids: string[]): Promise<ApiResult<MarketPriceItem[]>> {
  const url =
    `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids.join(",")}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h,7d`;
  return fetchWithRetry<MarketPriceItem[]>(url, "coingecko-prices");
}

/** Fetch global market stats (direct). */
export function fetchMarketStats(): Promise<ApiResult<MarketStatsData>> {
  return fetchWithRetry<MarketStatsData>(
    `${COINGECKO_BASE}/global`,
    "coingecko-global"
  );
}

/** Fetch CoinGecko trending coins. */
export function fetchTrending(): Promise<ApiResult<TrendingResponse>> {
  return fetchWithRetry<TrendingResponse>(
    `${COINGECKO_BASE}/search/trending`,
    "coingecko-trending"
  );
}

// ── DeFiLlama endpoints ──────────────────────────────────────────────────────

/** Fetch all pool yields from DeFiLlama (direct). */
export function fetchPools(): Promise<ApiResult<PoolsResponse>> {
  return fetchWithRetry<PoolsResponse>(
    `${DEFILLAMA_BASE}/pools`,
    "defillama-pools"
  );
}
