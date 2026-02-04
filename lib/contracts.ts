// Contract addresses per chain
export const CONTRACTS = {
    // Arbitrum One
    42161: {
        vault: "0x0000000000000000000000000000000000000000", // TODO: Deploy
        usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
        weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    },
    // Base
    8453: {
        vault: "0x0000000000000000000000000000000000000000", // TODO: Deploy
        usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        weth: "0x4200000000000000000000000000000000000006",
    },
    // Sepolia (testnet)
    11155111: {
        vault: "0x0000000000000000000000000000000000000000", // TODO: Deploy
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    },
} as const;

export type SupportedChainId = keyof typeof CONTRACTS;

export function getContracts(chainId: number) {
    const contracts = CONTRACTS[chainId as SupportedChainId];
    if (!contracts) {
        throw new Error(`Unsupported chain: ${chainId}`);
    }
    return contracts;
}

// Simplified ABI for vault (key functions only)
export const VAULT_ABI = [
    // Read functions
    "function totalAssets() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function getUserPosition(address user) view returns (uint256 totalValue, uint256 shares, uint256 lpValue, int256 hedgeValue, uint256 lpAllocationBps, uint256 hedgeAllocationBps)",
    "function getVaultStats() view returns (uint256 tvl, uint256 totalSharesSupply, uint256 sharePrice, uint256 currentPrice)",
    "function getVaultConfig() view returns (uint256 lpAllocation, uint256 hedgeAllocation, uint256 rebalanceThreshold, uint256 minDeposit, uint256 maxDeposit, bool isPaused)",
    "function getEstimatedAPY() view returns (int256 netAPY, uint256 lpFeeAPY, int256 fundingCostAPY)",
    "function simulatePnL(int256 priceChangeBps) view returns (int256 lpPnL, int256 hedgePnL, int256 netPnL, int256 pureLpPnL)",
    "function needsRebalance() view returns (bool)",
    "function checkHedgeHealth() view returns (bool healthy, uint256 healthFactor)",
    "function getCurrentFundingRate() view returns (int256)",
    "function getHedgePosition() view returns (uint256 size, uint256 collateral, int256 unrealizedPnl, uint256 liquidationPrice)",
    "function getAllocationDrift() view returns (int256 lpDriftBps, int256 hedgeDriftBps, bool rebalanceNeeded)",
    "function previewDeposit(uint256 assets) view returns (uint256)",
    "function previewWithdraw(uint256 assets) view returns (uint256)",
    // Write functions
    "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
    "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
    "function rebalance()",
] as const;

// ERC20 ABI for approvals
export const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
] as const;
