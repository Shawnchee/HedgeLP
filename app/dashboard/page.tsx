"use client";

import { Header } from "@/components/header";
import { TradePreviewModal, TradeSettings } from "@/components/trade-preview-modal";
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
    Calculator
} from "lucide-react";
import {
    Area,
    AreaChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";

// Mock data for the performance chart
const performanceData = [
    { time: "00:00", value: 10000 },
    { time: "04:00", value: 10200 },
    { time: "08:00", value: 10150 },
    { time: "12:00", value: 10400 },
    { time: "16:00", value: 10300 },
    { time: "20:00", value: 10600 },
    { time: "24:00", value: 10550 },
];

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
    const [inputAmount, setInputAmount] = useState("");
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const parsedAmount = parseFloat(inputAmount) || 0;

    const handleOpenPreview = () => {
        if (parsedAmount > 0) {
            setShowPreviewModal(true);
        }
    };

    const handleConfirmTrade = async (settings: TradeSettings) => {
        setIsProcessing(true);
        // Simulate transaction
        console.log("Trade settings:", settings);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsProcessing(false);
        setShowPreviewModal(false);
        setInputAmount("");
    };

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground selection:bg-primary/30">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Portfolio Overview & Charts */}
                <div className="lg:col-span-8 space-y-6">

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
                                <h3 className="text-3xl font-mono font-bold">$10,550.42</h3>
                                <div className="flex items-center gap-1 mt-1 text-success text-sm font-semibold">
                                    <ArrowUpRight className="w-4 h-4" />
                                    +5.5% (24h)
                                </div>
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
                                <h3 className="text-3xl font-mono font-bold">80/20</h3>
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
                                <h3 className="text-3xl font-mono font-bold">18.4%</h3>
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
                                <p className="text-secondary-foreground text-sm">HedgeLP Strategy vs. ETH/USDC Pure LP</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded-full bg-secondary/50 text-xs font-semibold">1D</button>
                                <button className="px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground hover:bg-secondary/30 transition-colors">1W</button>
                                <button className="px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground hover:bg-secondary/30 transition-colors">1M</button>
                            </div>
                        </div>

                        <div className="h-64 w-full">
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
                            <h2 className="font-bold">Active Pool Exposure</h2>
                            <Info className="w-4 h-4 text-secondary-foreground cursor-pointer" />
                        </div>
                        <div className="divide-y">
                            <div className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-card flex items-center justify-center">
                                            <Droplets className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-green-500 border-2 border-card" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">ETH / USDC</div>
                                        <div className="text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">Uniswap v4 • 0.3% fee</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono font-bold">$8,440.34</div>
                                    <div className="text-[10px] text-primary font-semibold">80% Allocated</div>
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center border-2 border-card">
                                        <Shield className="w-4 h-4 text-success" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">ETH Short (1x)</div>
                                        <div className="text-secondary-foreground text-[10px] font-bold uppercase tracking-wider">GMX v2 Perpetual</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-mono font-bold">$2,110.08</div>
                                    <div className="text-[10px] text-success font-semibold">PnL: +$12.40</div>
                                </div>
                            </div>
                        </div>
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
