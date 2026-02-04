// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {GMXHedgeAdapter} from "./GMXHedgeAdapter.sol";

/**
 * @title HedgeLPVault
 * @notice Delta-neutral LP vault that splits deposits between Uniswap v4 and GMX shorts.
 */
contract HedgeLPVault is ERC4626 {
    using SafeERC20 for IERC20;

    GMXHedgeAdapter public immutable hedgeAdapter;
    address public immutable lpPool; // Uniswap v4 Pool
    
    uint256 public constant LP_PERCENT = 80;
    uint256 public constant HEDGE_PERCENT = 20;
    uint256 public constant BPS = 100;

    bytes32 public hedgePositionKey;
    uint256 public lastPrice;

    event Rebalanced(uint256 lpValue, uint256 hedgeValue, uint256 price);

    constructor(
        IERC20 _asset,
        GMXHedgeAdapter _hedgeAdapter,
        address _lpPool
    ) ERC4626(_asset) ERC20("HedgeLP Vault", "vHLP") {
        hedgeAdapter = _hedgeAdapter;
        lpPool = _lpPool;
    }

    /**
     * @notice Custody funds and allocate 80/20
     */
    function afterDeposit(uint256 assets, uint256 /*shares*/) internal override {
        uint256 lpAmount = (assets * LP_PERCENT) / BPS;
        uint256 hedgeAmount = assets - lpAmount;

        // 1. Send 80% to Uniswap LP (Implementation would call PoolManager)
        // IERC20(asset()).approve(lpPool, lpAmount);
        
        // 2. Open/Adjust hedge on GMX
        IERC20(asset()).forceApprove(address(hedgeAdapter), hedgeAmount);
        
        if (hedgePositionKey == bytes32(0)) {
            hedgePositionKey = hedgeAdapter.openShort(
                address(0), // Would be WETH
                lpAmount / 2, // Hedge roughly half of volatile exposure
                hedgeAmount
            );
        } else {
            // Adjust existing
            (uint256 currentSize, , ) = hedgeAdapter.getPositionInfo(hedgePositionKey, lastPrice);
            hedgeAdapter.adjustPosition(hedgePositionKey, currentSize + (lpAmount / 2));
        }
    }

    /**
     * @notice Triggered by Uniswap v4 Hook to rebalance the delta
     */
    function hookRebalance(uint256 currentPrice) external {
        // Only pool/hook can call this
        // require(msg.sender == hook, "Unauthorized");
        
        lastPrice = currentPrice;
        
        // Logic to calculate delta deviation and adjust GMX position
        // If price dropped, LP exposure in USD terms changed, adjust short size
        (uint256 currentSize, uint256 collateral, int256 pnl) = hedgeAdapter.getPositionInfo(hedgePositionKey, currentPrice);
        
        // Simplified: Target short size = (Total Assets * 0.4) 
        // (Assuming 80% LP of which 50% is volatile = 40% net exposure)
        uint256 targetSize = (totalAssets() * 40) / 100;
        
        if (absDifference(currentSize, targetSize) > (targetSize * 5) / 100) {
            hedgeAdapter.adjustPosition(hedgePositionKey, targetSize);
            emit Rebalanced(lpValue(), uint256(int256(collateral) + pnl), currentPrice);
        }
    }

    function lpValue() public view returns (uint256) {
        // Would fetch from Uniswap v4 PoolManager
        return (totalAssets() * 80) / 100;
    }

    function totalAssets() public view override returns (uint256) {
        // LP Value + Hedge Value (Collateral + PnL)
        ( , uint256 collateral, int256 pnl) = hedgeAdapter.getPositionInfo(hedgePositionKey, lastPrice);
        return lpValue() + uint256(int256(collateral) + pnl);
    }

    function absDifference(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }
}
