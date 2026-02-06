// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

contract MockPoolManager {
    function getSqrtPriceX96(PoolId) external pure returns (uint160) {
        return 79228162514264337593543950336; // 1:1 price
    }

    function lock(bytes calldata data) external returns (bytes memory) {
        return "";
    }
    
    function unlock(bytes calldata data) external returns (bytes memory) {
        return "";
    }
}
