"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits, encodePacked, encodeAbiParameters, maxUint256 } from "viem";
import {
  UNISWAP_V4_SEPOLIA,
  UNIVERSAL_ROUTER_ABI,
  PERMIT2_ABI,
  ERC20_MINIMAL_ABI,
  UR_COMMANDS,
  V4_ACTIONS,
  EXACT_INPUT_SINGLE_PARAMS_TYPE,
  CURRENCY_AMOUNT_TYPE,
  V4_SWAP_INPUT_TYPE,
  type SepoliaToken,
  type PoolKey,
  getV4CurrencyAddress,
  findPoolKey,
  getSwapDirection,
  getSepoliaExplorerUrl,
  DEFAULT_FEE,
  ADDRESS_ZERO,
} from "@/lib/uniswap";

// ============ Types ============

export type SwapStatus =
  | "idle"
  | "approving"       // ERC20 → Permit2 approval
  | "permit2_approve"  // Permit2 → Universal Router approval
  | "approved"
  | "confirming"
  | "pending"
  | "success"
  | "error"
  | "rejected";

export interface RealSwapParams {
  fromToken: SepoliaToken;
  toToken: SepoliaToken;
  fromAmount: string;
  toAmount: string; // expected output (for minimum calculation)
  slippageBps: number; // slippage in basis points (e.g., 50 = 0.5%)
}

interface UseRealSwapOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// ============ Token Balance Hook ============

export function useTokenBalance(token: SepoliaToken | null) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isSepoliaChain = chainId === 11155111;

  // ETH native balance
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address,
    query: {
      enabled: !!address && isSepoliaChain && token?.address === null,
    },
  });

  // ERC20 balance
  const { data: tokenBalance, refetch: refetchToken } = useReadContract({
    address: token?.address ?? undefined,
    abi: ERC20_MINIMAL_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address && isSepoliaChain && !!token?.address,
    },
  });

  const refetch = useCallback(() => {
    if (token?.address === null) {
      refetchEth();
    } else {
      refetchToken();
    }
  }, [token, refetchEth, refetchToken]);

  if (!isSepoliaChain || !token) {
    return { balance: "0", formatted: "0", refetch };
  }

  if (token.address === null) {
    // Native ETH
    const ethFormatted = ethBalance?.value
      ? formatUnits(ethBalance.value, ethBalance.decimals)
      : "0";
    return {
      balance: ethBalance?.value?.toString() ?? "0",
      formatted: ethFormatted,
      refetch,
    };
  }

  // ERC20 token
  const raw = tokenBalance as bigint | undefined;
  return {
    balance: raw?.toString() ?? "0",
    formatted: raw ? formatUnits(raw, token.decimals) : "0",
    refetch,
  };
}

// ============ Token Allowance Hook (for Permit2) ============

export function useTokenAllowance(token: SepoliaToken | null) {
  const { address } = useAccount();
  const chainId = useChainId();
  const isSepoliaChain = chainId === 11155111;

  // ERC20 allowance to Permit2
  const { data: erc20Allowance, refetch: refetchErc20 } = useReadContract({
    address: token?.address ?? undefined,
    abi: ERC20_MINIMAL_ABI,
    functionName: "allowance",
    args: address
      ? [address, UNISWAP_V4_SEPOLIA.PERMIT2]
      : undefined,
    query: {
      enabled:
        !!address &&
        isSepoliaChain &&
        !!token?.address,
    },
  });

  // Permit2 allowance to Universal Router
  const { data: permit2Allowance, refetch: refetchPermit2 } = useReadContract({
    address: UNISWAP_V4_SEPOLIA.PERMIT2,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: address && token?.address
      ? [address, token.address, UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER]
      : undefined,
    query: {
      enabled:
        !!address &&
        isSepoliaChain &&
        !!token?.address,
    },
  });

  const refetch = useCallback(() => {
    refetchErc20();
    refetchPermit2();
  }, [refetchErc20, refetchPermit2]);

  return {
    erc20Allowance: (erc20Allowance as bigint) ?? BigInt(0),
    permit2Amount: (permit2Allowance as readonly [bigint, number, number] | undefined)?.[0] ?? BigInt(0),
    permit2Expiration: (permit2Allowance as readonly [bigint, number, number] | undefined)?.[1] ?? 0,
    refetch,
  };
}

// ============ V4 Swap Encoding ============

/**
 * Encode a single V4_SWAP command input for the Universal Router.
 *
 * For ETH → Token: V4_SWAP with native ETH settle
 * For Token → ETH: V4_SWAP with native ETH take
 * For Token → Token: V4_SWAP with Permit2 settle
 */
function encodeV4SwapInput(
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint
): `0x${string}` {
  // Determine input/output currencies based on swap direction
  const inputCurrency = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const outputCurrency = zeroForOne ? poolKey.currency1 : poolKey.currency0;

  // Actions: SWAP_EXACT_IN_SINGLE → SETTLE_ALL → TAKE_ALL
  const actions = encodePacked(
    ["uint8", "uint8", "uint8"],
    [V4_ACTIONS.SWAP_EXACT_IN_SINGLE, V4_ACTIONS.SETTLE_ALL, V4_ACTIONS.TAKE_ALL]
  );

  // Param 0: ExactInputSingleParams
  const swapParams = encodeAbiParameters(
    EXACT_INPUT_SINGLE_PARAMS_TYPE,
    [
      {
        poolKey: {
          currency0: poolKey.currency0,
          currency1: poolKey.currency1,
          fee: poolKey.fee,
          tickSpacing: poolKey.tickSpacing,
          hooks: poolKey.hooks,
        },
        zeroForOne,
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        hookData: "0x" as `0x${string}`,
      },
    ]
  );

  // Param 1: SETTLE_ALL — (inputCurrency, maxAmountIn)
  const settleParams = encodeAbiParameters(
    CURRENCY_AMOUNT_TYPE,
    [inputCurrency, amountIn]
  );

  // Param 2: TAKE_ALL — (outputCurrency, minAmountOut)
  const takeParams = encodeAbiParameters(
    CURRENCY_AMOUNT_TYPE,
    [outputCurrency, amountOutMinimum]
  );

  // Encode the full V4_SWAP input: (bytes actions, bytes[] params)
  return encodeAbiParameters(
    V4_SWAP_INPUT_TYPE,
    [actions, [swapParams, settleParams, takeParams]]
  );
}

// ============ Real Swap Hook (V4 Universal Router) ============

export function useRealSwap(options?: UseRealSwapOptions) {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isSepoliaChain = chainId === 11155111;

  const [status, setStatus] = useState<SwapStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);

  // ERC20 approval to Permit2
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Permit2 approval to Universal Router
  const {
    writeContract: writePermit2Approve,
    data: permit2ApproveHash,
    isPending: isPermit2ApprovePending,
    error: permit2ApproveError,
    reset: resetPermit2Approve,
  } = useWriteContract();

  const { isSuccess: isPermit2ApproveConfirmed } = useWaitForTransactionReceipt({
    hash: permit2ApproveHash,
  });

  // Swap transaction
  const {
    writeContract: writeSwap,
    data: swapHash,
    isPending: isSwapPending,
    error: swapError,
    reset: resetSwap,
  } = useWriteContract();

  const {
    isLoading: isSwapConfirming,
    isSuccess: isSwapConfirmed,
    isError: isSwapReceiptError,
  } = useWaitForTransactionReceipt({
    hash: swapHash,
  });

  // Track swap hash for display
  useEffect(() => {
    if (swapHash) {
      setTxHash(swapHash);
    }
  }, [swapHash]);

  // Handle ERC20→Permit2 approval confirmation
  useEffect(() => {
    if (isApproveConfirmed && status === "approving") {
      setStatus("permit2_approve");
    }
  }, [isApproveConfirmed, status]);

  // Handle Permit2→Router approval confirmation → execute swap
  useEffect(() => {
    if (isPermit2ApproveConfirmed && status === "permit2_approve") {
      setStatus("approved");
    }
  }, [isPermit2ApproveConfirmed, status]);

  // Handle swap confirmation
  useEffect(() => {
    if (isSwapConfirmed && (status === "pending" || status === "confirming")) {
      setStatus("success");
      options?.onSuccess?.();
    }
  }, [isSwapConfirmed, status, options]);

  // Handle swap receipt error
  useEffect(() => {
    if (isSwapReceiptError && status === "pending") {
      setStatus("error");
      setError("Transaction reverted on chain");
    }
  }, [isSwapReceiptError, status]);

  // Handle errors
  useEffect(() => {
    const errSources = [approveError, permit2ApproveError, swapError];
    for (const err of errSources) {
      if (err) {
        const msg = err.message || "Transaction failed";
        if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("User denied")) {
          setStatus("rejected");
          setIsRejected(true);
          setError("Transaction cancelled by user");
        } else {
          setStatus("error");
          setError(msg.slice(0, 200));
        }
        break;
      }
    }
  }, [approveError, permit2ApproveError, swapError]);

  // Store swap params for post-approval execution
  const [pendingSwapParams, setPendingSwapParams] = useState<RealSwapParams | null>(null);

  /**
   * Execute swap via V4 Universal Router.
   *
   * Flow:
   * - ETH → Token: Send ETH as msg.value, V4_SWAP settles native ETH
   * - Token → ETH/Token: Approve ERC20→Permit2, Permit2→Router, then V4_SWAP
   */
  const executeV4Swap = useCallback(
    (
      poolKey: PoolKey,
      zeroForOne: boolean,
      amountIn: bigint,
      amountOutMinimum: bigint,
      isFromETH: boolean,
    ) => {
      if (!address) return;

      setStatus("confirming");

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);

      // Encode V4_SWAP command
      const commands = encodePacked(["uint8"], [UR_COMMANDS.V4_SWAP]);
      const v4SwapInput = encodeV4SwapInput(poolKey, zeroForOne, amountIn, amountOutMinimum);

      // Execute via Universal Router
      writeSwap({
        address: UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER,
        abi: UNIVERSAL_ROUTER_ABI,
        functionName: "execute",
        args: [commands, [v4SwapInput], deadline],
        value: isFromETH ? amountIn : BigInt(0),
      });

      setStatus("pending");
    },
    [address, writeSwap]
  );

  const swap = useCallback(
    async (params: RealSwapParams) => {
      if (!address || !isSepoliaChain) {
        setError("Connect wallet to Sepolia testnet");
        setStatus("error");
        return;
      }

      setPendingSwapParams(params);
      setStatus("confirming");
      setError(null);
      setIsRejected(false);
      setTxHash(null);

      try {
        const { fromToken, toToken, fromAmount, toAmount, slippageBps } = params;

        const isFromETH = fromToken.address === null;

        // Parse amounts
        const amountIn = parseUnits(fromAmount, fromToken.decimals);

        // Calculate minimum output with slippage
        let amountOutMinimum = BigInt(0);
        if (toAmount && parseFloat(toAmount) > 0) {
          const expectedOut = parseUnits(toAmount, toToken.decimals);
          amountOutMinimum =
            (expectedOut * BigInt(10000 - slippageBps)) / BigInt(10000);
        }

        // Build PoolKey for this pair
        const poolKey = findPoolKey(fromToken, toToken);
        if (!poolKey) {
          setError("No V4 pool found for this pair");
          setStatus("error");
          return;
        }

        // Determine swap direction
        const inputCurrency = getV4CurrencyAddress(fromToken);
        const zeroForOne = getSwapDirection(poolKey, inputCurrency);

        // Check if we need Permit2 approval (only for ERC20 tokens)
        if (!isFromETH && fromToken.address) {
          // Step 1: Check ERC20 allowance to Permit2
          const erc20Allowance = await publicClient?.readContract({
            address: fromToken.address,
            abi: ERC20_MINIMAL_ABI,
            functionName: "allowance",
            args: [address, UNISWAP_V4_SEPOLIA.PERMIT2],
          });

          if ((erc20Allowance as bigint) < amountIn) {
            // Need ERC20 → Permit2 approval
            setStatus("approving");
            writeApprove({
              address: fromToken.address,
              abi: ERC20_MINIMAL_ABI,
              functionName: "approve",
              args: [UNISWAP_V4_SEPOLIA.PERMIT2, maxUint256],
            });
            return; // Will continue after approval confirmed
          }

          // Step 2: Check Permit2 allowance to Universal Router
          const permit2AllowanceResult = await publicClient?.readContract({
            address: UNISWAP_V4_SEPOLIA.PERMIT2,
            abi: PERMIT2_ABI,
            functionName: "allowance",
            args: [address, fromToken.address, UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER],
          });

          const permit2Amount = (permit2AllowanceResult as readonly [bigint, number, number])?.[0] ?? BigInt(0);
          const permit2Expiration = (permit2AllowanceResult as readonly [bigint, number, number])?.[1] ?? 0;
          const now = Math.floor(Date.now() / 1000);

          if (permit2Amount < amountIn || permit2Expiration < now) {
            // Need Permit2 → Universal Router approval
            setStatus("permit2_approve");
            const maxUint160 = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
            const expiration = now + 60 * 60 * 24 * 30; // 30 days
            writePermit2Approve({
              address: UNISWAP_V4_SEPOLIA.PERMIT2,
              abi: PERMIT2_ABI,
              functionName: "approve",
              args: [
                fromToken.address,
                UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER,
                maxUint160,
                expiration,
              ],
            });
            return; // Will continue after Permit2 approval confirmed
          }
        }

        // Execute swap directly (ETH input or already approved)
        executeV4Swap(poolKey, zeroForOne, amountIn, amountOutMinimum, isFromETH);
      } catch (e) {
        const errMsg = (e as Error).message || "Swap preparation failed";
        setError(errMsg.slice(0, 200));
        setStatus("error");
      }
    },
    [address, isSepoliaChain, publicClient, writeApprove, writePermit2Approve, executeV4Swap]
  );

  // Execute swap after ERC20→Permit2 approval confirmed (need Permit2→Router next)
  useEffect(() => {
    if (status === "permit2_approve" && isApproveConfirmed && pendingSwapParams) {
      const { fromToken } = pendingSwapParams;
      if (fromToken.address) {
        const maxUint160 = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
        const expiration = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
        writePermit2Approve({
          address: UNISWAP_V4_SEPOLIA.PERMIT2,
          abi: PERMIT2_ABI,
          functionName: "approve",
          args: [
            fromToken.address,
            UNISWAP_V4_SEPOLIA.UNIVERSAL_ROUTER,
            maxUint160,
            expiration,
          ],
        });
      }
    }
  }, [status, isApproveConfirmed, pendingSwapParams, writePermit2Approve]);

  // Execute swap after all approvals confirmed
  useEffect(() => {
    if (status === "approved" && pendingSwapParams) {
      const { fromToken, toToken, fromAmount, toAmount, slippageBps } = pendingSwapParams;
      const isFromETH = fromToken.address === null;
      const amountIn = parseUnits(fromAmount, fromToken.decimals);

      let amountOutMinimum = BigInt(0);
      if (toAmount && parseFloat(toAmount) > 0) {
        const expectedOut = parseUnits(toAmount, toToken.decimals);
        amountOutMinimum =
          (expectedOut * BigInt(10000 - slippageBps)) / BigInt(10000);
      }

      const poolKey = findPoolKey(fromToken, toToken);
      if (!poolKey) return;

      const inputCurrency = getV4CurrencyAddress(fromToken);
      const zeroForOne = getSwapDirection(poolKey, inputCurrency);

      executeV4Swap(poolKey, zeroForOne, amountIn, amountOutMinimum, isFromETH);
      setPendingSwapParams(null);
    }
  }, [status, pendingSwapParams, executeV4Swap]);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setIsRejected(false);
    setPendingSwapParams(null);
    resetApprove();
    resetPermit2Approve();
    resetSwap();
  }, [resetApprove, resetPermit2Approve, resetSwap]);

  const explorerUrl = txHash ? getSepoliaExplorerUrl(txHash) : null;

  return {
    swap,
    status,
    txHash,
    error,
    reset,
    isLoading: isApprovePending || isPermit2ApprovePending || isSwapPending || isSwapConfirming,
    isRejected,
    explorerUrl,
  };
}

// ============ V4 Quote Hook ============

export function useSwapQuote(
  fromToken: SepoliaToken | null,
  toToken: SepoliaToken | null,
  amount: string
) {
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const isSepoliaChain = chainId === 11155111;

  const [quote, setQuote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuote = useCallback(async () => {
    if (
      !isSepoliaChain ||
      !fromToken ||
      !toToken ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !publicClient
    ) {
      setQuote(null);
      return;
    }

    setIsLoading(true);
    try {
      const poolKey = findPoolKey(fromToken, toToken);
      if (!poolKey) {
        setQuote(null);
        return;
      }

      const inputCurrency = getV4CurrencyAddress(fromToken);
      const zeroForOne = getSwapDirection(poolKey, inputCurrency);
      const amountIn = parseUnits(amount, fromToken.decimals);

      // Use V4Quoter for on-chain quote (static call)
      const result = await publicClient.simulateContract({
        address: UNISWAP_V4_SEPOLIA.V4_QUOTER,
        abi: [
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
        ],
        functionName: "quoteExactInputSingle",
        args: [
          {
            poolKey: {
              currency0: poolKey.currency0,
              currency1: poolKey.currency1,
              fee: poolKey.fee,
              tickSpacing: poolKey.tickSpacing,
              hooks: poolKey.hooks,
            },
            zeroForOne,
            exactAmount: amountIn,
            sqrtPriceLimitX96: BigInt(0),
            hookData: "0x" as `0x${string}`,
          },
        ],
      });

      const amountOut = result.result[0] as bigint;
      setQuote(formatUnits(amountOut, toToken.decimals));
    } catch (e) {
      console.warn("V4 Quote failed (pool may not exist):", e);
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [isSepoliaChain, fromToken, toToken, amount, publicClient]);

  return { quote, isLoading, fetchQuote };
}
