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
    ExternalLink
} from "lucide-react";
import { AllocationDonut } from "./allocation-donut";
import { CompoundingChart } from "./compounding-chart";

interface TradePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "deposit" | "withdraw";
    amount: number;
    onConfirm: (settings: TradeSettings) => void;
    currentPrice?: number;
    estimatedShares?: number;
    isLoading?: boolean;
}

export interface TradeSettings {
    lpPercent: number;
    autoCompound: boolean;
    autoStopLoss: boolean;
}

// Tooltip component
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-flex">
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-xl text-xs max-w-[200px] z-50"
                    >
                        {content}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function TradePreviewModal({
    isOpen,
    onClose,
    type,
    amount,
    onConfirm,
    currentPrice = 3000,
    estimatedShares = 0,
    isLoading = false,
}: TradePreviewModalProps) {
    const [lpPercent, setLpPercent] = useState(80);
    const [autoCompound, setAutoCompound] = useState(true);
    const [autoStopLoss, setAutoStopLoss] = useState(true);
    const [showProjection, setShowProjection] = useState(false);

    const hedgePercent = 100 - lpPercent;

    // Calculate preview values
    const preview = useMemo(() => {
        const lpAllocation = lpPercent / 100;
        const hedgeAllocation = hedgePercent / 100;

        const lpAmount = amount * lpAllocation;
        const hedgeAmount = amount * hedgeAllocation;

        // Estimated daily yield (assuming 45% APR for LP, -0.015% funding)
        const lpDailyYield = lpAmount * (0.45 / 365);
        const hedgeDailyCost = hedgeAmount * 0.00015;
        const netDailyYield = lpDailyYield - hedgeDailyCost;

        // 30 day projection
        const days30Compound = amount * Math.pow(1 + (netDailyYield / amount), 30);
        const days30Simple = amount + netDailyYield * 30;

        // Hedge liquidation price (simplified: -50% from entry)
        const liquidationPrice = currentPrice * 0.5;

        return {
            lpAmount,
            hedgeAmount,
            netDailyYield,
            days30Compound: days30Compound - amount,
            days30Simple: days30Simple - amount,
            compoundBonus: (days30Compound - amount) - (days30Simple - amount),
            liquidationPrice,
            dailyYieldRate: netDailyYield / amount,
        };
    }, [amount, lpPercent, hedgePercent, currentPrice]);

    const handleConfirm = () => {
        onConfirm({
            lpPercent,
            autoCompound,
            autoStopLoss,
        });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-card border rounded-3xl z-[101] shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="text-xl font-bold">
                        {type === "deposit" ? "Configure Deposit" : "Withdraw Preview"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Amount Summary */}
                    <div className="p-4 rounded-xl bg-secondary/20 flex items-center justify-between">
                        <span className="text-secondary-foreground">
                            {type === "deposit" ? "Depositing" : "Withdrawing"}
                        </span>
                        <span className="text-2xl font-mono font-bold">
                            ${amount.toLocaleString()}
                        </span>
                    </div>

                    {/* Allocation Donut */}
                    {type === "deposit" && (
                        <div className="p-6 rounded-2xl border bg-card">
                            <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-4 block text-center">
                                Choose Your Allocation
                            </label>
                            <AllocationDonut
                                lpPercent={lpPercent}
                                onChange={setLpPercent}
                                size={180}
                            />

                            {/* Allocation Breakdown */}
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
                        </div>
                    )}

                    {/* Strategy Options */}
                    <div className="space-y-3">
                        {/* Auto-Compound */}
                        <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-secondary/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={autoCompound}
                                onChange={(e) => setAutoCompound(e.target.checked)}
                                className="w-5 h-5 rounded accent-primary mt-0.5"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className={`w-4 h-4 ${autoCompound ? "text-primary" : "text-secondary-foreground"}`} />
                                    <span className="font-bold">Auto-compound fees</span>
                                    <Tooltip content="Automatically reinvest earned LP fees weekly to maximize compound returns. Increases gas costs slightly.">
                                        <Info className="w-4 h-4 text-secondary-foreground cursor-help" />
                                    </Tooltip>
                                </div>
                                <p className="text-xs text-secondary-foreground mt-1">
                                    Reinvest weekly for maximum compound growth
                                </p>
                                {autoCompound && preview.compoundBonus > 0 && (
                                    <div className="mt-2 text-xs text-primary font-bold flex items-center gap-1">
                                        <Zap className="w-3 h-3" />
                                        +${preview.compoundBonus.toFixed(0)} extra over 30 days
                                    </div>
                                )}
                            </div>
                        </label>

                        {/* Auto Stop Loss */}
                        {hedgePercent > 0 && (
                            <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-secondary/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={autoStopLoss}
                                    onChange={(e) => setAutoStopLoss(e.target.checked)}
                                    className="w-5 h-5 rounded accent-primary mt-0.5"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Shield className={`w-4 h-4 ${autoStopLoss ? "text-success" : "text-secondary-foreground"}`} />
                                        <span className="font-bold">Auto-exit on hedge liquidation</span>
                                        <Tooltip content="If the hedge position approaches liquidation (price drops ~50%), automatically close the entire position to prevent losses beyond the hedge collateral. Recommended for safety.">
                                            <Info className="w-4 h-4 text-secondary-foreground cursor-help" />
                                        </Tooltip>
                                    </div>
                                    <p className="text-xs text-secondary-foreground mt-1">
                                        Exit position if hedge nears liquidation
                                    </p>
                                    {autoStopLoss && (
                                        <div className="mt-2 flex items-center gap-2 text-xs">
                                            <AlertTriangle className="w-3 h-3 text-warning" />
                                            <span className="text-secondary-foreground">
                                                Liquidation price: <span className="font-mono text-foreground">${preview.liquidationPrice.toLocaleString()}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </label>
                        )}
                    </div>

                    {/* Projection Chart Toggle */}
                    <button
                        onClick={() => setShowProjection(!showProjection)}
                        className="w-full p-4 rounded-xl border flex items-center justify-between hover:bg-secondary/10 transition-colors"
                    >
                        <span className="font-bold text-sm">View 30-Day Projection</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${showProjection ? "rotate-90" : ""}`} />
                    </button>

                    <AnimatePresence>
                        {showProjection && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 rounded-xl border bg-card">
                                    <CompoundingChart
                                        investment={amount}
                                        days={30}
                                        dailyYield={preview.dailyYieldRate}
                                        showCompound={autoCompound}
                                        showNonCompound={true}
                                    />
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <div className="p-2 rounded-lg bg-secondary/20">
                                            <div className="text-xs text-secondary-foreground">Est. Daily Yield</div>
                                            <div className="font-mono font-bold text-success">
                                                +${preview.netDailyYield.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="p-2 rounded-lg bg-secondary/20">
                                            <div className="text-xs text-secondary-foreground">30-Day Return</div>
                                            <div className="font-mono font-bold text-success">
                                                +${(autoCompound ? preview.days30Compound : preview.days30Simple).toFixed(0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-secondary/10 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-secondary-foreground">Allocation</span>
                            <span className="font-mono">{lpPercent}% LP / {hedgePercent}% Hedge</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-secondary-foreground">Auto-compound</span>
                            <span className={autoCompound ? "text-success" : "text-secondary-foreground"}>
                                {autoCompound ? "Enabled (weekly)" : "Disabled"}
                            </span>
                        </div>
                        {hedgePercent > 0 && (
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Auto stop-loss</span>
                                <span className={autoStopLoss ? "text-success" : "text-warning"}>
                                    {autoStopLoss ? "Enabled" : "Disabled"}
                                </span>
                            </div>
                        )}
                        {estimatedShares > 0 && (
                            <div className="flex justify-between pt-2 border-t">
                                <span className="text-secondary-foreground">Est. shares received</span>
                                <span className="font-mono font-bold">{estimatedShares.toFixed(4)} hlpETH</span>
                            </div>
                        )}
                    </div>

                    {/* Warning if no hedge */}
                    {hedgePercent === 0 && (
                        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <p className="text-xs text-warning">
                                <strong>No hedge protection.</strong> Your position will be fully exposed to price volatility. Consider adding at least 10-20% hedge for downside protection.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-card border-t p-6">
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Confirm {type === "deposit" ? "Deposit" : "Withdrawal"}
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-secondary-foreground mt-3">
                        By confirming, you agree to the vault's terms and understand the risks involved.
                        <a href="#" className="text-primary hover:underline ml-1">Learn more <ExternalLink className="w-3 h-3 inline" /></a>
                    </p>
                </div>
            </motion.div>
        </>
    );
}
