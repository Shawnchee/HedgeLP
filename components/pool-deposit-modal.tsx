"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Info,
    RefreshCw,
    Shield,
    AlertTriangle,
    Zap,
    ChevronRight,
    ExternalLink,
    Check,
    Loader2,
    Droplets,
    Wifi,
    TrendingDown,
} from "lucide-react";
import { AllocationDonut } from "./allocation-donut";
import { CompoundingChart } from "./compounding-chart";
import type { Pool } from "@/hooks/use-pool-data";
import { formatTvl, formatApy, getTokenIconFromSymbol } from "@/hooks/use-pool-data";
import { useChainId } from "wagmi";
import { usePoolDeposit, type DepositResult } from "@/hooks/use-pool-deposit";
import { useTokenPrices } from "@/hooks/use-market-data";

interface PoolDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    pool: Pool | null;
    onSuccess?: (pool: Pool, amount: number, settings: PoolDepositSettings, result?: DepositResult, ethPrice?: number) => void;
}

export interface PoolDepositSettings {
    lpPercent: number;
    autoCompound: boolean;
    autoStopLoss: boolean;
    amount: number;
}

// Tooltip
function Tip({ content, children }: { content: string; children: React.ReactNode }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative inline-flex">
            <div onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
                {children}
            </div>
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-xl text-xs max-w-[220px] z-50"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

type TxStep = "input" | "signing" | "confirming" | "success";

// ============ USD Format Helper ============
function fmtUsd(val: number): string {
    if (val < 0.01 && val > 0) return "<$0.01";
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PoolDepositModal({ isOpen, onClose, pool, onSuccess }: PoolDepositModalProps) {
    const chainId = useChainId();
    const isSepolia = chainId === 11155111;

    const [inputAmount, setInputAmount] = useState("");
    const [lpPercent, setLpPercent] = useState(80);
    const [autoCompound, setAutoCompound] = useState(true);
    const [autoStopLoss, setAutoStopLoss] = useState(true);
    const [showProjection, setShowProjection] = useState(false);
    const [txStep, setTxStep] = useState<TxStep>("input");

    // Real ETH price from CoinGecko
    const { data: tokenPrices } = useTokenPrices();
    const ethPrice = useMemo(() => {
        if (!tokenPrices) return 0;
        const eth = tokenPrices.find((t) => t.id === "ethereum");
        return eth?.current_price ?? 0;
    }, [tokenPrices]);

    // Real pool deposit hook
    const poolDeposit = usePoolDeposit({
        onSuccess: (result) => {
            if (pool) {
                onSuccess?.(pool, amount, { lpPercent, autoCompound, autoStopLoss, amount }, result, ethPrice);
            }
        },
    });

    const hedgePercent = 100 - lpPercent;
    const amount = parseFloat(inputAmount) || 0;

    // ============ Real $ preview calculations ============
    const preview = useMemo(() => {
        if (amount <= 0) return null;
        const lpAllocation = lpPercent / 100;
        const hedgeAllocation = hedgePercent / 100;
        const lpAmountEth = amount * lpAllocation;
        const hedgeAmountEth = amount * hedgeAllocation;

        // LP: half stays as WETH (ETH exposure), half swapped to USDC
        const lpWethKept = lpAmountEth / 2;
        const lpSwapToUsdc = lpAmountEth / 2;

        // Real USD values using live ETH price
        const totalUsd = amount * ethPrice;
        const lpUsd = lpAmountEth * ethPrice;
        const hedgeUsd = hedgeAmountEth * ethPrice;

        // Short: hedgeAmountEth is sold for USDC
        const shortSizeEth = hedgeAmountEth;
        // LP ETH exposure: ~lpWethKept (the WETH side that stays as ETH)
        const lpEthExposure = lpWethKept;
        // Hedge coverage
        const hedgeCoverage = lpEthExposure > 0 ? (shortSizeEth / lpEthExposure) * 100 : 0;

        // Yield projections
        const poolApy = pool?.apy || 18;
        const dailyLpRate = lpUsd * (poolApy / 100 / 365);
        const hedgeDailyCost = hedgeUsd * 0.00015; // ~5.5% annual hedge cost
        const netDailyYield = dailyLpRate - hedgeDailyCost;

        const days30Compound = totalUsd > 0
            ? totalUsd * Math.pow(1 + (netDailyYield / totalUsd), 30)
            : 0;
        const days30Simple = totalUsd + netDailyYield * 30;

        return {
            lpAmountEth,
            hedgeAmountEth,
            lpWethKept,
            lpSwapToUsdc,
            shortSizeEth,
            lpEthExposure,
            hedgeCoverage,
            lpUsd,
            hedgeUsd,
            totalUsd,
            netDailyYield,
            days30Compound: days30Compound - totalUsd,
            days30Simple: days30Simple - totalUsd,
            compoundBonus: (days30Compound - totalUsd) - (days30Simple - totalUsd),
            dailyYieldRate: totalUsd > 0 ? netDailyYield / totalUsd : 0,
            shares: totalUsd * 0.99,
        };
    }, [amount, lpPercent, hedgePercent, pool, ethPrice]);

    // ============ Mock confirm (original behavior) ============
    const handleMockConfirm = async () => {
        if (amount <= 0 || !pool) return;
        setTxStep("signing");
        await new Promise(r => setTimeout(r, 1500));
        setTxStep("confirming");
        await new Promise(r => setTimeout(r, 2000));
        setTxStep("success");
        onSuccess?.(pool, amount, { lpPercent, autoCompound, autoStopLoss, amount });
    };

    // ============ Real Sepolia confirm — single multicall ============
    const handleSepoliaConfirm = async () => {
        if (amount <= 0 || !pool) return;
        await poolDeposit.deposit(inputAmount, lpPercent);
    };

    const handleConfirm = isSepolia ? handleSepoliaConfirm : handleMockConfirm;

    const handleClose = () => {
        setTxStep("input");
        setInputAmount("");
        poolDeposit.reset();
        onClose();
    };

    if (!isOpen || !pool) return null;

    const icons = getTokenIconFromSymbol(pool.symbol);

    // ============ Sepolia transaction states ============
    const isSepoliaProcessing = isSepolia && (
        poolDeposit.status === "executing" ||
        poolDeposit.status === "confirming"
    );
    const isSepoliaSuccess = isSepolia && poolDeposit.status === "success";
    const isSepoliaError = isSepolia && (poolDeposit.status === "error" || poolDeposit.status === "rejected");

    const showInputForm =
        (isSepolia && poolDeposit.status === "idle") ||
        (!isSepolia && txStep === "input");
    const showProcessing =
        (isSepolia && isSepoliaProcessing) ||
        (!isSepolia && (txStep === "signing" || txStep === "confirming"));
    const showSuccess =
        (isSepolia && isSepoliaSuccess) ||
        (!isSepolia && txStep === "success");
    const showError = isSepoliaError;

    const QUICK_ETH_AMOUNTS = ["0.01", "0.05", "0.1", "0.15"];
    const ethBalanceNum = parseFloat(poolDeposit.ethBalance || "0");
    const dr = poolDeposit.depositResult;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-card border rounded-3xl z-[101] shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <img src={icons.token1Icon} alt="" className="w-8 h-8 rounded-full border-2 border-card z-10"
                                onError={(e) => { (e.target as HTMLElement).style.backgroundColor = pool.color1; }} />
                            <img src={icons.token2Icon} alt="" className="w-8 h-8 rounded-full border-2 border-card"
                                onError={(e) => { (e.target as HTMLElement).style.backgroundColor = pool.color2; }} />
                        </div>
                        <div>
                            <h3 className="font-bold">{pool.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-bold uppercase">{pool.version}</span>
                                <span className="text-[10px] text-secondary-foreground font-bold">{pool.fee}</span>
                                <span className="text-[10px] text-secondary-foreground">{pool.chain}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSepolia && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 border border-success/30">
                                <Wifi className="w-3 h-3 text-success" />
                                <span className="text-[10px] font-bold text-success">Sepolia</span>
                            </div>
                        )}
                        <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ============ PROCESSING STATE (Mock) ============ */}
                {showProcessing && !isSepolia && (
                    <>
                        {txStep === "signing" && (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Waiting for Signature</h3>
                                <p className="text-secondary-foreground text-sm">
                                    Please confirm the transaction in your wallet...
                                </p>
                            </div>
                        )}
                        {txStep === "confirming" && (
                            <div className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Confirming Transaction</h3>
                                <p className="text-secondary-foreground text-sm">Waiting for on-chain confirmation...</p>
                            </div>
                        )}
                    </>
                )}

                {/* ============ SEPOLIA PROCESSING — single tx ============ */}
                {showProcessing && isSepolia && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">
                            {poolDeposit.status === "executing" && "Confirm in Wallet"}
                            {poolDeposit.status === "confirming" && "Confirming on Sepolia..."}
                        </h3>
                        <p className="text-sm text-secondary-foreground mb-4">
                            {poolDeposit.stepDescription}
                        </p>

                        {/* Breakdown preview */}
                        <div className="w-full p-3 rounded-xl bg-secondary/20 text-xs text-secondary-foreground font-mono space-y-1">
                            <div className="flex justify-between">
                                <span>Total</span>
                                <span>{inputAmount} ETH {ethPrice > 0 && `(${fmtUsd(amount * ethPrice)})`}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>LP ({lpPercent}%)</span>
                                <span>{(amount * lpPercent / 100).toFixed(4)} ETH</span>
                            </div>
                            {hedgePercent > 0 && (
                                <div className="flex justify-between">
                                    <span>1x Short ({hedgePercent}%)</span>
                                    <span>{(amount * hedgePercent / 100).toFixed(4)} ETH</span>
                                </div>
                            )}
                            {poolDeposit.txHash && (
                                <div className="flex justify-between pt-1 border-t border-secondary/20">
                                    <span>Tx</span>
                                    <a href={poolDeposit.explorerUrl!} target="_blank" rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1">
                                        {poolDeposit.txHash.slice(0, 8)}...{poolDeposit.txHash.slice(-6)}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-xs text-primary font-medium">Single transaction — 1 wallet confirmation</span>
                        </div>
                    </div>
                )}

                {/* ============ MOCK SUCCESS ============ */}
                {showSuccess && !isSepolia && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-success" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-2">Position Opened!</h3>
                        <p className="text-secondary-foreground text-sm mb-6">
                            Your HedgeLP position on {pool.name} is now active.
                        </p>
                        <div className="w-full p-4 rounded-xl bg-secondary/10 space-y-2 text-sm mb-6">
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Deposited</span>
                                <span className="font-mono font-bold">${amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">LP Allocation</span>
                                <span className="font-mono text-primary">{lpPercent}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Hedge Allocation</span>
                                <span className="font-mono text-success">{hedgePercent}%</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl border font-bold hover:bg-secondary/50 transition-colors">Close</button>
                            <button onClick={() => window.location.href = "/dashboard"} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">View Dashboard</button>
                        </div>
                    </div>
                )}

                {/* ============ SEPOLIA SUCCESS — with 1x short breakdown ============ */}
                {showSuccess && isSepolia && (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-success" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-2">HedgeLP Position Created!</h3>
                        <p className="text-secondary-foreground text-sm mb-4">Single transaction confirmed on Sepolia</p>

                        {/* On-chain breakdown */}
                        <div className="w-full space-y-3 mb-4">
                            {/* Deposit summary */}
                            <div className="p-3 rounded-xl bg-secondary/10 space-y-2 text-sm">
                                <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Deposit Summary</div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Total Deposited</span>
                                    <span className="font-mono font-bold">
                                        {dr?.totalEthDeposited ?? inputAmount} ETH
                                        {ethPrice > 0 && <span className="text-secondary-foreground ml-1">({fmtUsd(parseFloat(dr?.totalEthDeposited ?? inputAmount) * ethPrice)})</span>}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">ETH Price</span>
                                    <span className="font-mono">{fmtUsd(ethPrice)}</span>
                                </div>
                            </div>

                            {/* LP breakdown */}
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Droplets className="w-4 h-4 text-primary" />
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">LP Position ({dr?.lpPercent ?? lpPercent}%)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">ETH Allocated</span>
                                    <span className="font-mono font-bold text-primary">
                                        {parseFloat(dr?.lpEthAmount ?? "0").toFixed(4)} ETH
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">WETH Kept (exposure)</span>
                                    <span className="font-mono text-primary">
                                        {parseFloat(dr?.lpWethKept ?? "0").toFixed(4)} ETH
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">LP Value</span>
                                    <span className="font-mono font-bold text-primary">
                                        {fmtUsd(parseFloat(dr?.lpEthAmount ?? "0") * ethPrice)}
                                    </span>
                                </div>
                            </div>

                            {/* Hedge (1x Short) breakdown */}
                            {(dr?.hedgePercent ?? hedgePercent) > 0 && (
                                <div className="p-3 rounded-xl bg-success/5 border border-success/20 space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-success" />
                                        <span className="text-[10px] font-bold text-success uppercase tracking-widest">
                                            1x Short ETH ({dr?.hedgePercent ?? hedgePercent}%)
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-foreground">Short Size</span>
                                        <span className="font-mono font-bold text-success">
                                            {parseFloat(dr?.shortSizeEth ?? dr?.hedgeEthAmount ?? "0").toFixed(4)} ETH
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-foreground">USDC Received</span>
                                        <span className="font-mono font-bold text-success">
                                            {parseFloat(dr?.hedgeUsdcFormatted ?? "0").toFixed(2)} USDC
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-foreground">Entry Price</span>
                                        <span className="font-mono text-success">
                                            {fmtUsd(ethPrice)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-secondary-foreground">Hedge Coverage</span>
                                        <span className="font-mono font-bold text-success">
                                            {(dr?.hedgeCoverage ?? 0).toFixed(0)}% of LP ETH exposure
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-secondary-foreground pt-1 border-t border-success/10">
                                        Sold {parseFloat(dr?.shortSizeEth ?? "0").toFixed(4)} ETH for USDC = 1x short.
                                        If ETH drops, your USDC gains value vs ETH (profit).
                                        On mainnet this would be a GMX/Aave short.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Etherscan link */}
                        {poolDeposit.txHash && (
                            <a href={poolDeposit.explorerUrl!} target="_blank" rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#21325B] text-white font-bold text-sm hover:opacity-90 transition-opacity mb-4">
                                <ExternalLink className="w-4 h-4" />
                                View on Sepolia Etherscan
                            </a>
                        )}

                        <div className="flex gap-3 w-full">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl border font-bold hover:bg-secondary/50 transition-colors">Close</button>
                            <button onClick={() => window.location.href = "/dashboard"} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">View Dashboard</button>
                        </div>
                    </div>
                )}

                {/* ============ ERROR STATE ============ */}
                {showError && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-6">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                            {poolDeposit.isRejected ? "Transaction Cancelled" : "Transaction Failed"}
                        </h3>
                        <p className="text-secondary-foreground text-sm mb-4">
                            {poolDeposit.isRejected ? "You rejected the transaction in your wallet." : poolDeposit.error}
                        </p>
                        {poolDeposit.txHash && (
                            <a href={poolDeposit.explorerUrl!} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline mb-4">
                                <ExternalLink className="w-4 h-4" /> View transaction on Etherscan
                            </a>
                        )}
                        <div className="flex gap-3 w-full">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl border font-bold hover:bg-secondary/50 transition-colors">Close</button>
                            <button onClick={() => poolDeposit.reset()} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Try Again</button>
                        </div>
                    </div>
                )}

                {/* ============ INPUT FORM ============ */}
                {showInputForm && (
                    <>
                        <div className="p-6 space-y-6">

                            {/* Sepolia banner */}
                            {isSepolia && (
                                <div className="p-3 rounded-xl bg-success/10 border border-success/30 flex items-start gap-2">
                                    <Zap className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-success">Single Transaction — 1 Wallet Confirmation</p>
                                        <p className="text-[10px] text-success/80 mt-0.5">
                                            LP + 1x Short executed via Uniswap V4 Universal Router on Sepolia.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Pool Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-secondary/20 text-center">
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">APY</div>
                                    <div className="text-lg font-mono font-bold text-success">{formatApy(pool.apy)}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/20 text-center">
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">TVL</div>
                                    <div className="text-lg font-mono font-bold">{formatTvl(pool.tvlUsd)}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/20 text-center">
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">
                                        {isSepolia ? "ETH Price" : "Fee"}
                                    </div>
                                    <div className="text-lg font-mono font-bold">
                                        {isSepolia ? (ethPrice > 0 ? fmtUsd(ethPrice) : "...") : pool.fee}
                                    </div>
                                </div>
                            </div>

                            {/* How it works — single tx breakdown */}
                            {isSepolia && hedgePercent > 0 && (
                                <div className="p-3 rounded-xl bg-secondary/10 space-y-2">
                                    <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">How It Works (1 Transaction)</div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">LP</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-primary">Provide Liquidity ({lpPercent}%)</div>
                                            <div className="text-[10px] text-secondary-foreground">Half stays as WETH, half swapped to USDC for the pair</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-[10px] font-bold text-success shrink-0">S</div>
                                        <div className="flex-1">
                                            <div className="text-xs font-bold text-success">1x Short ETH ({hedgePercent}%)</div>
                                            <div className="text-[10px] text-secondary-foreground">Sell ETH for USDC — hedges LP&apos;s ETH exposure</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Amount Input */}
                            <div className="p-4 rounded-xl border bg-background/50 focus-within:border-primary transition-colors">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold text-secondary-foreground tracking-widest uppercase">
                                        {isSepolia ? "ETH Amount" : "Amount"}
                                    </span>
                                    {isSepolia ? (
                                        <button
                                            onClick={() => {
                                                const max = Math.max(0, ethBalanceNum - 0.01);
                                                setInputAmount(max.toFixed(6));
                                            }}
                                            className="text-[10px] font-bold text-primary hover:underline"
                                        >
                                            BAL: {parseFloat(poolDeposit.ethBalance).toFixed(4)} ETH
                                        </button>
                                    ) : (
                                        <button onClick={() => setInputAmount("10000")} className="text-[10px] font-bold text-primary hover:underline">MAX</button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={inputAmount}
                                        onChange={(e) => setInputAmount(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xl font-mono p-0 w-full"
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full">
                                        <span className="font-bold text-sm uppercase">{isSepolia ? "ETH" : "USDC"}</span>
                                    </div>
                                </div>

                                {/* USD equivalent */}
                                {isSepolia && ethPrice > 0 && amount > 0 && (
                                    <div className="mt-1 text-sm text-secondary-foreground font-mono">
                                        ≈ {fmtUsd(amount * ethPrice)}
                                    </div>
                                )}

                                {/* Quick amounts */}
                                <div className="flex gap-2 mt-3">
                                    {(isSepolia ? QUICK_ETH_AMOUNTS : ["1000", "5000", "10000", "50000"]).map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setInputAmount(val)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${inputAmount === val ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary/30 hover:bg-secondary/50"}`}
                                        >
                                            {isSepolia ? `${val} ETH` : `$${Number(val).toLocaleString()}`}
                                        </button>
                                    ))}
                                </div>

                                {isSepolia && amount > ethBalanceNum && amount > 0 && (
                                    <div className="mt-2 text-[10px] text-destructive font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> Insufficient ETH balance
                                    </div>
                                )}
                            </div>

                            {/* Allocation Donut */}
                            <div className="p-6 rounded-2xl border bg-card">
                                <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-4 block text-center">
                                    LP / Hedge Allocation
                                </label>
                                <AllocationDonut lpPercent={lpPercent} onChange={setLpPercent} size={180} />

                                {amount > 0 && preview && (
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        {/* LP Position */}
                                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Droplets className="w-3 h-3 text-primary" />
                                                <div className="text-xs text-secondary-foreground">LP Position</div>
                                            </div>
                                            <div className="font-mono font-bold text-primary">
                                                {isSepolia
                                                    ? `${preview.lpAmountEth.toFixed(4)} ETH`
                                                    : `$${preview.lpUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                            </div>
                                            {isSepolia && ethPrice > 0 && (
                                                <div className="text-[10px] font-mono text-primary/70 mt-0.5">
                                                    {fmtUsd(preview.lpUsd)}
                                                </div>
                                            )}
                                            {isSepolia && (
                                                <div className="text-[9px] text-secondary-foreground mt-1">
                                                    ETH exposure: {preview.lpWethKept.toFixed(4)} ETH
                                                </div>
                                            )}
                                        </div>
                                        {/* 1x Short */}
                                        <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                                            <div className="flex items-center gap-1 mb-1">
                                                <TrendingDown className="w-3 h-3 text-success" />
                                                <div className="text-xs text-secondary-foreground">1x Short ETH</div>
                                            </div>
                                            <div className="font-mono font-bold text-success">
                                                {isSepolia
                                                    ? `${preview.hedgeAmountEth.toFixed(4)} ETH`
                                                    : `$${preview.hedgeUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                            </div>
                                            {isSepolia && ethPrice > 0 && (
                                                <div className="text-[10px] font-mono text-success/70 mt-0.5">
                                                    {fmtUsd(preview.hedgeUsd)} → USDC
                                                </div>
                                            )}
                                            {isSepolia && preview.hedgeCoverage > 0 && (
                                                <div className="text-[9px] text-secondary-foreground mt-1">
                                                    Coverage: {preview.hedgeCoverage.toFixed(0)}% of LP ETH
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Total USD value */}
                                {isSepolia && amount > 0 && preview && ethPrice > 0 && (
                                    <div className="mt-3 p-2 rounded-lg bg-secondary/10 text-center">
                                        <span className="text-xs text-secondary-foreground">Total Position Value: </span>
                                        <span className="text-sm font-mono font-bold">{fmtUsd(preview.totalUsd)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-secondary/10 transition-colors">
                                    <input type="checkbox" checked={autoCompound} onChange={(e) => setAutoCompound(e.target.checked)} className="w-5 h-5 rounded accent-primary mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className={`w-4 h-4 ${autoCompound ? "text-primary" : "text-secondary-foreground"}`} />
                                            <span className="font-bold">Auto-compound fees</span>
                                            <Tip content="Automatically reinvest earned LP fees weekly to maximize compound returns.">
                                                <Info className="w-4 h-4 text-secondary-foreground cursor-help" />
                                            </Tip>
                                        </div>
                                        <p className="text-xs text-secondary-foreground mt-1">Reinvest weekly for compound growth</p>
                                    </div>
                                </label>

                                {hedgePercent > 0 && (
                                    <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-secondary/10 transition-colors">
                                        <input type="checkbox" checked={autoStopLoss} onChange={(e) => setAutoStopLoss(e.target.checked)} className="w-5 h-5 rounded accent-primary mt-0.5" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Shield className={`w-4 h-4 ${autoStopLoss ? "text-success" : "text-secondary-foreground"}`} />
                                                <span className="font-bold">Auto-exit on hedge liquidation</span>
                                                <Tip content="If the hedge position approaches liquidation (~50% price move), automatically close the entire position to cap losses.">
                                                    <Info className="w-4 h-4 text-secondary-foreground cursor-help" />
                                                </Tip>
                                            </div>
                                            <p className="text-xs text-secondary-foreground mt-1">Exit position if hedge nears liquidation</p>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {/* 1x Short explanation */}
                            {isSepolia && hedgePercent > 0 && (
                                <div className="p-3 rounded-xl bg-success/5 border border-success/20 flex items-start gap-2">
                                    <TrendingDown className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-success">1x Short = Delta Neutral</p>
                                        <p className="text-[10px] text-success/80 mt-0.5">
                                            {hedgePercent}% of your deposit ({(amount * hedgePercent / 100).toFixed(4)} ETH)
                                            is sold for USDC — equivalent to opening a 1x short on ETH.
                                            This offsets the LP&apos;s WETH exposure. If ETH drops, the short profits; if ETH rises, the LP&apos;s WETH gains.
                                            Net result: price-neutral yield from LP fees.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Projection */}
                            {amount > 0 && preview && preview.dailyYieldRate > 0 && (
                                <>
                                    <button
                                        onClick={() => setShowProjection(!showProjection)}
                                        className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-secondary/10 transition-colors"
                                    >
                                        <span className="font-bold text-sm">View 30-Day Projection</span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${showProjection ? "rotate-90" : ""}`} />
                                    </button>
                                    <AnimatePresence>
                                        {showProjection && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                <div className="p-4 rounded-xl border bg-card">
                                                    <CompoundingChart
                                                        investment={isSepolia && ethPrice > 0 ? preview.totalUsd : amount}
                                                        days={30}
                                                        dailyYield={preview.dailyYieldRate}
                                                        showCompound={autoCompound}
                                                        showNonCompound={true}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}

                            {/* No hedge warning */}
                            {hedgePercent === 0 && (
                                <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                                    <p className="text-xs text-warning">
                                        <strong>No hedge protection.</strong> Position fully exposed to price volatility.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-card border-t p-6">
                            <button
                                onClick={handleConfirm}
                                disabled={amount <= 0 || (isSepolia && amount > ethBalanceNum)}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSepolia ? (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        {hedgePercent > 0 ? "Open LP + 1x Short" : "Open LP Position"}
                                    </>
                                ) : (
                                    <>
                                        Open HedgeLP Position
                                        <ChevronRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                            {isSepolia && amount > 0 && ethPrice > 0 && (
                                <p className="text-xs text-center text-secondary-foreground mt-2 font-mono">
                                    {fmtUsd(amount * ethPrice)} total • {fmtUsd(amount * lpPercent / 100 * ethPrice)} LP • {fmtUsd(amount * hedgePercent / 100 * ethPrice)} Short
                                </p>
                            )}
                            <p className="text-[10px] text-center text-secondary-foreground mt-1">
                                {isSepolia
                                    ? "1 wallet confirmation • Uniswap V4 on Sepolia"
                                    : "This will prompt a wallet signature for approval and deposit."}
                            </p>
                        </div>
                    </>
                )}
            </motion.div>
        </>
    );
}
