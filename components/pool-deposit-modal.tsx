"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { AllocationDonut } from "./allocation-donut";
import { CompoundingChart } from "./compounding-chart";
import type { Pool } from "@/hooks/use-pool-data";
import { formatTvl, formatApy, getTokenIconFromSymbol } from "@/hooks/use-pool-data";

interface PoolDepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    pool: Pool | null;
    onSuccess?: (pool: Pool, amount: number, settings: PoolDepositSettings) => void;
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

export function PoolDepositModal({ isOpen, onClose, pool, onSuccess }: PoolDepositModalProps) {
    const [inputAmount, setInputAmount] = useState("");
    const [lpPercent, setLpPercent] = useState(80);
    const [autoCompound, setAutoCompound] = useState(true);
    const [autoStopLoss, setAutoStopLoss] = useState(true);
    const [showProjection, setShowProjection] = useState(false);
    const [txStep, setTxStep] = useState<TxStep>("input");

    const hedgePercent = 100 - lpPercent;
    const amount = parseFloat(inputAmount) || 0;

    const preview = useMemo(() => {
        if (amount <= 0) return null;
        const lpAllocation = lpPercent / 100;
        const hedgeAllocation = hedgePercent / 100;
        const lpAmount = amount * lpAllocation;
        const hedgeAmount = amount * hedgeAllocation;

        const poolApy = pool?.apy || 18;
        const dailyLpRate = lpAmount * (poolApy / 100 / 365);
        const hedgeDailyCost = hedgeAmount * 0.00015;
        const netDailyYield = dailyLpRate - hedgeDailyCost;

        const days30Compound = amount * Math.pow(1 + (netDailyYield / amount), 30);
        const days30Simple = amount + netDailyYield * 30;

        return {
            lpAmount,
            hedgeAmount,
            netDailyYield,
            days30Compound: days30Compound - amount,
            days30Simple: days30Simple - amount,
            compoundBonus: (days30Compound - amount) - (days30Simple - amount),
            dailyYieldRate: netDailyYield / amount,
            shares: amount * 0.99,
        };
    }, [amount, lpPercent, hedgePercent, pool]);

    const handleConfirm = async () => {
        if (amount <= 0 || !pool) return;

        // Step 1: Signing
        setTxStep("signing");
        await new Promise(r => setTimeout(r, 1500));

        // Step 2: Confirming
        setTxStep("confirming");
        await new Promise(r => setTimeout(r, 2000));

        // Step 3: Success
        setTxStep("success");
        onSuccess?.(pool, amount, { lpPercent, autoCompound, autoStopLoss, amount });
    };

    const handleClose = () => {
        setTxStep("input");
        setInputAmount("");
        onClose();
    };

    if (!isOpen || !pool) return null;

    const icons = getTokenIconFromSymbol(pool.symbol);

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
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border rounded-3xl z-[101] shadow-2xl"
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
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Transaction States */}
                {txStep === "signing" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Waiting for Signature</h3>
                        <p className="text-secondary-foreground text-sm">
                            Please confirm the transaction in your wallet...
                        </p>
                        <div className="mt-6 p-3 rounded-xl bg-secondary/20 text-xs text-secondary-foreground font-mono w-full">
                            <div className="flex justify-between mb-1">
                                <span>Action</span>
                                <span>Deposit ${amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span>Pool</span>
                                <span>{pool.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Allocation</span>
                                <span>{lpPercent}% LP / {hedgePercent}% Hedge</span>
                            </div>
                        </div>
                    </div>
                )}

                {txStep === "confirming" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Confirming Transaction</h3>
                        <p className="text-secondary-foreground text-sm">
                            Transaction submitted. Waiting for on-chain confirmation...
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-xs text-secondary-foreground">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-mono">0x7a3f...b2c1</span>
                        </div>
                    </div>
                )}

                {txStep === "success" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6"
                        >
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
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Shares Received</span>
                                <span className="font-mono font-bold">{(amount * 0.99).toFixed(2)} HLP</span>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 rounded-xl border font-bold hover:bg-secondary/50 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => window.location.href = "/dashboard"}
                                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                            >
                                View Dashboard
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Form */}
                {txStep === "input" && (
                    <>
                        <div className="p-6 space-y-6">
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
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">Fee</div>
                                    <div className="text-lg font-mono font-bold">{pool.fee}</div>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="p-4 rounded-xl border bg-background/50 focus-within:border-primary transition-colors">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold text-secondary-foreground tracking-widest uppercase">Amount</span>
                                    <button
                                        onClick={() => setInputAmount("10000")}
                                        className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                        MAX
                                    </button>
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
                                        <span className="font-bold text-sm uppercase">USDC</span>
                                    </div>
                                </div>
                                {/* Quick amounts */}
                                <div className="flex gap-2 mt-3">
                                    {["1000", "5000", "10000", "50000"].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setInputAmount(val)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${inputAmount === val ? "bg-primary/10 text-primary border border-primary/20" : "bg-secondary/30 hover:bg-secondary/50"}`}
                                        >
                                            ${Number(val).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Allocation Donut */}
                            <div className="p-6 rounded-2xl border bg-card">
                                <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-4 block text-center">
                                    LP / Hedge Allocation
                                </label>
                                <AllocationDonut lpPercent={lpPercent} onChange={setLpPercent} size={180} />

                                {amount > 0 && preview && (
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                                            <div className="text-xs text-secondary-foreground mb-1">LP Position</div>
                                            <div className="font-mono font-bold text-primary">
                                                ${preview.lpAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                                            <div className="text-xs text-secondary-foreground mb-1">Hedge Position</div>
                                            <div className="font-mono font-bold text-success">
                                                ${preview.hedgeAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
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
                                                <Tip content="If the hedge position approaches liquidation (~50% price move against), automatically close the entire position to cap losses.">
                                                    <Info className="w-4 h-4 text-secondary-foreground cursor-help" />
                                                </Tip>
                                            </div>
                                            <p className="text-xs text-secondary-foreground mt-1">Exit position if hedge nears liquidation</p>
                                        </div>
                                    </label>
                                )}
                            </div>

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
                                                    <CompoundingChart investment={amount} days={30} dailyYield={preview.dailyYieldRate} showCompound={autoCompound} showNonCompound={true} />
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
                                disabled={amount <= 0}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Open HedgeLP Position
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <p className="text-[10px] text-center text-secondary-foreground mt-3">
                                This will prompt a wallet signature for approval and deposit.
                            </p>
                        </div>
                    </>
                )}
            </motion.div>
        </>
    );
}
