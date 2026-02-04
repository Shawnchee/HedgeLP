// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title GMXHedgeAdapter
 * @notice Adapter to interact with GMX v2 for delta hedging
 * @dev This is a simplified version for the hackathon MVP.
 * In a production environment, this would interface with GMX's ExchangeRouter and PositionRouter.
 */
contract GMXHedgeAdapter {
    using SafeERC20 for IERC20;
    
    address public immutable usdc;
    address public immutable weth;
    
    // GMX v2 specific addresses (Mocked for now)
    address public exchangeRouter;
    
    struct Position {
        uint256 size;
        uint256 collateral;
        int256 unrealizedPnl;
        uint256 lastUpdatePrice;
    }

    mapping(bytes32 => Position) public positions;

    event PositionOpened(bytes32 indexed key, address indexToken, uint256 size, uint256 collateral);
    event PositionAdjusted(bytes32 indexed key, uint256 newSize);
    event PositionClosed(bytes32 indexed key, int256 pnl);

    constructor(address _usdc, address _weth) {
        usdc = _usdc;
        weth = _weth;
    }

    /**
     * @notice Opens a short position on GMX
     * @param token The token to short (e.g., WETH)
     * @param size Position size in USD terms
     * @param collateral Amount of USDC used as margin
     */
    function openShort(
        address token,
        uint256 size,
        uint256 collateral
    ) external returns (bytes32 positionKey) {
        IERC20(usdc).safeTransferFrom(msg.sender, address(this), collateral);
        
        positionKey = keccak256(abi.encodePacked(msg.sender, token, block.timestamp));
        
        positions[positionKey] = Position({
            size: size,
            collateral: collateral,
            unrealizedPnl: 0,
            lastUpdatePrice: 2300 * 1e8 // Mock price
        });

        emit PositionOpened(positionKey, token, size, collateral);
    }

    /**
     * @notice Adjusts the size of an existing short position
     */
    function adjustPosition(bytes32 positionKey, uint256 newSize) external {
        Position storage pos = positions[positionKey];
        require(pos.size > 0, "Position not found");
        
        pos.size = newSize;
        emit PositionAdjusted(positionKey, newSize);
    }

    /**
     * @notice Calculates the unrealized PnL of a position
     * @dev Simple calculation: (EntryPrice - CurrentPrice) * Units
     */
    function getPositionInfo(bytes32 positionKey, uint256 currentPrice) 
        external 
        view 
        returns (uint256 size, uint256 collateral, int256 pnl) 
    {
        Position storage pos = positions[positionKey];
        size = pos.size;
        collateral = pos.collateral;
        
        // PnL on a short: (Entry - Current)
        // Simplified for 1x leverage and USD terms
        pnl = int256(pos.size) * (int256(pos.lastUpdatePrice) - int256(currentPrice)) / int256(pos.lastUpdatePrice);
    }
}
