/**
 * Maps common token symbols to CoinGecko IDs.
 *
 * This list covers the tokens most relevant to a hedged-LP vault strategy
 * plus popular majors/stables. Users can pass either the symbol or the
 * CoinGecko ID directly to the /price command.
 */

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  // Majors
  btc: "bitcoin",
  bitcoin: "bitcoin",
  eth: "ethereum",
  ethereum: "ethereum",
  sol: "solana",
  solana: "solana",
  bnb: "binancecoin",
  avax: "avalanche-2",
  matic: "matic-network",
  pol: "matic-network",
  dot: "polkadot",
  ada: "cardano",
  xrp: "ripple",
  atom: "cosmos",
  near: "near",
  arb: "arbitrum",
  op: "optimism",
  base: "base-protocol",
  sui: "sui",
  apt: "aptos",
  sei: "sei-network",

  // Stablecoins
  usdc: "usd-coin",
  usdt: "tether",
  dai: "dai",
  frax: "frax",
  lusd: "liquity-usd",
  gho: "gho",

  // DeFi
  uni: "uniswap",
  aave: "aave",
  ldo: "lido-dao",
  mkr: "maker",
  crv: "curve-dao-token",
  snx: "havven",
  comp: "compound-governance-token",
  gmx: "gmx",
  pendle: "pendle",
  rdnt: "radiant-capital",
  joe: "joe",
  cake: "pancakeswap-token",

  // Wrapped / LSDs
  weth: "weth",
  wbtc: "wrapped-bitcoin",
  steth: "staked-ether",
  wsteth: "wrapped-steth",
  reth: "rocket-pool-eth",
  cbeth: "coinbase-wrapped-staked-eth",

  // Meme
  doge: "dogecoin",
  shib: "shiba-inu",
  pepe: "pepe",
};

/**
 * Resolve a user-supplied token string to a CoinGecko ID.
 *
 * Accepts either:
 *  - A known symbol (case-insensitive) -> mapped ID
 *  - An unknown string -> returned as-is (assumed to be a CoinGecko ID)
 */
export function resolveTokenId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return SYMBOL_TO_COINGECKO[normalized] ?? normalized;
}

/**
 * Resolve multiple comma-or-space-separated tokens to CoinGecko IDs.
 */
export function resolveTokenIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(resolveTokenId);
}

/** Get a printable list of all known symbols. */
export function listKnownSymbols(): string[] {
  // Deduplicate values (multiple symbols may map to same ID)
  const unique = new Set(Object.keys(SYMBOL_TO_COINGECKO));
  return [...unique].sort();
}
