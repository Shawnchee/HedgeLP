// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockPoolManager} from "../src/mocks/MockPoolManager.sol";
import {GMXHedgeAdapter} from "../src/GMXHedgeAdapter.sol";
import {HedgeLPVault} from "../src/HedgeLPVault.sol";
import {HedgeLPHook} from "../src/HedgeLPHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // 1. Deploy Mock Tokens
        MockERC20 usdc = new MockERC20("USDC", "USDC");
        MockERC20 weth = new MockERC20("WETH", "WETH");
        console.log("USDC deployed at:", address(usdc));
        console.log("WETH deployed at:", address(weth));

        // 2. Deploy Mock PoolManager
        MockPoolManager poolManager = new MockPoolManager();
        console.log("PoolManager deployed at:", address(poolManager));

        // 3. Deploy GMX Hedge Adapter
        GMXHedgeAdapter hedgeAdapter = new GMXHedgeAdapter(address(usdc), address(weth));
        console.log("GMXHedgeAdapter deployed at:", address(hedgeAdapter));

        // 4. Deploy HedgeLP Vault
        address lpPoolAddress = address(poolManager); 
        HedgeLPVault vault = new HedgeLPVault(IERC20(address(usdc)), hedgeAdapter, lpPoolAddress);
        console.log("HedgeLPVault deployed at:", address(vault));

        // 5. Mine Salt for HedgeLP Hook
        // We need an address where (address & AFTER_SWAP_FLAG) != 0
        // AFTER_SWAP_FLAG = 1 << 6
        uint160 flags = uint160(Hooks.AFTER_SWAP_FLAG);
        
        bytes memory creationCode = type(HedgeLPHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(address(poolManager)), vault);
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        
        address hookAddress;
        bytes32 salt;
        
        for (uint256 i = 0; i < 100000; i++) {
            salt = bytes32(i);
            // Foundry's deterministic deployer address for salt-based deployments
            address factory = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
            hookAddress = computeAddress(salt, bytecode, factory); 
            
            // Check if address has the flag
            if (uint160(hookAddress) & flags != 0) {
                // Check if it doesn't have other flags we don't want (optional but good practice)
                // Here we just need it to be valid according to Hook.isValidHookAddress logic
                // The logic is: must have permission if it returns delta, etc.
                // We only enabled AFTER_SWAP.
                // BaseHook validation: validateHookPermissions(self, permissions)
                // It checks if the address has the permission flag.
                // It does NOT enforce that it DOESN'T have other flags, usually.
                // But let's check Hooks.sol: 
                // "validateHookPermissions" checks: permissions.x == self.hasPermission(X_FLAG)
                // So if we enable AFTER_SWAP, the address MUST have AFTER_SWAP_FLAG.
                // If we disable others, the address MUST NOT have those flags.
                // So we need: (address & ALL_HOOK_MASK) == AFTER_SWAP_FLAG
                
                if ((uint160(hookAddress) & Hooks.ALL_HOOK_MASK) == flags) {
                    console.log("Found salt:", i);
                    break;
                }
            }
        }
        
        require((uint160(hookAddress) & Hooks.ALL_HOOK_MASK) == flags, "Failed to mine salt");

        // Deploy using CREATE2
        HedgeLPHook hook = new HedgeLPHook{salt: salt}(IPoolManager(address(poolManager)), vault);
        console.log("HedgeLPHook deployed at:", address(hook));

        vm.stopBroadcast();
    }

    function computeAddress(bytes32 salt, bytes memory bytecode, address deployer) internal pure returns (address) {
        bytes32 bytecodeHash = keccak256(bytecode);
        bytes32 _data = keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, bytecodeHash));
        return address(uint160(uint256(_data)));
    }
}
