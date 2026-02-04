"use client";

import { Header } from "@/components/header";
import {
    ArrowUpRight,
    ArrowDownRight,
    ChevronDown,
    Info,
    TrendingUp,
    Activity,
    Globe,
    Twitter,
    ArrowDown
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
import { useParams } from "next/navigation";

// Mock chart data
const chartData = [
    { time: "08:00", value: 2280 },
    { time: "10:00", value: 2310 },
    { time: "12:00", value: 2295 },
    { time: "14:00", value: 2340 },
    { time: "16:00", value: 2314 },
    { time: "18:00", value: 2350 },
    { time: "20:00", value: 2314.87 },
];

const TOKEN_INFO: Record<string, any> = {
    ethereum: { name: "Ethereum", symbol: "ETH", price: 2314.87, change: 0.22, color: "#627EEA" },
    uniswap: { name: "Uniswap", symbol: "UNI", price: 8.95, change: -1.24, color: "#FF007A" },
    bitcoin: { name: "Bitcoin", symbol: "BTC", price: 78032.59, change: 0.20, color: "#F7931A" },
};

export default function TokenDetailPage() {
    const { id } = useParams();
    const token = TOKEN_INFO[id as string] || TOKEN_INFO.ethereum;
    const [sellAmount, setSellAmount] = useState("");

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Chart & Stats */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Token Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full" style={{ backgroundColor: token.color }} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-bold">{token.name}</h1>
                                    <span className="text-secondary-foreground font-bold">{token.symbol}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-2xl font-mono font-bold">${token.price.toLocaleString()}</span>
                                    <span className={`text-sm font-bold flex items-center gap-0.5 ${token.change > 0 ? "text-success" : "text-destructive"}`}>
                                        {token.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(token.change)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {["1H", "1D", "1W", "1M", "1Y", "ALL"].map((t) => (
                                <button key={t} className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${t === "1D" ? "bg-secondary text-foreground" : "text-secondary-foreground hover:bg-secondary/50"}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Large Price Chart */}
                    <div className="h-[400px] w-full bg-card rounded-3xl border p-6 relative group overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={token.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={token.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" hide />
                                <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-popover border p-3 rounded-xl shadow-2xl outline-none">
                                                    <p className="text-lg font-mono font-bold">${payload[0].value}</p>
                                                    <p className="text-[10px] text-secondary-foreground uppercase font-bold tracking-widest">{payload[0].payload.time}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={token.color}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorVal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Token Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Market Cap", value: "$282.7B" },
                            { label: "Fully Diluted Valuation", value: "$282.7B" },
                            { label: "24H Volume", value: "$4.14B" },
                            { label: "Circulating Supply", value: "122.3M ETH" },
                        ].map((stat, i) => (
                            <div key={i} className="p-4 rounded-2xl border bg-card/50">
                                <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className="text-sm font-mono font-bold">{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* About Token */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold">About {token.name}</h2>
                        <p className="text-secondary-foreground leading-relaxed text-sm">
                            Ether (ETH) is the native cryptocurrency of the Ethereum network. It is used to pay for transaction fees and computational services on the network. Ethereum is a decentralized, open-source blockchain with smart contract functionality.
                        </p>
                        <div className="flex gap-4">
                            <button className="flex items-center gap-2 text-xs font-bold text-secondary-foreground hover:text-foreground">
                                <Globe className="w-3 h-3" />
                                Website
                            </button>
                            <button className="flex items-center gap-2 text-xs font-bold text-secondary-foreground hover:text-foreground">
                                <Twitter className="w-3 h-3" />
                                Twitter
                            </button>
                        </div>
                    </section>
                </div>

                {/* Right Column: Swap Widget */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border rounded-3xl p-4 shadow-xl sticky top-24">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <span className="font-bold">Swap</span>
                            <div className="flex items-center gap-2 text-secondary-foreground">
                                <span className="text-xs font-bold">Auto</span>
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="space-y-1 relative">
                            <div className="p-4 rounded-2xl bg-secondary/20 border-none group transition-all">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-secondary-foreground">Sell</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={sellAmount}
                                        onChange={(e) => setSellAmount(e.target.value)}
                                        className="bg-transparent border-none outline-none text-2xl font-mono p-0 w-full"
                                    />
                                    <button className="flex items-center gap-2 bg-secondary/50 px-2 py-1.5 rounded-xl text-xs font-bold">
                                        <div className="w-4 h-4 rounded-full bg-[#627EEA]" />
                                        ETH
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10">
                                <div className="w-8 h-8 bg-card border-4 border-background rounded-lg flex items-center justify-center cursor-pointer hover:bg-secondary transition-all">
                                    <ArrowDown className="w-3 h-3 text-primary" />
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-secondary/20 border-none group transition-all">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-secondary-foreground">Buy</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-2xl font-mono text-secondary-foreground">0</div>
                                    <button className="flex items-center gap-2 bg-primary text-primary-foreground px-2 py-1.5 rounded-xl text-xs font-bold">
                                        Select token
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button className="w-full mt-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                            Swap
                        </button>

                        <div className="mt-4 p-4 rounded-2xl bg-secondary/10 flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] font-bold text-secondary-foreground uppercase">
                                <span>Network Cost</span>
                                <span className="text-foreground">$2.34</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-secondary-foreground uppercase">
                                <span>Price Impact</span>
                                <span className="text-success">&lt;0.01%</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-sm">HedgeLP Strategy</h3>
                        </div>
                        <p className="text-xs text-secondary-foreground leading-relaxed mb-4">
                            Earn yield on this asset while protecting against price volatility. Our strategy maintains a delta-neutral position for high-APY liquidity provision.
                        </p>
                        <button className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all">
                            Deposit to {token.symbol} Vault
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}
