"use client";

import { Header } from "@/components/header";
import { Search, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import Link from "next/link";

const MOCK_TOKENS = [
    { id: "ethereum", name: "Ethereum", symbol: "ETH", price: 2314.87, change: 0.22, tvl: 282700000000, volume: 353900000, color: "#627EEA", data: [2100, 2150, 2200, 2180, 2250, 2300, 2314] },
    { id: "usdc", name: "USD Coin", symbol: "USDC", price: 1.00, change: 0.01, tvl: 70600000000, volume: 238300000, color: "#2775CA", data: [1, 1.0001, 0.9999, 1, 1, 1, 1] },
    { id: "uniswap", name: "Uniswap", symbol: "UNI", price: 8.95, change: -1.24, tvl: 5400000000, volume: 45000000, color: "#FF007A", data: [9.2, 9.1, 9.0, 8.8, 8.9, 9.0, 8.95] },
    { id: "bitcoin", name: "Wrapped Bitcoin", symbol: "WBTC", price: 78032.59, change: 0.20, tvl: 9500000000, volume: 138100000, color: "#F7931A", data: [75000, 76000, 77000, 76500, 78000, 77500, 78032] },
    { id: "solana", name: "Solana", symbol: "SOL", price: 103.08, change: 0.61, tvl: 62600000000, volume: 185400000, color: "#14F195", data: [95, 98, 102, 100, 105, 103, 103.08] },
    { id: "tether", name: "Tether", symbol: "USDT", price: 1.00, change: 0.00, tvl: 190700000000, volume: 685000000, color: "#26A17B", data: [1, 1, 1, 1, 1, 1, 1] },
];

function MiniChart({ data, color }: { data: number[], color: string }) {
    const chartData = data.map((v, i) => ({ value: v, time: i }));
    return (
        <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill={color}
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function TokensPage() {
    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <h1 className="text-3xl font-bold">Tokens on HedgeLP</h1>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                        <input
                            type="text"
                            placeholder="Search tokens"
                            className="w-full pl-10 pr-4 py-2 bg-secondary/30 rounded-xl border-none outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Market Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "1D Volume", value: "$4.14B", change: "+21.58%" },
                        { label: "Total Uniswap TVL", value: "$2.68B", change: "-2.68%" },
                        { label: "v2 TVL", value: "$949.18M", change: "+1.41%" },
                        { label: "v4 TVL", value: "$596.98M", change: "+2.73%" },
                    ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-2xl border bg-card/50">
                            <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-mono font-bold">{stat.value}</span>
                                <span className={clsx("text-xs font-bold", stat.change.startsWith("+") ? "text-success" : "text-destructive")}>
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tokens Table */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b bg-secondary/10">
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest w-12 text-center">#</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest">Token Name</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right">Price</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right">Change</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right hidden md:table-cell">TVL</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right hidden lg:table-cell">Volume</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right w-32">7D Chart</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {MOCK_TOKENS.map((token, i) => (
                                    <motion.tr
                                        key={token.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="hover:bg-secondary/10 transition-colors cursor-pointer group"
                                        onClick={() => window.location.href = `/tokens/${token.id}`}
                                    >
                                        <td className="px-6 py-4 text-sm font-mono text-secondary-foreground text-center">{i + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: token.color }} />
                                                <div>
                                                    <div className="font-bold text-sm">{token.name}</div>
                                                    <div className="text-secondary-foreground text-[10px] font-bold uppercase">{token.symbol}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-sm font-bold">${token.price.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={clsx("flex items-center justify-end gap-1 text-sm font-bold", token.change > 0 ? "text-success" : "text-destructive")}>
                                                {token.change > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                                {Math.abs(token.change)}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-secondary-foreground hidden md:table-cell">
                                            ${(token.tvl / 1e9).toFixed(1)}B
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-secondary-foreground hidden lg:table-cell">
                                            ${(token.volume / 1e6).toFixed(1)}M
                                        </td>
                                        <td className="px-6 py-4 text-right pr-6">
                                            <div className="flex justify-end">
                                                <MiniChart data={token.data} color={token.change > 0 ? "#27D545" : "#FD3B4C"} />
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}

function clsx(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
