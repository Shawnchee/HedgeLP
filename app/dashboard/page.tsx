"use client";

import { Header } from "@/components/header";
import { TradePreviewModal, TradeSettings } from "@/components/trade-preview-modal";
import { ManagePositionModal, ClosePositionModal } from "@/components/position-modals";
import { WalletButton } from "@/components/wallet-button";
import {
    ArrowUpRight,
    ArrowDownRight,
    Shield,
    Zap,
    Activity,
    ChevronRight,
    Droplets,
    RefreshCw,
    Calculator,
    Wallet,
    ShieldCheck,
    Clock,
    TrendingDown,
    ExternalLink,
    Wifi,
} from "lucide-react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { useMockDeposit, useMockWithdraw } from "@/hooks/use-mock-transaction";
import { usePositions, type VaultPosition } from "@/hooks/use-positions";
import { useTokenPrices } from "@/hooks/use-market-data";
import { computePositionPnL } from "@/hooks/use-position-pnl";

// =============================================================
// Generate deterministic 30-day portfolio chart data from positions
// Uses a seeded pseudo-random so chart is stable across renders
// =============================================================
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function generatePortfolioChart(positions: VaultPosition[]) {
    if (positions.length === 0) return [];

    const totalDeposited = positions.reduce((a, p) => a + p.deposited, 0);
    const totalCurrent = positions.reduce((a, p) => a + p.currentValue, 0);
    const totalPnl = totalCurrent - totalDeposited;

    // Weighted daily return rate from positions
    const weightedDailyRate = positions.reduce((acc, p) => {
        const weight = p.currentValue / totalCurrent;
        const dailyRate = p.apy / 100 / 365;
        return acc + dailyRate * weight;
    }, 0);

    const days = 30;
    const data = [];
    const rand = seededRandom(42); // deterministic seed

    // Walk backwards from current value
    let val = totalCurrent;
    const values: number[] = [val];

    for (let d = 1; d <= days; d++) {
        // Undo daily gains + small noise for realism
        const dailyGain = val * weightedDailyRate;
        const noise = (rand() - 0.5) * totalCurrent * 0.004;
        val = val - dailyGain + noise;
        values.unshift(Math.max(val, totalDeposited * 0.94));
    }

    // Build chart points
    for (let i = 0; i <= days; i++) {
        let label: string;
        if (i === 0) label = "30d ago";
        else if (i === days) label = "Now";
        else if (i % 5 === 0) label = `${days - i}d`;
        else label = "";

        data.push({
            day: label,
            value: Math.round(values[i] * 100) / 100,
        });
    }

    return data;
}

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });

    const { positions: portfolio, loaded, updatePosition, removePosition } = usePositions();

    // Live ETH price for real-time PnL
    const { data: tokenPrices } = useTokenPrices();
    const ethPrice = useMemo(() => {
        if (!tokenPrices) return 0;
        const eth = tokenPrices.find((t) => t.id === "ethereum");
        return eth?.current_price ?? 0;
    }, [tokenPrices]);

    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [inputAmount, setInputAmount] = useState("");
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Manage & Close modal state
    const [managingPosition, setManagingPosition] = useState<VaultPosition | null>(null);
    const [closingPosition, setClosingPosition] = useState<VaultPosition | null>(null);

    const mockDeposit = useMockDeposit({ onSuccess: () => { setShowPreviewModal(false); setInputAmount(""); } });
    const mockWithdraw = useMockWithdraw({ onSuccess: () => { setShowPreviewModal(false); setInputAmount(""); } });

    const totalValue = useMemo(() => portfolio.reduce((acc, p) => acc + p.currentValue, 0), [portfolio]);
    const totalPnl = useMemo(() => portfolio.reduce((acc, p) => acc + p.pnl, 0), [portfolio]);
    const totalDeposited = useMemo(() => portfolio.reduce((acc, p) => acc + p.deposited, 0), [portfolio]);
    const avgApy = useMemo(() => {
        if (totalValue === 0) return 0;
        return portfolio.reduce((acc, p) => acc + p.apy * p.currentValue, 0) / totalValue;
    }, [portfolio, totalValue]);

    // Deterministic chart from positions
    const chartData = useMemo(() => generatePortfolioChart(portfolio), [portfolio]);

    // Recent activity derived from positions
    const recentActivity = useMemo(() => {
        const items: { type: string; amount: string; pool: string; time: string; color: string }[] = [];
        for (const pos of portfolio) {
            items.push({ type: "Deposit", amount: `$${pos.deposited.toLocaleString()}`, pool: pos.pool, time: pos.openedAt, color: "text-success" });
        }
        if (portfolio.length > 0) {
            items.push({ type: "Compound", amount: "+$42.18", pool: portfolio[0].pool, time: "1 day ago", color: "text-primary" });
        }
        if (portfolio.length > 1) {
            items.push({ type: "Rebalance", amount: "Auto", pool: portfolio[1].pool, time: "2 days ago", color: "text-warning" });
        }
        return items.slice(0, 6);
    }, [portfolio]);

    const parsedAmount = parseFloat(inputAmount) || 0;

    const handleOpenPreview = () => {
        if (parsedAmount > 0) setShowPreviewModal(true);
    };

    const handleConfirmTrade = async (settings: TradeSettings) => {
        setIsProcessing(true);
        try {
            if (activeTab === "deposit") {
                await mockDeposit.deposit(inputAmount);
            } else {
                await mockWithdraw.withdraw(inputAmount);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManageSave = useCallback((id: string, updates: { lpPercent: number; hedgePercent: number; autoCompound: boolean; autoStopLoss: boolean }) => {
        // Find the position being rebalanced
        const pos = portfolio.find(p => p.id === id);

        // For real on-chain positions, recalculate underlying ETH/USDC amounts
        // based on the new allocation. This simulates closing old positions and
        // reopening at current price with the new LP/Hedge split.
        if (pos?.isReal && ethPrice > 0) {
            const pnlData = computePositionPnL(pos, ethPrice);
            const totalValue = pnlData.totalValueNow;

            const newLpPercent = updates.lpPercent;
            const newHedgePercent = updates.hedgePercent;

            // New LP value: ~50% WETH + ~50% USDC (standard Uniswap LP split)
            const newLpValue = totalValue * newLpPercent / 100;
            const newLpWethKept = (newLpValue / 2) / ethPrice;
            const newLpUsdcReceived = newLpValue / 2;

            // New hedge: sell ETH for USDC at current price (1x short)
            const newHedgeValue = totalValue * newHedgePercent / 100;
            const newHedgeEthAmount = newHedgeValue / ethPrice;
            const newHedgeUsdc = newHedgeValue;

            // New delta-neutral tracking
            const newHedgeCoverage = newLpWethKept > 0
                ? (newHedgeEthAmount / newLpWethKept) * 100
                : newHedgeEthAmount > 0 ? 100 : 0;

            updatePosition(id, {
                ...updates,
                // Reset entry price to current (rebalance = new trade at current price)
                ethPriceAtDeposit: ethPrice,
                // Recalculated LP data
                lpWethKept: newLpWethKept.toFixed(18),
                lpUsdcReceived: newLpUsdcReceived.toFixed(2),
                lpEthExposure: newLpWethKept.toFixed(18),
                lpValueUsd: newLpValue,
                lpEthAmount: ((newLpWethKept * 2)).toFixed(18), // total LP ETH (both sides)
                // Recalculated hedge data
                hedgeEthAmount: newHedgeEthAmount.toFixed(18),
                hedgeUsdcReceived: newHedgeUsdc.toFixed(2),
                hedgeValueUsd: newHedgeValue,
                shortSizeEth: newHedgeEthAmount.toFixed(18),
                // Updated totals
                totalUsdcReceived: (newLpUsdcReceived + newHedgeUsdc).toFixed(2),
                hedgeCoverage: newHedgeCoverage,
                currentValue: totalValue,
            });
        } else {
            updatePosition(id, updates);
        }
    }, [updatePosition, portfolio, ethPrice]);

    const handleCloseConfirm = useCallback((id: string) => {
        removePosition(id);
    }, [removePosition]);

    // Not connected
    if (!isConnected) {
        return (
            <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-primary/30">
                <Header />
                <div className="max-w-2xl mx-auto p-6 pt-24 text-center">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-12 rounded-3xl bg-card border shadow-xl">
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                        <p className="text-secondary-foreground mb-8 max-w-md mx-auto">
                            Connect your wallet to view your HedgeLP positions, deposit funds, and start earning yield with automated hedging.
                        </p>
                        <WalletButton />
                    </motion.div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-primary/30">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Connected Badge */}
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="font-medium text-success">Connected</span>
                        </div>
                        <span className="font-mono text-secondary-foreground">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        {balance && <span className="text-secondary-foreground">&bull; {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}</span>}
                    </motion.div>

                    {/* Portfolio Stats */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-card border">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Portfolio Value</span>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><Activity className="w-4 h-4 text-primary" /></div>
                            </div>
                            <h3 className="text-3xl font-mono font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                            {totalDeposited > 0 ? (
                                <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                                    {totalPnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} ({((totalPnl / totalDeposited) * 100).toFixed(2)}%)
                                </div>
                            ) : (
                                <div className="text-secondary-foreground text-sm mt-1">No active positions</div>
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-2xl bg-card border">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Open Positions</span>
                                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center"><Shield className="w-4 h-4 text-success" /></div>
                            </div>
                            <h3 className="text-3xl font-mono font-bold">{portfolio.length}</h3>
                            <div className="text-secondary-foreground text-sm font-medium mt-1 flex items-center gap-2">
                                <span className="text-primary">Active</span>&bull;<span>{portfolio.filter(p => p.autoCompound).length} auto-compounding</span>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl bg-card border">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Weighted APY</span>
                                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center"><Zap className="w-4 h-4 text-warning" /></div>
                            </div>
                            <h3 className="text-3xl font-mono font-bold">{avgApy.toFixed(1)}%</h3>
                            <div className="text-secondary-foreground text-sm font-medium mt-1">Net of Funding Costs</div>
                        </motion.div>
                    </section>

                    {/* Portfolio Performance Chart */}
                    {chartData.length > 0 && (
                        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border bg-card overflow-hidden">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h2 className="font-bold">Portfolio Performance (30D)</h2>
                                <div className="flex items-center gap-4 text-xs text-secondary-foreground">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> Value</div>
                                    <div className="font-mono">
                                        {totalPnl >= 0 ? "+" : ""}{((totalPnl / Math.max(totalDeposited, 1)) * 100).toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                        <YAxis domain={["dataMin - 200", "dataMax + 200"]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                                        <Tooltip
                                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                                            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, "Value"]}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#portfolioGrad)" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.section>
                    )}

                    {/* Active Positions */}
                    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl border bg-card overflow-hidden">
                        <div className="p-4 border-b bg-card/50 flex items-center justify-between">
                            <h2 className="font-bold">Active Positions</h2>
                            {portfolio.length > 0 ? (
                                <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">{portfolio.length} LIVE</span>
                            ) : (
                                <span className="text-[10px] font-bold text-secondary-foreground bg-secondary/30 px-2 py-0.5 rounded-full">EMPTY</span>
                            )}
                        </div>

                        {portfolio.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center mx-auto mb-4">
                                    <Wallet className="w-8 h-8 text-secondary-foreground" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">No Active Positions</h3>
                                <p className="text-secondary-foreground text-sm mb-4 max-w-sm mx-auto">Browse pools and open a HedgeLP position to start earning yield.</p>
                                <Link href="/pools" className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">
                                    <Droplets className="w-4 h-4" /> Browse Pools
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {portfolio.map((pos, i) => {
                                    // Compute real-time PnL for on-chain positions
                                    const pnl = pos.isReal ? computePositionPnL(pos, ethPrice) : null;

                                    return (
                                    <motion.div
                                        key={pos.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + i * 0.08 }}
                                        className="p-4 hover:bg-secondary/10 transition-colors"
                                    >
                                        {/* Row 1 */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    <img src={pos.icon1} alt="" className="w-9 h-9 rounded-full border-2 border-card z-10" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = pos.color1; }} />
                                                    <img src={pos.icon2} alt="" className="w-9 h-9 rounded-full border-2 border-card" onError={(e) => { (e.target as HTMLElement).style.backgroundColor = pos.color2; }} />
                                                </div>
                                                <div>
                                                    <div className="font-bold flex items-center gap-2">
                                                        {pos.pool}
                                                        {pos.isReal && (
                                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 border border-success/30">
                                                                <Wifi className="w-2.5 h-2.5 text-success" />
                                                                <span className="text-[9px] font-bold text-success">LIVE</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-bold">{pos.protocol}</span>
                                                        <span className="text-[10px] text-secondary-foreground">{pos.chain}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {pnl?.isReal ? (
                                                    <>
                                                        <div className="font-mono font-bold">${pnl.totalValueNow.toFixed(2)}</div>
                                                        <div className={`text-xs font-mono font-bold ${pnl.netPnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pnl.netPnl >= 0 ? "+" : ""}{pnl.netPnlPercent.toFixed(2)}%
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="font-mono font-bold">${pos.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                        <div className={`text-xs font-mono font-bold ${pos.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pos.pnl >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(2)}%
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Details — enhanced for real positions */}
                                        {pnl?.isReal ? (
                                            <div className="mt-3 space-y-2">
                                                {/* LP + Short PnL row */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                                                        <div className="text-[9px] text-primary uppercase font-bold tracking-wider">LP P&L</div>
                                                        <div className={`text-xs font-mono font-bold mt-0.5 ${pnl.lpPnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pnl.lpPnl >= 0 ? "+" : ""}${pnl.lpPnl.toFixed(2)}
                                                        </div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">{pnl.lpEthExposure.toFixed(4)} ETH</div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">${pnl.lpValueNow.toFixed(2)}</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-success/5 border border-success/10">
                                                        <div className="text-[9px] text-success uppercase font-bold tracking-wider flex items-center gap-1">
                                                            <TrendingDown className="w-3 h-3" /> 1x Short P&L
                                                        </div>
                                                        <div className={`text-xs font-mono font-bold mt-0.5 ${pnl.shortPnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pnl.shortPnl >= 0 ? "+" : ""}${pnl.shortPnl.toFixed(2)}
                                                        </div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">{pnl.shortSizeEth.toFixed(4)} ETH short</div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">${pnl.hedgeValueNow.toFixed(2)} USDC</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-secondary/10">
                                                        <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Net P&L</div>
                                                        <div className={`text-xs font-mono font-bold mt-0.5 ${pnl.netPnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pnl.netPnl >= 0 ? "+" : ""}${pnl.netPnl.toFixed(2)}
                                                        </div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">
                                                            {pnl.netPnlPercent >= 0 ? "+" : ""}{pnl.netPnlPercent.toFixed(3)}%
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* ETH price + allocation + funding row */}
                                                <div className="grid grid-cols-5 gap-2">
                                                    <div className="p-2 rounded-lg bg-secondary/10">
                                                        <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">ETH Now</div>
                                                        <div className="text-xs font-mono font-bold mt-0.5">${pnl.currentPrice.toFixed(0)}</div>
                                                        <div className={`text-[9px] font-mono ${pnl.ethPriceChangePercent >= 0 ? "text-success" : "text-destructive"}`}>
                                                            {pnl.ethPriceChangePercent >= 0 ? "+" : ""}{pnl.ethPriceChangePercent.toFixed(2)}%
                                                        </div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-secondary/10">
                                                        <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Entry</div>
                                                        <div className="text-xs font-mono font-bold mt-0.5">${pnl.entryPrice.toFixed(0)}</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-secondary/10">
                                                        <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Alloc</div>
                                                        <div className="text-xs font-mono font-bold mt-0.5">
                                                            <span className="text-primary">{pos.lpPercent}%</span><span className="text-secondary-foreground mx-0.5">/</span><span className="text-success">{pos.hedgePercent}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-secondary/10">
                                                        <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Coverage</div>
                                                        <div className="text-xs font-mono font-bold text-success mt-0.5">{(pos.hedgeCoverage ?? 0).toFixed(0)}%</div>
                                                    </div>
                                                    <div className="p-2 rounded-lg bg-warning/5 border border-warning/10">
                                                        <div className="text-[9px] text-warning uppercase font-bold tracking-wider">Funding/8h</div>
                                                        <div className="text-xs font-mono font-bold mt-0.5 text-success">
                                                            {pnl.fundingRate8h === 0 ? "0.00%" : `${pnl.fundingRate8h.toFixed(3)}%`}
                                                        </div>
                                                        <div className="text-[9px] text-secondary-foreground font-mono">
                                                            {pnl.fundingRate8h === 0 ? "Spot hedge" : `-$${pnl.accumulatedFundingCost.toFixed(2)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Tx proof link for short position */}
                                                {pos.txHash && (
                                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-3.5 h-3.5 text-primary" />
                                                            <div>
                                                                <div className="text-[9px] text-primary uppercase font-bold tracking-wider">On-Chain Proof (Sepolia)</div>
                                                                <div className="text-[9px] text-secondary-foreground font-mono">
                                                                    LP swap + 1x Short swap in single tx
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={`https://sepolia.etherscan.io/tx/${pos.txHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            View on Etherscan
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="p-2 rounded-lg bg-secondary/10">
                                                    <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Allocation</div>
                                                    <div className="text-xs font-mono font-bold mt-0.5">
                                                        <span className="text-primary">{pos.lpPercent}%</span><span className="text-secondary-foreground mx-1">/</span><span className="text-success">{pos.hedgePercent}%</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 rounded-lg bg-secondary/10">
                                                    <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">APY</div>
                                                    <div className="text-xs font-mono font-bold text-success mt-0.5">{pos.apy.toFixed(1)}%</div>
                                                </div>
                                                <div className="p-2 rounded-lg bg-secondary/10">
                                                    <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">P&L</div>
                                                    <div className={`text-xs font-mono font-bold mt-0.5 ${pos.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                                        {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="p-2 rounded-lg bg-secondary/10">
                                                    <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider">Features</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {pos.autoCompound && <span className="text-[9px] font-bold text-primary flex items-center gap-0.5"><RefreshCw className="w-3 h-3" /> Compound</span>}
                                                        {pos.autoStopLoss && <span className="text-[9px] font-bold text-success flex items-center gap-0.5"><Shield className="w-3 h-3" /> Stop</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Footer */}
                                        <div className="mt-3 flex items-center justify-between text-xs text-secondary-foreground">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Opened {pos.openedAt}
                                                {pos.isReal && pos.txHash && (
                                                    <a href={`https://sepolia.etherscan.io/tx/${pos.txHash}`} target="_blank" rel="noopener noreferrer"
                                                        className="ml-2 flex items-center gap-1 text-primary hover:underline">
                                                        <ExternalLink className="w-3 h-3" /> Tx
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setManagingPosition(pos)}
                                                    className="px-3 py-1 rounded-lg font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                                                >
                                                    Manage
                                                </button>
                                                <button
                                                    onClick={() => setClosingPosition(pos)}
                                                    className="px-3 py-1 rounded-lg font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.section>

                    {/* Quick Links */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/pools" className="flex-1 p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all group flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Droplets className="w-5 h-5 text-primary" /></div>
                            <div>
                                <div className="font-bold group-hover:text-primary transition-colors">Browse Pools</div>
                                <div className="text-xs text-secondary-foreground">Open new HedgeLP positions</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-secondary-foreground ml-auto" />
                        </Link>
                        <Link href="/calculator" className="flex-1 p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all group flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center"><Calculator className="w-5 h-5 text-warning" /></div>
                            <div>
                                <div className="font-bold group-hover:text-primary transition-colors">ROI Calculator</div>
                                <div className="text-xs text-secondary-foreground">Simulate returns & scenarios</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-secondary-foreground ml-auto" />
                        </Link>
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Deposit / Withdraw */}
                    <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border bg-card overflow-hidden flex flex-col shadow-xl shadow-primary/5">
                        <div className="flex bg-secondary/30 p-1 m-4 rounded-xl">
                            <button onClick={() => setActiveTab("deposit")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "deposit" ? "bg-card shadow-sm text-foreground" : "text-secondary-foreground hover:text-foreground"}`}>Deposit</button>
                            <button onClick={() => setActiveTab("withdraw")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "withdraw" ? "bg-card shadow-sm text-foreground" : "text-secondary-foreground hover:text-foreground"}`}>Withdraw</button>
                        </div>
                        <div className="px-6 pb-6 space-y-4">
                            <div className="p-4 rounded-xl border bg-background/50 focus-within:border-primary transition-colors">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold text-secondary-foreground tracking-widest uppercase">You {activeTab === "deposit" ? "pay" : "redeem"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <input type="number" placeholder="0.0" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} className="bg-transparent border-none outline-none text-2xl font-mono p-0 w-full" />
                                    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-secondary transition-colors">
                                        <span className="font-bold text-sm uppercase">{activeTab === "deposit" ? "USDC" : "Shares"}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    {["1000", "5000", "10000"].map(val => (
                                        <button key={val} onClick={() => setInputAmount(val)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${inputAmount === val ? "bg-primary/10 text-primary" : "bg-secondary/30 hover:bg-secondary/50"}`}>
                                            ${Number(val).toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleOpenPreview} disabled={parsedAmount <= 0} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {activeTab === "deposit" ? "Preview Deposit" : "Preview Withdraw"}<ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.section>

                    {/* Vault Strategy */}
                    <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                        <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Vault Strategy</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-secondary-foreground">Strategy</span><span className="font-bold">Delta-Neutral LP</span></div>
                            <div className="flex justify-between"><span className="text-secondary-foreground">LP Protocol</span><span className="font-bold">Uniswap V4 Hook</span></div>
                            <div className="flex justify-between"><span className="text-secondary-foreground">Hedge Protocol</span><span className="font-bold">GMX V2 Perp</span></div>
                            <div className="flex justify-between"><span className="text-secondary-foreground">Rebalance</span><span className="font-bold">Auto (on swap)</span></div>
                        </div>
                    </motion.section>

                    {/* Recent Activity */}
                    <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl border bg-card overflow-hidden">
                        <div className="p-4 border-b"><h3 className="font-bold">Recent Activity</h3></div>
                        {recentActivity.length === 0 ? (
                            <div className="p-6 text-center text-secondary-foreground text-sm">No recent activity</div>
                        ) : (
                            <div className="divide-y">
                                {recentActivity.map((tx, i) => (
                                    <div key={i} className="p-3 flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${tx.color.replace("text-", "bg-")}`} />
                                            <div><span className="font-bold">{tx.type}</span><span className="text-secondary-foreground ml-1.5 text-xs">{tx.pool}</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold text-xs ${tx.color}`}>{tx.amount}</div>
                                            <div className="text-[10px] text-secondary-foreground">{tx.time}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                </div>
            </div>

            {/* Trade Preview Modal */}
            <TradePreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                type={activeTab}
                amount={parsedAmount}
                onConfirm={handleConfirmTrade}
                currentPrice={3000}
                estimatedShares={parsedAmount * 0.99}
                isLoading={isProcessing}
            />

            {/* Manage Position Modal */}
            <AnimatePresence>
                <ManagePositionModal
                    isOpen={!!managingPosition}
                    onClose={() => setManagingPosition(null)}
                    position={managingPosition}
                    onSave={handleManageSave}
                    ethPrice={ethPrice}
                />
            </AnimatePresence>

            {/* Close Confirmation Modal */}
            <AnimatePresence>
                <ClosePositionModal
                    isOpen={!!closingPosition}
                    onClose={() => setClosingPosition(null)}
                    position={closingPosition}
                    onConfirm={handleCloseConfirm}
                />
            </AnimatePresence>
        </main>
    );
}
