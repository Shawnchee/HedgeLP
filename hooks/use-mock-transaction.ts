"use client";

import { useState } from "react";

interface MockTransactionOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useMockDeposit(options?: MockTransactionOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const deposit = async (amount: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIsSuccess(true);
            options?.onSuccess?.();
        } catch (e) {
            setError(e as Error);
            options?.onError?.(e as Error);
        } finally {
            setIsLoading(false);
        }
    };

    return { deposit, isLoading, isSuccess, error };
}

export function useMockWithdraw(options?: MockTransactionOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const withdraw = async (amount: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setIsSuccess(true);
            options?.onSuccess?.();
        } catch (e) {
            setError(e as Error);
            options?.onError?.(e as Error);
        } finally {
            setIsLoading(false);
        }
    };

    return { withdraw, isLoading, isSuccess, error };
}

type SwapStatus = "idle" | "confirming" | "signing" | "pending" | "success" | "rejected";

interface SwapParams {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    toAmount: string;
}

export function useMockSwap(options?: MockTransactionOptions) {
    const [status, setStatus] = useState<SwapStatus>("idle");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRejected, setIsRejected] = useState(false);

    const swap = async (params: SwapParams) => {
        setIsLoading(true);
        setError(null);
        setIsRejected(false);
        setTxHash(null);

        try {
            // Step 1: Confirming
            setStatus("confirming");
            await new Promise(resolve => setTimeout(resolve, 800));

            // Step 2: Signing
            setStatus("signing");
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Step 3: Pending
            setStatus("pending");
            const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
            setTxHash(mockHash);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 4: Success
            setStatus("success");
            options?.onSuccess?.();
        } catch (e) {
            setError((e as Error).message || "Transaction failed");
            setStatus("rejected");
            setIsRejected(true);
            options?.onError?.(e as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStatus("idle");
        setTxHash(null);
        setError(null);
        setIsLoading(false);
        setIsRejected(false);
    };

    return { swap, status, txHash, error, reset, isLoading, isRejected };
}
