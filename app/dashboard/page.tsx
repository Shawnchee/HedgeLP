"use client";

import { Header } from "@/components/header";
import { TradePreviewModal, TradeSettings } from "@/components/trade-preview-modal";
import { WalletButton } from "@/components/wallet-button";
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Shield,
    Zap,
    Activity,
    ChevronRight,
    Info,
    Droplets,
    RefreshCw,
    Calculator,
    Wallet,
    ShieldCheck
} from "lucide-react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAccount, useBalance } from "wagmi";
import { useMockDeposit, useMockWithdraw } from "@/hooks/use-mock-transaction";

// Position type
interface UserPosition {
    hasPosition: boolean;
    depositedAmount: number;
    totalValue: number;
    shares: number;
    allocation: { lp: number; hedge: number };
    estimatedAPR: number;
    pnl: { value: number; percentage: number };
    lpPosition: {
        pool: string;
        protocol: string;
        fee: string;
        value: number;
        allocation: number;
        pnl: { value: number; percentage: number };
    };
    hedgePosition: {
        type: string;
        protocol: string;
        value: number;
        pnl: { value: number; percentage: number };
    };
    depositTime: number;
}

// Generate mock performance data based on position
function generatePerformanceData(depositedAmount: number, currentValue: number) {
    const steps = 7;
    const data = [];
    const pnl = currentValue - depositedAmount;
    
    for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        // Add some variance to make it look realistic
        const variance = (Math.random() - 0.5) * 0.02 * depositedAmount;
        const value = depositedAmount + (pnl * progress) + variance;
        data.push({
            time: `${String(Math.floor(i * 24 / steps)).padStart(2, '0')}:00`,
            value: Math.round(value * 100) / 100,
        });
    }
    return data;
}

// Create a new position after deposit
function createNewPosition(depositAmount: number): UserPosition {
    const lpAllocation = 0.8;
    const hedgeAllocation = 0.2;
    
    // Small initial PnL (slight loss due to fees, or neutral)
    const initialPnlPercent = -0.05 + Math.random() * 0.1; // -0.05% to +0.05%
    const totalPnl = depositAmount * (initialPnlPercent / 100);
    const totalValue = depositAmount + totalPnl;
    
    const lpValue = totalValue * lpAllocation;
    const hedgeValue = totalValue * hedgeAllocation;
    
    // Individual position PnLs
    const lpPnlPercent = -0.02 + Math.random() * 0.04; // Slight variance
    const hedgePnlPercent = -0.08 + Math.random() * 0.1; // Hedge can have more variance
    
    return {
        hasPosition: true,
        depositedAmount: depositAmount,
        totalValue,
        shares: Math.floor(depositAmount / 10), // 1 share = $10
        allocation: { lp: 80, hedge: 20 },
        estimatedAPR: 18.4,
        pnl: { 
            value: totalPnl, 
            percentage: initialPnlPercent 
        },
        lpPosition: {
            pool: "ETH / USDC",
            protocol: "Uniswap v4",
            fee: "0.3%",
            value: lpValue,
            allocation: 80,
            pnl: {
                value: lpValue * (lpPnlPercent / 100),
                percentage: lpPnlPercent,
            }
        },
        hedgePosition: {
            type: "ETH Short (1x)",
            protocol: "GMX v2 Perpetual",
            value: hedgeValue,
            pnl: {
                value: hedgeValue * (hedgePnlPercent / 100),
                percentage: hedgePnlPercent,
            }
        },
        depositTime: Date.now(),
    };
}

// Update position with time-based PnL simulation
function updatePositionPnL(position: UserPosition): UserPosition {
    const elapsed = Date.now() - position.depositTime;
    const hours = elapsed / (1000 * 60 * 60);
    
    // Simulate PnL growth over time (small daily variance)
    const dailyRate = position.estimatedAPR / 365 / 100;
    const expectedReturn = position.depositedAmount * dailyRate * (hours / 24);
    const variance = (Math.random() - 0.5) * expectedReturn * 0.5;
    
    const totalPnl = expectedReturn + variance;
    const totalValue = position.depositedAmount + totalPnl;
    const pnlPercent = (totalPnl / position.depositedAmount) * 100;
    
    const lpValue = totalValue * 0.8;
    const hedgeValue = totalValue * 0.2;
    
    // LP position tends to gain from fees
    const lpPnlPercent = pnlPercent * 1.1 + (Math.random() - 0.5) * 0.1;
    // Hedge position has funding costs but provides protection
    const hedgePnlPercent = pnlPercent * 0.6 + (Math.random() - 0.5) * 0.2;
    
    return {
        ...position,
        totalValue,
        pnl: { value: totalPnl, percentage: pnlPercent },
        lpPosition: {
            ...position.lpPosition,
            value: lpValue,
            pnl: {
                value: lpValue * (lpPnlPercent / 100),
                percentage: lpPnlPercent,
            }
        },
        hedgePosition: {
            ...position.hedgePosition,
            value: hedgeValue,
            pnl: {
                value: hedgeValue * (hedgePnlPercent / 100),
                percentage: hedgePnlPercent,
            }
        },
    };
}

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const { data: balance } = useBalance({ address });
    
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [inputAmount, setInputAmount] = useState("");
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Track user position (persisted in localStorage for demo)
    const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
    
    // Load position from localStorage on mount
    useEffect(() => {
        if (isConnected && address) {
            const stored = localStorage.getItem(`hedgelp-position-${address}`);
            if (stored) {
                const position = JSON.parse(stored);
                // Update PnL based on time elapsed
                setUserPosition(updatePositionPnL(position));
            }
        }
    }, [isConnected, address]);
    
    // Update PnL periodically (every 30 seconds)
    useEffect(() => {
        if (!userPosition) return;
        
        const interval = setInterval(() => {
            setUserPosition(prev => prev ? updatePositionPnL(prev) : null);
        }, 30000);
        
        return () => clearInterval(interval);
    }, [userPosition?.depositTime]);

    // Mock transaction hooks with real wallet signing
    const depositTx = useMockDeposit({
        onSuccess: () => {
            const amount = parseFloat(inputAmount);
            // Create or update position
            const newPosition = userPosition 
                ? {
                    ...userPosition,
                    depositedAmount: userPosition.depositedAmount + amount,
                    totalValue: userPosition.totalValue + amount,
                    shares: userPosition.shares + Math.floor(amount / 10),
                    lpPosition: {
                        ...userPosition.lpPosition,
                        value: userPosition.lpPosition.value + (amount * 0.8),
                    },
                    hedgePosition: {
                        ...userPosition.hedgePosition,
                        value: userPosition.hedgePosition.value + (amount * 0.2),
                    }
                }
                : createNewPosition(amount);
            
            setUserPosition(newPosition);
            // Persist to localStorage
            if (address) {
                localStorage.setItem(`hedgelp-position-${address}`, JSON.stringify(newPosition));
            }
            setShowPreviewModal(false);
            setInputAmount("");
        }
    });
    
    const withdrawTx = useMockWithdraw({
        onSuccess: () => {
            const amount = parseFloat(inputAmount);
            if (userPosition) {
                const remainingRatio = Math.max(0, (userPosition.totalValue - amount) / userPosition.totalValue);
                
                if (remainingRatio <= 0.01) {
                    // Full withdrawal
                    setUserPosition(null);
                    if (address) {
                        localStorage.removeItem(`hedgelp-position-${address}`);
                    }
                } else {
                    // Partial withdrawal
                    const updated = {
                        ...userPosition,
                        depositedAmount: userPosition.depositedAmount * remainingRatio,
                        totalValue: userPosition.totalValue - amount,
                        shares: Math.floor(userPosition.shares * remainingRatio),
                        lpPosition: {
                            ...userPosition.lpPosition,
                            value: userPosition.lpPosition.value * remainingRatio,
                            pnl: {
                                ...userPosition.lpPosition.pnl,
                                value: userPosition.lpPosition.pnl.value * remainingRatio,
                            }
                        },
                        hedgePosition: {
                            ...userPosition.hedgePosition,
                            value: userPosition.hedgePosition.value * remainingRatio,
                            pnl: {
                                ...userPosition.hedgePosition.pnl,
                                value: userPosition.hedgePosition.pnl.value * remainingRatio,
                            }
                        },
                        pnl: {
                            ...userPosition.pnl,
                            value: userPosition.pnl.value * remainingRatio,
                        }
                    };
                    setUserPosition(updated);
                    if (address) {
                        localStorage.setItem(`hedgelp-position-${address}`, JSON.stringify(updated));
                    }
                }
            }
            setShowPreviewModal(false);
            setInputAmount("");
        }
    });
    
    const isProcessing = depositTx.isLoading || withdrawTx.isLoading;

    const parsedAmount = parseFloat(inputAmount) || 0;
    
    // Generate performance chart data
    const performanceData = useMemo(() => {
        if (!userPosition) return [];
        return generatePerformanceData(userPosition.depositedAmount, userPosition.totalValue);
    }, [userPosition?.depositedAmount, userPosition?.totalValue]);

    const handleOpenPreview = () => {
        if (parsedAmount > 0) {
            setShowPreviewModal(true);
        }
    };

    const handleConfirmTrade = async (settings: TradeSettings) => {
        console.log("Trade settings:", settings);
        
        // Use mock transaction with real wallet signing
        if (activeTab === "deposit") {
            await depositTx.deposit(inputAmount);
        } else {
            await withdrawTx.withdraw(inputAmount);
        }
    };

    // Not connected state - show connect wallet prompt
    if (!isConnected) {
        return (
            <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-primary/30">
                <Header />
                
                <div className="max-w-2xl mx-auto p-6 pt-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-12 rounded-3xl bg-card border shadow-xl"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                            <Wallet className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                        <p className="text-secondary-foreground mb-8 max-w-md mx-auto">
                            Connect your wallet to view your HedgeLP position, deposit funds, and start earning yield with automated hedging.
                        </p>
                        <WalletButton />
                        
                        <div className="mt-12 pt-8 border-t">
                            <h3 className="text-lg font-bold mb-6">Why HedgeLP?</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                                <div className="p-4 rounded-xl bg-secondary/20">
                                    <Shield className="w-6 h-6 text-primary mb-2" />
                                    <div className="font-bold text-sm mb-1">Delta Neutral</div>
                                    <div className="text-xs text-secondary-foreground">
                                        80% LP yield + 20% hedge protection
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/20">
                                    <Zap className="w-6 h-6 text-warning mb-2" />
                                    <div className="font-bold text-sm mb-1">Auto-Rebalancing</div>
                                    <div className="text-xs text-secondary-foreground">
                                        Uniswap v4 Hooks manage your position
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/20">
                                    <TrendingUp className="w-6 h-6 text-success mb-2" />
                                    <div className="font-bold text-sm mb-1">~18% APR</div>
                                    <div className="text-xs text-secondary-foreground">
                                        Estimated yield net of funding costs
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-primary/30">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Portfolio Overview & Charts */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Connected Account Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm"
                    >
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="font-medium text-success">Connected</span>
                        </div>
                        <span className="font-mono text-secondary-foreground">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </span>
                        {balance && (
                            <span className="text-secondary-foreground">
                                • {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                            </span>
                        )}
                    </motion.div>

                    {/* Portfolio Stats */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-2xl bg-card border flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Total Value</span>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-primary" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-mono font-bold">
                                    ${(userPosition?.totalValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h3>
                                {userPosition ? (
                                    <div className={`flex items-center gap-1 mt-1 text-sm font-semibold ${
                                        (userPosition.pnl.percentage) >= 0 ? 'text-success' : 'text-destructive'
                                    }`}>
                                        {(userPosition.pnl.percentage) >= 0 ? (
                                            <ArrowUpRight className="w-4 h-4" />
                                        ) : (
                                            <ArrowDownRight className="w-4 h-4" />
                                        )}
                                        {(userPosition.pnl.percentage) >= 0 ? '+' : ''}{userPosition.pnl.percentage.toFixed(2)}%
                                    </div>
                                ) : (
                                    <div className="text-secondary-foreground text-sm font-medium mt-1">
                                        No active position
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="p-6 rounded-2xl bg-card border flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Allocation</span>
                                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-success" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-mono font-bold">
                                    {userPosition ? `${userPosition.allocation.lp}/${userPosition.allocation.hedge}` : "80/20"}
                                </h3>
                                <div className="text-secondary-foreground text-sm font-medium mt-1 flex items-center gap-2">
                                    <span className="text-primary">LP</span>
                                    <span>/</span>
                                    <span className="text-success">Hedge</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="p-6 rounded-2xl bg-card border flex flex-col justify-between"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-secondary-foreground text-sm font-medium">Estimated APR</span>
                                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-warning" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-3xl font-mono font-bold">{userPosition?.estimatedAPR ?? 18.4}%</h3>
                                <div className="text-secondary-foreground text-sm font-medium mt-1">
                                    Net of Funding
                                </div>
                            </div>
                        </motion.div>
                    </section>

                    {/* Performance Chart */}
                    <motion.section
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-card border"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold">Vault Performance</h2>
                                <p className="text-secondary-foreground text-sm">
                                    {userPosition ? "Your position performance over time" : "HedgeLP Strategy vs. ETH/USDC Pure LP"}
                                </p>
                            </div>
                            {userPosition && (
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 rounded-full bg-secondary/50 text-xs font-semibold">1D</button>
                                    <button className="px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground hover:bg-secondary/30 transition-colors">1W</button>
                                    <button className="px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground hover:bg-secondary/30 transition-colors">1M</button>
                                </div>
                            )}
                        </div>

                        <div className="h-64 w-full">
                            {!userPosition ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="w-12 h-12 rounded-xl bg-secondary/30 flex items-center justify-center mx-auto mb-3">
                                            <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                                        </div>
                                        <p className="text-sm text-secondary-foreground">
                                            Deposit to start tracking your performance
                                        </p>
                                    </div>
                                </div>
                            ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={performanceData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF007A" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#FF007A" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" hide />
                                    <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-popover border p-2 rounded-lg shadow-xl outline-none">
                                                        <p className="text-sm font-mono font-bold">${payload[0].value}</p>
                                                        <p className="text-[10px] text-secondary-foreground uppercase font-semibold">{payload[0].payload.time}</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#FF007A"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            )}
                        </div>
                    </motion.section>

                    {/* Active Positions Table */}
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-2xl border bg-card overflow-hidden"
                    >
                        <div className="p-4 border-b bg-card/50 flex items-center justify-between">
                            <h2 className="font-bold">Your Active Positions</h2>
                            <div className="flex items-center gap-2">
                                {userPosition ? (
                                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                        LIVE
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold text-secondary-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
                                        NO POSITION
                                    </span>
                                )}
                                <Info className="w-4 h-4 text-secondary-foreground cursor-pointer" />
                            </div>
                        </div>
                        
                        {/* No Position State */}
                        {!userPosition && (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-secondary/30 flex items-center justify-center mx-auto mb-4">
                                    <Wallet className="w-8 h-8 text-secondary-foreground" />
                                </div>
                                <h3 className="font-bold text-lg mb-2">No Active Position</h3>
                                <p className="text-secondary-foreground text-sm mb-4 max-w-sm mx-auto">
                                    Deposit USDC to start earning yield with automated delta-neutral hedging.
                                </p>
                                <div className="flex flex-wrap justify-center gap-4 text-xs text-secondary-foreground">
                                    <div className="flex items-center gap-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-success" />
                                        <span>~18% APR</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Shield className="w-3.5 h-3.5 text-primary" />
                                        <span>Delta Neutral</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5 text-warning" />
                                        <span>Auto-Rebalance</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Positions List */}
                        {userPosition && (
                        <>
                        <div className="divide-y">
                            {/* LP Position */}
                            <div className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center">
                                            <Droplets className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-card" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{userPosition?.lpPosition.pool}</div>
                                        <div className="text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">
                                            {userPosition?.lpPosition.protocol} • {userPosition?.lpPosition.fee} fee
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono font-bold">
                                        ${userPosition?.lpPosition.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[10px] text-primary font-semibold">
                                            {userPosition?.lpPosition.allocation}% Allocated
                                        </span>
                                        <span className={`text-[10px] font-bold ${
                                            (userPosition?.lpPosition.pnl?.percentage ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                                        }`}>
                                            {(userPosition?.lpPosition.pnl?.percentage ?? 0) >= 0 ? '+' : ''}{(userPosition?.lpPosition.pnl?.percentage ?? 0).toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Hedge Position */}
                            <div className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center border-2 border-card">
                                        <Shield className="w-4 h-4 text-success" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">{userPosition?.hedgePosition.type}</div>
                                        <div className="text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">
                                            {userPosition?.hedgePosition.protocol}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono font-bold">
                                        ${userPosition?.hedgePosition.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className={`text-[10px] font-bold ${
                                            (userPosition?.hedgePosition.pnl?.value ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                                        }`}>
                                            {(userPosition?.hedgePosition.pnl?.value ?? 0) >= 0 ? '+' : ''}${(userPosition?.hedgePosition.pnl?.value ?? 0).toFixed(2)}
                                        </span>
                                        <span className={`text-[10px] font-bold ${
                                            (userPosition?.hedgePosition.pnl?.percentage ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                                        }`}>
                                            ({(userPosition?.hedgePosition.pnl?.percentage ?? 0) >= 0 ? '+' : ''}{(userPosition?.hedgePosition.pnl?.percentage ?? 0).toFixed(2)}%)
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Portfolio PnL Summary */}
                            <div className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-secondary-foreground font-medium mb-1">Portfolio P&L</div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-lg font-mono font-bold ${
                                                (userPosition?.pnl.value ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                                            }`}>
                                                {(userPosition?.pnl.value ?? 0) >= 0 ? '+' : ''}${(userPosition?.pnl.value ?? 0).toFixed(2)}
                                            </span>
                                            <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                                                (userPosition?.pnl.percentage ?? 0) >= 0 
                                                    ? 'text-success bg-success/10' 
                                                    : 'text-destructive bg-destructive/10'
                                            }`}>
                                                {(userPosition?.pnl.percentage ?? 0) >= 0 ? '+' : ''}{(userPosition?.pnl.percentage ?? 0).toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-secondary-foreground font-medium mb-1">Deposited</div>
                                        <div className="text-sm font-mono font-bold">
                                            ${(userPosition?.depositedAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Position Summary Footer */}
                        <div className="p-4 bg-secondary/10 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold">Delta Neutral Strategy Active</span>
                            </div>
                            <div className="text-xs text-secondary-foreground">
                                Last rebalance: 2 hours ago
                            </div>
                        </div>
                        </>
                        )}
                    </motion.section>

                    {/* Strategy Settings Card */}
                    <motion.section
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="p-4 rounded-2xl border bg-card flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div className="font-bold text-sm">Auto-compound enabled</div>
                                <div className="text-xs text-secondary-foreground">Reinvesting fees weekly • +4.5% boost</div>
                            </div>
                        </div>
                        <Link
                            href="/calculator"
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm font-bold"
                        >
                            <Calculator className="w-4 h-4" />
                            Calculator
                        </Link>
                    </motion.section>
                </div>

                {/* Right Column: Interaction & Strategy Details */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Action Card */}
                    <motion.section
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl border bg-card overflow-hidden flex flex-col shadow-xl shadow-primary/5"
                    >
                        <div className="flex bg-secondary/30 p-1 m-4 rounded-xl">
                            <button
                                onClick={() => setActiveTab("deposit")}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "deposit" ? "bg-card shadow-sm text-foreground" : "text-secondary-foreground hover:text-foreground"}`}
                            >
                                Deposit
                            </button>
                            <button
                                onClick={() => setActiveTab("withdraw")}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "withdraw" ? "bg-card shadow-sm text-foreground" : "text-secondary-foreground hover:text-foreground"}`}
                            >
                                Withdraw
                            </button>
                        </div>

                        <div className="px-6 pb-6 space-y-4">
                            <div className="p-4 rounded-xl border bg-background/50 focus-within:border-primary transition-colors group">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold text-secondary-foreground tracking-widest uppercase">You {activeTab === "deposit" ? "pay" : "receive"}</span>
                                    <button className="text-[10px] font-bold text-primary cursor-pointer hover:underline">MAX</button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <input
                                        type="number"
                                        placeholder="0.0"
                                        value={inputAmount}
                                        onChange={(e) => setInputAmount(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xl font-mono p-0 w-full"
                                    />
                                    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-secondary transition-colors">
                                        <div className="w-5 h-5 rounded-full bg-green-500" />
                                        <span className="font-bold text-sm uppercase">USDC</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center -my-3 z-10">
                                <div className="w-8 h-8 rounded-lg bg-card border shadow-sm flex items-center justify-center transform hover:rotate-180 transition-transform duration-500 cursor-pointer">
                                    <ArrowDownRight className="w-4 h-4 text-primary" />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl border bg-background/50">
                                <div className="flex justify-between mb-2">
                                    <span className="text-[10px] font-bold text-secondary-foreground tracking-widest uppercase">You {activeTab === "deposit" ? "receive (est)" : "pay"}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-2xl font-mono">{parsedAmount > 0 ? (parsedAmount * 0.99).toFixed(2) : "0.0"}</div>
                                    <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                                        <ShieldCheckIcon className="w-5 h-5 text-primary" />
                                        <span className="font-bold text-sm uppercase text-primary">HLP</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleOpenPreview}
                                disabled={parsedAmount <= 0}
                                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {activeTab === "deposit" ? "Preview Deposit" : "Preview Withdraw"}
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-[11px] font-medium text-secondary-foreground">
                                    <span>Vault Utilization</span>
                                    <span>98.2%</span>
                                </div>
                                <div className="w-full h-1 bg-secondary/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: '98.2%' }} />
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Strategy Details */}
                    <motion.section
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl border bg-card p-6"
                    >
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Strategy Overview
                        </h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p className="text-secondary-foreground leading-relaxed">
                                    Automatically maintains <span className="text-foreground font-semibold">80% in ETH/USDC liquidity</span> to capture trading fees.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p className="text-secondary-foreground leading-relaxed">
                                    Allocates <span className="text-foreground font-semibold">20% to ETH shorts</span> via GMX to hedge against downside volatility and IL.
                                </p>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <p className="text-secondary-foreground leading-relaxed">
                                    Uniswap v4 Hooks trigger <span className="text-foreground font-semibold">atomic rebalancing</span> when price deviates {">"} 5%.
                                </p>
                            </li>
                        </ul>
                        <Link
                            href="/calculator"
                            className="w-full mt-6 py-2 border rounded-xl text-xs font-bold hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                        >
                            Try ROI Calculator
                            <ChevronRight className="w-3 h-3" />
                        </Link>
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
        </main>
    );
}

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
