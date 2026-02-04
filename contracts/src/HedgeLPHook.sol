// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/BaseHook.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {HedgeLPVault} from "./HedgeLPVault.sol";

/**
 * @title HedgeLPHook
 * @notice Uniswap v4 Hook that triggers HedgeLP vault rebalancing on swaps.
 */
contract HedgeLPHook is BaseHook {
    using PoolIdLibrary for PoolKey;

    HedgeLPVault public vault;
    uint256 public rebalanceThreshold = 500; // 5% in BPS

    constructor(IPoolManager _poolManager, HedgeLPVault _vault) BaseHook(_poolManager) {
        vault = _vault;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true, // Trigger rebalance check after swap
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Check if rebalance is needed after a swap
     */
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        // 1. Get current price from PoolManager (Mocked with sqrtPriceX96)
        // uint160 sqrtPriceX96 = poolManager.getSqrtPriceX96(key.toId());
        
        // 2. Simple rebalance trigger (Implementation would compare with vault.lastPrice)
        // Dummy price for demonstration
        uint256 currentPrice = 2400 * 1e8; 
        
        vault.hookRebalance(currentPrice);

        return (BaseHook.afterSwap.selector, 0);
    }
}
