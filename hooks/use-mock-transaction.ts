"use client";

import { useState, useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";

export type TransactionStatus = 
    | "idle" 
    | "confirming" 
    | "signing" 
    | "pending" 
    | "success" 
    | "error" 
    | "rejected";

export interface TransactionResult {
    status: TransactionStatus;
    txHash: string | null;
    error: string | null;
}

interface UseMockTransactionOptions {
    onSuccess?: (txHash: string) => void;
    onError?: (error: string) => void;
    onRejected?: () => void;
}

// Generate a mock transaction hash
function generateMockTxHash(): string {
    return `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;
}

/**
 * Hook for simulating genuine transaction flows with real wallet signing
 * but mock transaction outcomes. Useful for demo/testnet scenarios.
 */
export function useMockTransaction(options: UseMockTransactionOptions = {}) {
    const { isConnected } = useAccount();
    const { signMessageAsync } = useSignMessage();
    
    const [status, setStatus] = useState<TransactionStatus>("idle");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setStatus("idle");
        setTxHash(null);
        setError(null);
    }, []);

    const execute = useCallback(async (params: {
        type: "deposit" | "withdraw" | "swap" | "approve";
        amount?: string;
        token?: string;
        description?: string;
    }) => {
        if (!isConnected) {
            setError("Wallet not connected");
            setStatus("error");
            return;
        }

        try {
            // Step 1: Show confirmation
            setStatus("confirming");
            setError(null);
            setTxHash(null);
            
            // Brief delay for UI
            await new Promise(resolve => setTimeout(resolve, 300));

            // Step 2: Request wallet signature
            setStatus("signing");
            
            // Create a message that looks like a real transaction
            const message = `HedgeLP ${params.type.toUpperCase()} Request

Amount: ${params.amount || "N/A"}
Token: ${params.token || "USDC"}
Action: ${params.description || params.type}
Timestamp: ${new Date().toISOString()}
Nonce: ${Math.floor(Math.random() * 1000000)}

By signing this message, you authorize HedgeLP to execute this transaction on your behalf.`;

            try {
                // This will trigger the actual wallet popup
                await signMessageAsync({ message });
            } catch (signError: any) {
                // User rejected the signature
                if (signError.message?.includes("rejected") || 
                    signError.message?.includes("denied") ||
                    signError.code === 4001) {
                    setStatus("rejected");
                    setError("Transaction rejected by user");
                    options.onRejected?.();
                    return;
                }
                throw signError;
            }

            // Step 3: Transaction pending (mock)
            setStatus("pending");
            const mockHash = generateMockTxHash();
            setTxHash(mockHash);

            // Simulate blockchain confirmation time
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

            // Step 4: Success
            setStatus("success");
            options.onSuccess?.(mockHash);

        } catch (err: any) {
            console.error("Transaction error:", err);
            setStatus("error");
            setError(err.message || "Transaction failed");
            options.onError?.(err.message || "Transaction failed");
        }
    }, [isConnected, signMessageAsync, options]);

    return {
        execute,
        reset,
        status,
        txHash,
        error,
        isLoading: status === "confirming" || status === "signing" || status === "pending",
        isSuccess: status === "success",
        isError: status === "error",
        isRejected: status === "rejected",
    };
}

/**
 * Hook for mock token approval flow
 */
export function useMockApprove() {
    return useMockTransaction();
}

/**
 * Hook for mock deposit flow
 */
export function useMockDeposit(options: UseMockTransactionOptions = {}) {
    const tx = useMockTransaction(options);
    
    const deposit = useCallback((amount: string) => {
        return tx.execute({
            type: "deposit",
            amount,
            token: "USDC",
            description: `Deposit ${amount} USDC to HedgeLP Vault`,
        });
    }, [tx]);

    return { ...tx, deposit };
}

/**
 * Hook for mock withdraw flow
 */
export function useMockWithdraw(options: UseMockTransactionOptions = {}) {
    const tx = useMockTransaction(options);
    
    const withdraw = useCallback((amount: string) => {
        return tx.execute({
            type: "withdraw",
            amount,
            token: "USDC",
            description: `Withdraw ${amount} USDC from HedgeLP Vault`,
        });
    }, [tx]);

    return { ...tx, withdraw };
}

/**
 * Hook for mock swap flow
 */
export function useMockSwap(options: UseMockTransactionOptions = {}) {
    const tx = useMockTransaction(options);
    
    const swap = useCallback((params: {
        fromToken: string;
        toToken: string;
        fromAmount: string;
        toAmount: string;
    }) => {
        return tx.execute({
            type: "swap",
            amount: params.fromAmount,
            token: params.fromToken,
            description: `Swap ${params.fromAmount} ${params.fromToken} for ${params.toAmount} ${params.toToken}`,
        });
    }, [tx]);

    return { ...tx, swap };
}
