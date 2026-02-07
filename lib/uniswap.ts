// ============================================================
// Uniswap V4 contract addresses, ABIs, PoolKey config
// for Sepolia testnet — migrated from V3 to V4
// ============================================================

// ============ Uniswap V4 Sepolia Deployment Addresses ============
// Source: https://docs.uniswap.org/contracts/v4/deployments#sepolia-11155111
export const UNISWAP_V4_SEPOLIA = {
  POOL_MANAGER: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543" as `0x${string}`,
  UNIVERSAL_ROUTER: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b" as `0x${string}`,
  POSITION_MANAGER: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4" as `0x${string}`,
  V4_QUOTER: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227" as `0x${string}`,
  STATE_VIEW: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c" as `0x${string}`,
  POOL_SWAP_TEST: "0x9b6b46e2c869aa39918db7f52f5557fe577b6eee" as `0x${string}`,
  PERMIT2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as `0x${string}`,
} as const;

// Keep V3 addresses for reference / backward compat
export const UNISWAP_V3_SEPOLIA = {
  SWAP_ROUTER_02: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E" as `0x${string}`,
  QUOTER_V2: "0xEd1f6473345F45b75F8179591dd5bA1888348453" as `0x${string}`,
  FACTORY: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c" as `0x${string}`,
  NONFUNGIBLE_POSITION_MANAGER: "0x1238536071E1c677A632429e3655c799b22cDA52" as `0x${string}`,
} as const;

// ============ Zero / Null Addresses ============
export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// ============ Token Addresses on Sepolia ============
export interface SepoliaToken {
  address: `0x${string}` | null; // null = native ETH
  symbol: string;
  name: string;
  decimals: number;
  color: string;
  image?: string;
  coingeckoId: string;
}

export const SEPOLIA_TOKENS: Record<string, SepoliaToken> = {
  ETH: {
    address: null,
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    color: "#627EEA",
    image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg",
    coingeckoId: "ethereum",
  },
  WETH: {
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    color: "#627EEA",
    image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg",
    coingeckoId: "ethereum",
  },
  USDC: {
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    color: "#2775CA",
    image: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
    coingeckoId: "usd-coin",
  },
  UNI: {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    symbol: "UNI",
    name: "Uniswap",
    decimals: 18,
    color: "#FF007A",
    image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/uni.svg",
    coingeckoId: "uniswap",
  },
  LINK: {
    address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    symbol: "LINK",
    name: "Chainlink",
    decimals: 18,
    color: "#375BD2",
    image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/link.svg",
    coingeckoId: "chainlink",
  },
  DAI: {
    address: "0x68194a729C2450ad26072b3D33ADaCbcef39D574",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    color: "#F5AC37",
    image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dai.svg",
    coingeckoId: "dai",
  },
} as const;

// Helper to get token list as array
export function getSepoliaTokenList(): SepoliaToken[] {
  return Object.values(SEPOLIA_TOKENS);
}

// Helper to get WETH address (used for routing when pool uses WETH instead of native ETH)
export function getWethAddress(): `0x${string}` {
  return SEPOLIA_TOKENS.WETH.address!;
}

/**
 * Get the V4 currency address for routing.
 * In V4, native ETH is represented as address(0).
 * ERC20 tokens use their contract address.
 */
export function getV4CurrencyAddress(token: SepoliaToken): `0x${string}` {
  return token.address ?? ADDRESS_ZERO;
}

// ============================================================
// Uniswap V4 — Universal Router Commands
// Source: https://github.com/Uniswap/universal-router/blob/dev/contracts/libraries/Commands.sol
// ============================================================
export const UR_COMMANDS = {
  // V3 swap commands (0x00-0x07)
  V3_SWAP_EXACT_IN: 0x00,
  V3_SWAP_EXACT_OUT: 0x01,
  PERMIT2_TRANSFER_FROM: 0x02,
  PERMIT2_PERMIT_BATCH: 0x03,
  SWEEP: 0x04,
  TRANSFER: 0x05,
  PAY_PORTION: 0x06,
  // 0x08-0x0f
  V2_SWAP_EXACT_IN: 0x08,
  V2_SWAP_EXACT_OUT: 0x09,
  PERMIT2_PERMIT: 0x0a,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  PERMIT2_TRANSFER_FROM_BATCH: 0x0d,
  // 0x10-0x17 (V4)
  V4_SWAP: 0x10,
} as const;

// ============================================================
// Uniswap V4 — V4Router Actions
// Source: https://github.com/Uniswap/v4-periphery/blob/main/src/libraries/Actions.sol
// ============================================================
export const V4_ACTIONS = {
  // Liquidity actions
  INCREASE_LIQUIDITY: 0x00,
  DECREASE_LIQUIDITY: 0x01,
  MINT_POSITION: 0x02,
  BURN_POSITION: 0x03,
  INCREASE_LIQUIDITY_FROM_DELTAS: 0x04,
  MINT_POSITION_FROM_DELTAS: 0x05,
  // Swap actions
  SWAP_EXACT_IN_SINGLE: 0x06,
  SWAP_EXACT_IN: 0x07,
  SWAP_EXACT_OUT_SINGLE: 0x08,
  SWAP_EXACT_OUT: 0x09,
  // Donate
  DONATE: 0x0a,
  // Settlement actions
  SETTLE: 0x0b,
  SETTLE_ALL: 0x0c,
  SETTLE_PAIR: 0x0d,
  TAKE: 0x0e,
  TAKE_ALL: 0x0f,
  TAKE_PORTION: 0x10,
  TAKE_PAIR: 0x11,
  CLOSE_CURRENCY: 0x12,
  CLEAR_OR_TAKE: 0x13,
  SWEEP: 0x14,
  // Wrapping
  WRAP: 0x15,
  UNWRAP: 0x16,
} as const;

// ============================================================
// V4 PoolKey — identifies a V4 pool
// ============================================================
export interface PoolKey {
  currency0: `0x${string}`; // address(0) for native ETH, must be < currency1
  currency1: `0x${string}`; // the higher-address token
  fee: number;              // fee in hundredths of a bip (3000 = 0.3%)
  tickSpacing: number;      // tick spacing (60 for 0.3% fee standard)
  hooks: `0x${string}`;     // hook contract address (address(0) = no hooks)
}

/**
 * Build a PoolKey ensuring currency0 < currency1 (required by V4).
 * In V4, native ETH = address(0) which is always the lowest.
 */
export function buildPoolKey(
  tokenA: `0x${string}`,
  tokenB: `0x${string}`,
  fee: number = 3000,
  tickSpacing: number = 60,
  hooks: `0x${string}` = ADDRESS_ZERO
): PoolKey {
  const [currency0, currency1] =
    BigInt(tokenA) < BigInt(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
  return { currency0, currency1, fee, tickSpacing, hooks };
}

/**
 * Determine swap direction: zeroForOne = true means swapping currency0 → currency1
 */
export function getSwapDirection(
  poolKey: PoolKey,
  inputCurrency: `0x${string}`
): boolean {
  return inputCurrency.toLowerCase() === poolKey.currency0.toLowerCase();
}

// ============================================================
// Pre-configured V4 Pool Keys for common Sepolia pairs
// ============================================================

// ETH/USDC: native ETH (address(0)) / USDC
export const POOL_KEY_ETH_USDC: PoolKey = buildPoolKey(
  ADDRESS_ZERO,
  SEPOLIA_TOKENS.USDC.address!,
  3000,
  60,
  ADDRESS_ZERO
);

// ETH/UNI: native ETH (address(0)) / UNI
export const POOL_KEY_ETH_UNI: PoolKey = buildPoolKey(
  ADDRESS_ZERO,
  SEPOLIA_TOKENS.UNI.address!,
  3000,
  60,
  ADDRESS_ZERO
);

// ETH/LINK: native ETH (address(0)) / LINK
export const POOL_KEY_ETH_LINK: PoolKey = buildPoolKey(
  ADDRESS_ZERO,
  SEPOLIA_TOKENS.LINK.address!,
  3000,
  60,
  ADDRESS_ZERO
);

// ETH/DAI: native ETH (address(0)) / DAI
export const POOL_KEY_ETH_DAI: PoolKey = buildPoolKey(
  ADDRESS_ZERO,
  SEPOLIA_TOKENS.DAI.address!,
  3000,
  60,
  ADDRESS_ZERO
);

/**
 * Look up a PoolKey for a given pair of SepoliaTokens.
 * Returns null if no known pool configuration exists.
 */
export function findPoolKey(
  tokenA: SepoliaToken,
  tokenB: SepoliaToken
): PoolKey | null {
  const addrA = getV4CurrencyAddress(tokenA);
  const addrB = getV4CurrencyAddress(tokenB);
  return buildPoolKey(addrA, addrB, DEFAULT_FEE, 60, ADDRESS_ZERO);
}

// ============================================================
// ABIs — Universal Router, Permit2, V4Quoter
// ============================================================

/** Universal Router execute function */
export const UNIVERSAL_ROUTER_ABI = [
  {
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

/** Permit2 approve & allowance functions */
export const PERMIT2_ABI = [
  {
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/** V4Quoter quoteExactInputSingle */
export const V4_QUOTER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
            name: "poolKey",
            type: "tuple",
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
          { name: "hookData", type: "bytes" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ============================================================
// V4 Swap Encoding Helpers
// ============================================================

/**
 * ABI type definition for ExactInputSingleParams
 * Used by viem's encodeAbiParameters.
 */
export const EXACT_INPUT_SINGLE_PARAMS_TYPE = [
  {
    type: "tuple",
    components: [
      {
        type: "tuple",
        name: "poolKey",
        components: [
          { type: "address", name: "currency0" },
          { type: "address", name: "currency1" },
          { type: "uint24", name: "fee" },
          { type: "int24", name: "tickSpacing" },
          { type: "address", name: "hooks" },
        ],
      },
      { type: "bool", name: "zeroForOne" },
      { type: "uint128", name: "amountIn" },
      { type: "uint128", name: "amountOutMinimum" },
      { type: "bytes", name: "hookData" },
    ],
  },
] as const;

/** ABI type for SETTLE_ALL / TAKE_ALL params: (Currency currency, uint256 amount) */
export const CURRENCY_AMOUNT_TYPE = [
  { type: "address", name: "currency" },
  { type: "uint256", name: "amount" },
] as const;

/** ABI type for the V4_SWAP input: (bytes actions, bytes[] params) */
export const V4_SWAP_INPUT_TYPE = [
  { type: "bytes", name: "actions" },
  { type: "bytes[]", name: "params" },
] as const;

// ============================================================
// Legacy V3 ABIs (kept for reference / mixed V3+V4 routing)
// ============================================================

// SwapRouter02 ABI (V3 — legacy)
export const SWAP_ROUTER_02_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "deadline", type: "uint256" },
      { name: "data", type: "bytes[]" },
    ],
    name: "multicall",
    outputs: [{ name: "results", type: "bytes[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountMinimum", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    name: "unwrapWETH9",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "refundETH",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

// QuoterV2 ABI (V3 — legacy)
export const QUOTER_V2_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "quoteExactInputSingle",
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// WETH9 ABI
export const WETH_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 minimal ABI for token interactions
export const ERC20_MINIMAL_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ============ Fee Tiers ============
export const FEE_TIERS = {
  LOWEST: 100, // 0.01%
  LOW: 500, // 0.05%
  MEDIUM: 3000, // 0.3%
  HIGH: 10000, // 1%
} as const;

// Default fee tier for most pairs
export const DEFAULT_FEE = FEE_TIERS.MEDIUM;

// ============ Sepolia Explorer ============
export function getSepoliaExplorerUrl(txHash: string): string {
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}

export function getSepoliaAddressUrl(address: string): string {
  return `https://sepolia.etherscan.io/address/${address}`;
}
