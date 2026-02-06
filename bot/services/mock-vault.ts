/**
 * Mock vault state for interactive flows.
 *
 * Simulates on-chain vault data matching the dashboard's mock structure.
 * Will be replaced by real contract reads once deployed.
 */

export interface VaultState {
  // Strategy
  lpAllocationPct: number;
  hedgeAllocationPct: number;
  rebalanceThresholdPct: number;

  // LP leg
  lpPool: string;
  lpProtocol: string;
  lpFee: string;

  // Hedge leg
  hedgeType: string;
  hedgeProtocol: string;

  // Performance
  estimatedAPR: number;
  lpFeeAPY: number;
  fundingCostAPY: number;
  netAPY: number;

  // Vault stats
  tvl: number;
  sharePrice: number;
  vaultUtilization: number;

  // Health
  healthFactor: number;
  healthy: boolean;
  needsRebalance: boolean;
  currentFundingRate: number;
  lastRebalance: string;

  // Limits
  minDeposit: number;
  maxDeposit: number;

  // Status
  isPaused: boolean;
  status: "SIMULATED" | "LIVE";
}

// Singleton mock vault state (mutated by rebalance flow)
let vaultState: VaultState = {
  lpAllocationPct: 80,
  hedgeAllocationPct: 20,
  rebalanceThresholdPct: 5,

  lpPool: "ETH / USDC",
  lpProtocol: "Uniswap v4",
  lpFee: "0.3%",

  hedgeType: "ETH Short (1x)",
  hedgeProtocol: "GMX v2 Perpetual",

  estimatedAPR: 18.4,
  lpFeeAPY: 22.5,
  fundingCostAPY: -4.1,
  netAPY: 18.4,

  tvl: 4_250_000,
  sharePrice: 10.0,
  vaultUtilization: 98.2,

  healthFactor: 2.45,
  healthy: true,
  needsRebalance: false,
  currentFundingRate: -0.0023,
  lastRebalance: "2 hours ago",

  minDeposit: 100,
  maxDeposit: 1_000_000,

  isPaused: false,
  status: "SIMULATED",
};

export function getVaultState(): Readonly<VaultState> {
  return vaultState;
}

/** Mock rebalance — update allocation and recalculate APR. */
export function rebalanceVault(newLpPct: number): VaultState {
  const newHedgePct = 100 - newLpPct;

  // Simulate APR change based on allocation (more LP = more fee yield, less hedge cost)
  const lpFeeAPY = 22.5 * (newLpPct / 80); // scales linearly from baseline
  const fundingCostAPY = -4.1 * (newHedgePct / 20); // scales with hedge size
  const netAPY = lpFeeAPY + fundingCostAPY;

  vaultState = {
    ...vaultState,
    lpAllocationPct: newLpPct,
    hedgeAllocationPct: newHedgePct,
    lpFeeAPY: Math.round(lpFeeAPY * 10) / 10,
    fundingCostAPY: Math.round(fundingCostAPY * 10) / 10,
    netAPY: Math.round(netAPY * 10) / 10,
    estimatedAPR: Math.round(netAPY * 10) / 10,
    needsRebalance: false,
    lastRebalance: "just now",
    healthFactor: newHedgePct >= 15 ? 2.45 : newHedgePct >= 10 ? 1.8 : 1.2,
    healthy: newHedgePct >= 10,
  };

  return vaultState;
}

/** Mock deposit — increases TVL. */
export function depositToVault(amountUsd: number): VaultState {
  vaultState = {
    ...vaultState,
    tvl: vaultState.tvl + amountUsd,
  };
  return vaultState;
}

/** Mock withdraw — decreases TVL. */
export function withdrawFromVault(amountUsd: number): VaultState {
  const newTvl = Math.max(0, vaultState.tvl - amountUsd);
  vaultState = {
    ...vaultState,
    tvl: newTvl,
  };
  return vaultState;
}
