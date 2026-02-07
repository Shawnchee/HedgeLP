"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { VAULT_ABI, ERC20_ABI, getContracts } from "@/lib/contracts";

// ============ Read Hooks ============

export function useVaultAddress() {
    const chainId = useChainId();
    try {
        return getContracts(chainId).vault as `0x${string}`;
    } catch {
        return undefined;
    }
}

export function useUserPosition() {
    const { address } = useAccount();
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getUserPosition",
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!vaultAddress },
    });
}

export function useVaultStats() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getVaultStats",
        query: { enabled: !!vaultAddress },
    });
}

export function useVaultConfig() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getVaultConfig",
        query: { enabled: !!vaultAddress },
    });
}

export function useEstimatedAPY() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getEstimatedAPY",
        query: { enabled: !!vaultAddress },
    });
}

export function useSimulatePnL(priceChangeBps: bigint) {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "simulatePnL",
        args: [priceChangeBps],
        query: { enabled: !!vaultAddress },
    });
}

export function useNeedsRebalance() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "needsRebalance",
        query: { enabled: !!vaultAddress },
    });
}

export function useHedgeHealth() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "checkHedgeHealth",
        query: { enabled: !!vaultAddress },
    });
}

export function useHedgePosition() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getHedgePosition",
        query: { enabled: !!vaultAddress },
    });
}

export function useFundingRate() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getCurrentFundingRate",
        query: { enabled: !!vaultAddress },
    });
}

export function useAllocationDrift() {
    const vaultAddress = useVaultAddress();

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "getAllocationDrift",
        query: { enabled: !!vaultAddress },
    });
}

export function usePreviewDeposit(amount: string) {
    const vaultAddress = useVaultAddress();
    const assets = amount ? parseUnits(amount, 6) : BigInt(0);

    return useReadContract({
        address: vaultAddress,
        abi: VAULT_ABI,
        functionName: "previewDeposit",
        args: [assets],
        query: { enabled: !!vaultAddress && assets > BigInt(0) },
    });
}

// ============ Write Hooks ============

export function useDeposit() {
    const { address } = useAccount();
    const vaultAddress = useVaultAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const deposit = (amount: string) => {
        if (!address || !vaultAddress) return;
        
        const assets = parseUnits(amount, 6); // USDC = 6 decimals
        writeContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: "deposit",
            args: [assets, address],
        });
    };

    return { deposit, hash, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
    const { address } = useAccount();
    const vaultAddress = useVaultAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const withdraw = (amount: string) => {
        if (!address || !vaultAddress) return;
        
        const assets = parseUnits(amount, 6);
        writeContract({
            address: vaultAddress,
            abi: VAULT_ABI,
            functionName: "withdraw",
            args: [assets, address, address],
        });
    };

    return { withdraw, hash, isPending, isConfirming, isSuccess, error };
}

export function useApproveUSDC() {
    const chainId = useChainId();
    const vaultAddress = useVaultAddress();
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const approve = (amount: string) => {
        if (!vaultAddress) return;
        
        try {
            const contracts = getContracts(chainId);
            const value = parseUnits(amount, 6);
            
            writeContract({
                address: contracts.usdc as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [vaultAddress, value],
            });
        } catch (e) {
            console.error("Approve failed:", e);
        }
    };

    return { approve, hash, isPending, isConfirming, isSuccess, error };
}

export function useUSDCAllowance() {
    const { address } = useAccount();
    const chainId = useChainId();
    const vaultAddress = useVaultAddress();

    let usdcAddress: `0x${string}` | undefined;
    try {
        usdcAddress = getContracts(chainId).usdc as `0x${string}`;
    } catch {
        usdcAddress = undefined;
    }

    return useReadContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address && vaultAddress ? [address, vaultAddress] : undefined,
        query: { enabled: !!address && !!vaultAddress && !!usdcAddress },
    });
}

export function useUSDCBalance() {
    const { address } = useAccount();
    const chainId = useChainId();

    let usdcAddress: `0x${string}` | undefined;
    try {
        usdcAddress = getContracts(chainId).usdc as `0x${string}`;
    } catch {
        usdcAddress = undefined;
    }

    return useReadContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
        query: { enabled: !!address && !!usdcAddress },
    });
}
