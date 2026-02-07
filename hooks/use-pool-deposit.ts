"use client";

import { useState, useCallback } from "react";
import {
  useAccount,
  useChainId,
  useBalance,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { parseEther, formatEther, formatUnits, encodePacked, encodeAbiParameters } from "viem";
import {
  UNISWAP_V4_SEPOLIA,
  SEPOLIA_TOKENS,
  UNIVERSAL_ROUTER_ABI,
  ERC20_MINIMAL_ABI,
  UR_COMMANDS,
  V4_ACTIONS,
  EXACT_INPUT_SINGLE_PARAMS_TYPE,
  CURRENCY_AMOUNT_TYPE,
  V4_SWAP_INPUT_TYPE,
  POOL_KEY_ETH_USDC,
  ADDRESS_ZERO,
  DEFAULT_FEE,
  getSepoliaExplorerUrl,
} from "@/lib/uniswap";

// ============ Types ============

export type PoolDepositStatus =
  | "idle"
  | "executing"     // Single Universal Router execute in progress
  | "confirming"    // Waiting for on-chain confirmation
  | "success"
  | "error"
  | "rejected";

/** On-chain result of a HedgeLP deposit */
export interface DepositResult {
  totalEthDeposited: string;
  lpEthAmount: string;
  hedgeEthAmount: string;
  /** USDC received for the 1x short (formatted, 6 decimals) */
  hedgeUsdcFormatted: string;
  /** ETH kept as LP WETH side (returned via refundETH) */
  lpWethKept: string;
  /** Total USDC received (LP side + hedge side) */
  totalUsdcReceived: string;
  txHash: string;
  lpPercent: number;
  hedgePercent: number;
  /**
   * 1x Short size in ETH terms.
   * Selling hedgeEthAmount ETH for USDC = opening a 1x short of this size.
   */
  shortSizeEth: string;
  /**
   * LP ETH exposure: ~half the LP ETH goes to WETH side in the pool.
   * For a full-range WETH/USDC position, ~50% of LP value is in WETH.
   */
  lpEthExposure: string;
  /**
   * Hedge coverage: shortSizeEth / lpEthExposure * 100.
   * 100% = fully delta-neutral.
   */
  hedgeCoverage: number;
}

interface UsePoolDepositOptions {
  onSuccess?: (result: DepositResult) => void;
  onError?: (error: Error) => void;
}

// ============ Pool Deposit Hook (V4 Universal Router) ============

export function usePoolDeposit(options?: UsePoolDepositOptions) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isSepolia = chainId === 11155111;

  const [status, setStatus] = useState<PoolDepositStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);
  const [stepDescription, setStepDescription] = useState("");
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null);

  // ETH balance
  const { data: ethBalance, refetch: refetchBalance } = useBalance({
    address,
    query: { enabled: !!address && isSepolia },
  });

  const ethBalanceFormatted = ethBalance?.value
    ? formatEther(ethBalance.value)
    : "0";

  const { writeContractAsync, reset: resetWrite } = useWriteContract();

  function isUserRejection(msg: string): boolean {
    return (
      msg.includes("User rejected") ||
      msg.includes("user rejected") ||
      msg.includes("User denied") ||
      msg.includes("ACTION_REJECTED")
    );
  }

  /**
   * Execute a HedgeLP deposit via Uniswap V4 Universal Router.
   *
   * How it works (V4):
   * - Send total swap ETH as msg.value to Universal Router execute()
   * - Single V4_SWAP command with batched actions:
   *   1. SWAP_EXACT_IN_SINGLE: LP half ETH → USDC (LP stablecoin side)
   *   2. SWAP_EXACT_IN_SINGLE: Hedge ETH → USDC (1x SHORT position)
   *   3. SETTLE_ALL: Settle all native ETH debt (from both swaps)
   *   4. TAKE_ALL: Collect all USDC credits (from both swaps)
   *
   * The remaining ETH (LP WETH side) is never sent to the router — it stays
   * in the user's wallet. Only lpSwapAmount + hedgeAmount are sent as msg.value.
   *
   * The 1x short:
   *   Selling hedge ETH for USDC is economically identical to opening a
   *   1x short on ETH of that size. This offsets the LP's ETH exposure.
   */
  const deposit = useCallback(
    async (ethAmount: string, lpPercent: number) => {
      if (!address || !isSepolia || !publicClient) {
        setError("Connect wallet to Sepolia");
        setStatus("error");
        return;
      }

      const totalAmount = parseEther(ethAmount);
      if (totalAmount <= BigInt(0)) {
        setError("Invalid amount");
        setStatus("error");
        return;
      }

      const hedgePercent = 100 - lpPercent;
      const lpAmount = (totalAmount * BigInt(lpPercent)) / BigInt(100);
      const hedgeAmount = totalAmount - lpAmount;

      // LP: half goes to WETH (kept), half swapped to USDC
      const lpSwapAmount = lpAmount / BigInt(2);
      const lpWethKept = lpAmount - lpSwapAmount; // remaining LP WETH side

      // Total ETH to swap = LP swap portion + hedge portion
      // The lpWethKept stays in user's wallet (never sent to router)
      const totalSwapAmount = lpSwapAmount + hedgeAmount;

      setStatus("executing");
      setError(null);
      setIsRejected(false);
      setTxHash(null);
      setDepositResult(null);
      setStepDescription("Confirm the transaction in your wallet...");

      const usdcAddress = SEPOLIA_TOKENS.USDC.address!;
      const poolKey = POOL_KEY_ETH_USDC;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      try {
        // Read USDC balance before
        const usdcBefore = (await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_MINIMAL_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;

        // ============ Build V4_SWAP with batched actions ============
        // Both swaps use the same pool (ETH/USDC) and direction (zeroForOne=true)
        // We batch them in a single V4_SWAP command for gas efficiency

        // Determine number of swap actions
        const hasLpSwap = lpSwapAmount > BigInt(0);
        const hasHedgeSwap = hedgeAmount > BigInt(0);

        let actions: `0x${string}`;
        const params: `0x${string}`[] = [];

        if (hasLpSwap && hasHedgeSwap) {
          // Two swaps + settle + take
          actions = encodePacked(
            ["uint8", "uint8", "uint8", "uint8"],
            [
              V4_ACTIONS.SWAP_EXACT_IN_SINGLE,
              V4_ACTIONS.SWAP_EXACT_IN_SINGLE,
              V4_ACTIONS.SETTLE_ALL,
              V4_ACTIONS.TAKE_ALL,
            ]
          );

          // Param 0: LP swap (ETH → USDC)
          params.push(
            encodeAbiParameters(EXACT_INPUT_SINGLE_PARAMS_TYPE, [
              {
                poolKey: {
                  currency0: poolKey.currency0,
                  currency1: poolKey.currency1,
                  fee: poolKey.fee,
                  tickSpacing: poolKey.tickSpacing,
                  hooks: poolKey.hooks,
                },
                zeroForOne: true,
                amountIn: lpSwapAmount,
                amountOutMinimum: BigInt(0), // Testnet: no slippage protection
                hookData: "0x" as `0x${string}`,
              },
            ])
          );

          // Param 1: Hedge swap (ETH → USDC)
          params.push(
            encodeAbiParameters(EXACT_INPUT_SINGLE_PARAMS_TYPE, [
              {
                poolKey: {
                  currency0: poolKey.currency0,
                  currency1: poolKey.currency1,
                  fee: poolKey.fee,
                  tickSpacing: poolKey.tickSpacing,
                  hooks: poolKey.hooks,
                },
                zeroForOne: true,
                amountIn: hedgeAmount,
                amountOutMinimum: BigInt(0),
                hookData: "0x" as `0x${string}`,
              },
            ])
          );

          // Param 2: SETTLE_ALL — settle all ETH debt from both swaps
          params.push(
            encodeAbiParameters(CURRENCY_AMOUNT_TYPE, [
              ADDRESS_ZERO, // native ETH
              totalSwapAmount,
            ])
          );

          // Param 3: TAKE_ALL — collect all USDC from both swaps
          params.push(
            encodeAbiParameters(CURRENCY_AMOUNT_TYPE, [
              usdcAddress,
              BigInt(0), // minimum: 0 for testnet
            ])
          );
        } else {
          // Single swap + settle + take
          const swapAmount = hasLpSwap ? lpSwapAmount : hedgeAmount;

          actions = encodePacked(
            ["uint8", "uint8", "uint8"],
            [
              V4_ACTIONS.SWAP_EXACT_IN_SINGLE,
              V4_ACTIONS.SETTLE_ALL,
              V4_ACTIONS.TAKE_ALL,
            ]
          );

          params.push(
            encodeAbiParameters(EXACT_INPUT_SINGLE_PARAMS_TYPE, [
              {
                poolKey: {
                  currency0: poolKey.currency0,
                  currency1: poolKey.currency1,
                  fee: poolKey.fee,
                  tickSpacing: poolKey.tickSpacing,
                  hooks: poolKey.hooks,
                },
                zeroForOne: true,
                amountIn: swapAmount,
                amountOutMinimum: BigInt(0),
                hookData: "0x" as `0x${string}`,
              },
            ])
          );

          params.push(
            encodeAbiParameters(CURRENCY_AMOUNT_TYPE, [
              ADDRESS_ZERO,
              swapAmount,
            ])
          );

          params.push(
            encodeAbiParameters(CURRENCY_AMOUNT_TYPE, [
              usdcAddress,
              BigInt(0),
            ])
          );
        }

        // Encode V4_SWAP input: (bytes actions, bytes[] params)
        const v4SwapInput = encodeAbiParameters(V4_SWAP_INPUT_TYPE, [actions, params]);

        // Encode command bytes
        const commands = encodePacked(["uint8"], [UR_COMMANDS.V4_SWAP]);

        setStepDescription("Executing LP + 1x Short via Uniswap V4...");

        // Execute single Universal Router transaction
        const hash = await writeContractAsync({
          address: UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: "execute",
          args: [commands, [v4SwapInput], deadline],
          value: totalSwapAmount, // Only send ETH that needs to be swapped
        });

        setTxHash(hash);
        setStatus("confirming");
        setStepDescription("Waiting for on-chain confirmation...");

        await publicClient.waitForTransactionReceipt({ hash });

        // Read USDC balance after
        const usdcAfter = (await publicClient.readContract({
          address: usdcAddress,
          abi: ERC20_MINIMAL_ABI,
          functionName: "balanceOf",
          args: [address],
        })) as bigint;

        const totalUsdcReceived = usdcAfter - usdcBefore;

        // LP ETH exposure = lpWethKept (the WETH side of the LP)
        const lpEthExposure = lpWethKept;
        // Short size = hedge ETH sold for USDC
        const shortSizeEth = hedgeAmount;
        // Coverage = short / LP_exposure
        const hedgeCoverage =
          lpEthExposure > BigInt(0)
            ? Number((shortSizeEth * BigInt(10000)) / lpEthExposure) / 100
            : hedgeAmount > BigInt(0)
            ? 100
            : 0;

        // Estimate hedge USDC: proportional to amounts swapped
        const hedgeUsdcEstimate =
          totalSwapAmount > BigInt(0)
            ? (totalUsdcReceived * hedgeAmount) / totalSwapAmount
            : BigInt(0);

        const result: DepositResult = {
          totalEthDeposited: ethAmount,
          lpEthAmount: formatEther(lpAmount),
          hedgeEthAmount: formatEther(hedgeAmount),
          hedgeUsdcFormatted: formatUnits(hedgeUsdcEstimate, 6),
          lpWethKept: formatEther(lpWethKept),
          totalUsdcReceived: formatUnits(totalUsdcReceived, 6),
          txHash: hash,
          lpPercent,
          hedgePercent,
          shortSizeEth: formatEther(shortSizeEth),
          lpEthExposure: formatEther(lpEthExposure),
          hedgeCoverage,
        };

        setDepositResult(result);
        setStatus("success");
        setStepDescription("HedgeLP position created via V4!");
        refetchBalance();
        options?.onSuccess?.(result);
      } catch (e) {
        const msg = (e as Error).message || "Transaction failed";
        if (isUserRejection(msg)) {
          setStatus("rejected");
          setIsRejected(true);
          setError("Transaction cancelled");
        } else {
          setStatus("error");
          setError(msg.slice(0, 300));
        }
      }
    },
    [address, isSepolia, publicClient, writeContractAsync, refetchBalance, options]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setIsRejected(false);
    setStepDescription("");
    setDepositResult(null);
    resetWrite();
  }, [resetWrite]);

  const explorerUrl = txHash ? getSepoliaExplorerUrl(txHash) : null;

  return {
    deposit,
    status,
    txHash,
    error,
    reset,
    isRejected,
    explorerUrl,
    ethBalance: ethBalanceFormatted,
    refetchBalance,
    stepDescription,
    isSepolia,
    depositResult,
  };
}
