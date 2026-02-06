"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, RefreshCw, Shield, Info, Loader2, Check,
    AlertTriangle, ChevronRight, Sliders,
} from "lucide-react";
import { AllocationDonut } from "./allocation-donut";
import type { VaultPosition } from "@/hooks/use-positions";

// ==================== Manage / Rebalance Modal ====================

interface ManageModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: VaultPosition | null;
    onSave: (id: string, updates: { lpPercent: number; hedgePercent: number; autoCompound: boolean; autoStopLoss: boolean }) => void;
}

type ManageStep = "edit" | "signing" | "success";

export function ManagePositionModal({ isOpen, onClose, position, onSave }: ManageModalProps) {
    const [lpPercent, setLpPercent] = useState(position?.lpPercent ?? 80);
    const [autoCompound, setAutoCompound] = useState(position?.autoCompound ?? true);
    const [autoStopLoss, setAutoStopLoss] = useState(position?.autoStopLoss ?? true);
    const [step, setStep] = useState<ManageStep>("edit");

    // Reset state when position changes
    const posId = position?.id;
    const [lastPosId, setLastPosId] = useState(posId);
    if (posId !== lastPosId) {
        setLastPosId(posId);
        setLpPercent(position?.lpPercent ?? 80);
        setAutoCompound(position?.autoCompound ?? true);
        setAutoStopLoss(position?.autoStopLoss ?? true);
        setStep("edit");
    }

    const hedgePercent = 100 - lpPercent;

    const hasChanges = position && (
        lpPercent !== position.lpPercent ||
        autoCompound !== position.autoCompound ||
        autoStopLoss !== position.autoStopLoss
    );

    const handleConfirm = async () => {
        if (!position || !hasChanges) return;
        setStep("signing");
        await new Promise(r => setTimeout(r, 1800));
        onSave(position.id, { lpPercent, hedgePercent, autoCompound, autoStopLoss });
        setStep("success");
    };

    const handleClose = () => {
        setStep("edit");
        onClose();
    };

    if (!isOpen || !position) return null;

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-card border rounded-3xl z-[101] shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            <img src={position.icon1} alt="" className="w-7 h-7 rounded-full border-2 border-card z-10" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = position.color1; }} />
                            <img src={position.icon2} alt="" className="w-7 h-7 rounded-full border-2 border-card" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = position.color2; }} />
                        </div>
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-primary" />
                                Manage Position
                            </h3>
                            <div className="text-xs text-secondary-foreground">{position.pool} &bull; {position.chain}</div>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                {/* Signing State */}
                {step === "signing" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Rebalancing Position</h3>
                        <p className="text-secondary-foreground text-sm">Please confirm the rebalance transaction in your wallet...</p>
                        <div className="mt-6 p-3 rounded-xl bg-secondary/20 text-xs text-secondary-foreground font-mono w-full">
                            <div className="flex justify-between mb-1"><span>Pool</span><span>{position.pool}</span></div>
                            <div className="flex justify-between mb-1"><span>Old Allocation</span><span>{position.lpPercent}% / {position.hedgePercent}%</span></div>
                            <div className="flex justify-between"><span>New Allocation</span><span>{lpPercent}% / {hedgePercent}%</span></div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {step === "success" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-success" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-2">Position Rebalanced!</h3>
                        <p className="text-secondary-foreground text-sm mb-6">
                            Your {position.pool} position has been updated to {lpPercent}% LP / {hedgePercent}% Hedge.
                        </p>
                        <button onClick={handleClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                            Done
                        </button>
                    </div>
                )}

                {/* Edit Form */}
                {step === "edit" && (
                    <>
                        <div className="p-6 space-y-6">
                            {/* Current Position Summary */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-secondary/20 text-center">
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">Value</div>
                                    <div className="text-lg font-mono font-bold">${position.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-secondary/20 text-center">
                                    <div className="text-[10px] text-secondary-foreground uppercase font-bold tracking-wider mb-1">APY</div>
                                    <div className="text-lg font-mono font-bold text-success">{position.apy.toFixed(1)}%</div>
                                </div>
                            </div>

                            {/* Rebalance Allocation */}
                            <div className="p-6 rounded-2xl border bg-card">
                                <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-4 block text-center">
                                    Adjust LP / Hedge Allocation
                                </label>
                                <AllocationDonut lpPercent={lpPercent} onChange={setLpPercent} size={180} />

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="text-xs text-secondary-foreground mb-1">LP Position</div>
                                        <div className="font-mono font-bold text-primary">
                                            ${(position.currentValue * lpPercent / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                                        <div className="text-xs text-secondary-foreground mb-1">Hedge Position</div>
                                        <div className="font-mono font-bold text-success">
                                            ${(position.currentValue * hedgePercent / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategy Options */}
                            <div className="space-y-3">
                                <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer hover:bg-secondary/10 transition-colors">
                                    <input type="checkbox" checked={autoCompound} onChange={(e) => setAutoCompound(e.target.checked)} className="w-5 h-5 rounded accent-primary mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className={`w-4 h-4 ${autoCompound ? "text-primary" : "text-secondary-foreground"}`} />
                                            <span className="font-bold">Auto-compound fees</span>
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
                                            </div>
                                            <p className="text-xs text-secondary-foreground mt-1">Exit position if hedge nears liquidation</p>
                                        </div>
                                    </label>
                                )}
                            </div>

                            {/* Change Indicator */}
                            {hasChanges && (
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
                                    <div className="font-bold text-primary mb-1">Changes to apply:</div>
                                    {lpPercent !== position.lpPercent && (
                                        <div className="flex justify-between">
                                            <span className="text-secondary-foreground">Allocation</span>
                                            <span><span className="line-through text-secondary-foreground">{position.lpPercent}/{position.hedgePercent}</span> &rarr; <span className="font-bold">{lpPercent}/{hedgePercent}</span></span>
                                        </div>
                                    )}
                                    {autoCompound !== position.autoCompound && (
                                        <div className="flex justify-between">
                                            <span className="text-secondary-foreground">Auto-compound</span>
                                            <span className={autoCompound ? "text-success font-bold" : "text-secondary-foreground"}>{autoCompound ? "On" : "Off"}</span>
                                        </div>
                                    )}
                                    {autoStopLoss !== position.autoStopLoss && (
                                        <div className="flex justify-between">
                                            <span className="text-secondary-foreground">Auto stop-loss</span>
                                            <span className={autoStopLoss ? "text-success font-bold" : "text-secondary-foreground"}>{autoStopLoss ? "On" : "Off"}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-card border-t p-6">
                            <button
                                onClick={handleConfirm}
                                disabled={!hasChanges}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                Confirm Rebalance
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </>
    );
}

// ==================== Close Confirmation Modal ====================

interface CloseModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: VaultPosition | null;
    onConfirm: (id: string) => void;
}

type CloseStep = "confirm" | "signing" | "success";

export function ClosePositionModal({ isOpen, onClose, position, onConfirm }: CloseModalProps) {
    const [step, setStep] = useState<CloseStep>("confirm");

    // Reset when position changes
    const posId = position?.id;
    const [lastPosId, setLastPosId] = useState(posId);
    if (posId !== lastPosId) {
        setLastPosId(posId);
        setStep("confirm");
    }

    const handleConfirm = async () => {
        if (!position) return;
        setStep("signing");
        await new Promise(r => setTimeout(r, 1800));
        onConfirm(position.id);
        setStep("success");
    };

    const handleClose = () => {
        setStep("confirm");
        onClose();
    };

    if (!isOpen || !position) return null;

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[440px] bg-card border rounded-3xl z-[101] shadow-2xl"
            >
                {/* Signing */}
                {step === "signing" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6 animate-pulse">
                            <Loader2 className="w-8 h-8 text-destructive animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Closing Position</h3>
                        <p className="text-secondary-foreground text-sm">Withdrawing funds and closing hedge. Please confirm in your wallet...</p>
                    </div>
                )}

                {/* Success */}
                {step === "success" && (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
                            <Check className="w-8 h-8 text-success" />
                        </motion.div>
                        <h3 className="text-xl font-bold mb-2">Position Closed</h3>
                        <p className="text-secondary-foreground text-sm mb-2">
                            Your {position.pool} position has been fully closed.
                        </p>
                        <div className="w-full p-4 rounded-xl bg-secondary/10 space-y-2 text-sm my-4">
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Deposited</span>
                                <span className="font-mono">${position.deposited.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary-foreground">Returned</span>
                                <span className="font-mono font-bold">${position.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-secondary-foreground">Realized P&L</span>
                                <span className={`font-mono font-bold ${position.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                    {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <button onClick={handleClose} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                            Done
                        </button>
                    </div>
                )}

                {/* Confirmation */}
                {step === "confirm" && (
                    <div className="p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-warning" />
                                Close Position
                            </h3>
                            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Position Details */}
                        <div className="p-4 rounded-2xl bg-secondary/10 mb-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex -space-x-2">
                                    <img src={position.icon1} alt="" className="w-9 h-9 rounded-full border-2 border-card z-10" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = position.color1; }} />
                                    <img src={position.icon2} alt="" className="w-9 h-9 rounded-full border-2 border-card" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = position.color2; }} />
                                </div>
                                <div>
                                    <div className="font-bold">{position.pool}</div>
                                    <div className="text-xs text-secondary-foreground">{position.protocol} &bull; {position.chain}</div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Current Value</span>
                                    <span className="font-mono font-bold">${position.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Deposited</span>
                                    <span className="font-mono">${position.deposited.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Unrealized P&L</span>
                                    <span className={`font-mono font-bold ${position.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                        {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)} ({position.pnlPercent.toFixed(2)}%)
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Allocation</span>
                                    <span className="font-mono">{position.lpPercent}% LP / {position.hedgePercent}% Hedge</span>
                                </div>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="p-3 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-2 mb-6">
                            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <div className="text-xs text-warning">
                                <strong>This will:</strong>
                                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                                    <li>Remove your LP position from the pool</li>
                                    <li>Close your hedge (short) position</li>
                                    <li>Return all funds to your wallet as USDC</li>
                                </ul>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button onClick={handleClose} className="flex-1 py-3 rounded-xl border font-bold hover:bg-secondary/50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold hover:opacity-90 transition-opacity">
                                Close Position
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </>
    );
}
