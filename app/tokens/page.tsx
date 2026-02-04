"use client";

import { Header } from "@/components/header";
import { Search, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, Loader2 } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useTokenPrices, useMarketStats, formatCurrency, formatPercent, SUPPORTED_TOKENS } from "@/hooks/use-market-data";

function MiniChart({ data, color }: { data: number[] | undefined, color: string }) {
    if (!data || data.length === 0) {
        // Fallback placeholder
        return <div className="h-10 w-24 bg-secondary/20 rounded animate-pulse" />;
    }
    
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

function clsx(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}

export default function TokensPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const { data: tokens, isLoading: tokensLoading, refetch, isFetching } = useTokenPrices();
    const { data: marketStats, isLoading: statsLoading } = useMarketStats();

    // Filter tokens based on search
    const filteredTokens = useMemo(() => {
        if (!tokens) return [];
        if (!searchQuery) return tokens;
        
        const query = searchQuery.toLowerCase();
        return tokens.filter(token => 
            token.name.toLowerCase().includes(query) ||
            token.symbol.toLowerCase().includes(query)
        );
    }, [tokens, searchQuery]);

    // Calculate market stats
    const stats = useMemo(() => {
        if (!marketStats) {
            return [
                { label: "Total Market Cap", value: "$2.68T", change: "-2.68%" },
                { label: "24H Volume", value: "$414B", change: "+21.58%" },
                { label: "ETH Dominance", value: "17.3%", change: "+0.5%" },
                { label: "Active Markets", value: "12,500+", change: null },
            ];
        }
        
        return [
            { 
                label: "Total Market Cap", 
                value: formatCurrency(marketStats.totalMarketCap, true), 
                change: formatPercent(marketStats.marketCapChange24h)
            },
            { 
                label: "24H Volume", 
                value: formatCurrency(marketStats.totalVolume24h, true), 
                change: "+21.58%" 
            },
            { 
                label: "ETH Dominance", 
                value: `${marketStats.ethDominance.toFixed(1)}%`, 
                change: "+0.5%" 
            },
            { 
                label: "BTC Dominance", 
                value: `${marketStats.btcDominance.toFixed(1)}%`, 
                change: null 
            },
        ];
    }, [marketStats]);

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-bold">Tokens</h1>
                        <button
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50"
                            title="Refresh prices"
                        >
                            {isFetching ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                                <RefreshCw className="w-4 h-4 text-secondary-foreground" />
                            )}
                        </button>
                        <span className="text-xs text-secondary-foreground">
                            Live prices from CoinGecko
                        </span>
                    </div>
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                        <input
                            type="text"
                            placeholder="Search tokens by name or symbol"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-secondary/30 rounded-xl border-none outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Market Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="p-4 rounded-2xl border bg-card/50"
                        >
                            <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">
                                {stat.label}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-mono font-bold">
                                    {statsLoading ? (
                                        <span className="animate-pulse bg-secondary/50 rounded w-20 h-6 inline-block" />
                                    ) : (
                                        stat.value
                                    )}
                                </span>
                                {stat.change && (
                                    <span className={clsx(
                                        "text-xs font-bold",
                                        stat.change.startsWith("+") ? "text-success" : "text-destructive"
                                    )}>
                                        {stat.change}
                                    </span>
                                )}
                            </div>
                        </motion.div>
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
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right">24H Change</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right hidden md:table-cell">Market Cap</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right hidden lg:table-cell">Volume (24H)</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-secondary-foreground uppercase tracking-widest text-right w-32">7D Chart</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {tokensLoading ? (
                                    // Loading skeleton
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-secondary/30 rounded w-8 mx-auto" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-secondary/30" />
                                                    <div>
                                                        <div className="h-4 bg-secondary/30 rounded w-24 mb-1" />
                                                        <div className="h-3 bg-secondary/30 rounded w-12" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="h-4 bg-secondary/30 rounded w-20 ml-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-secondary/30 rounded w-16 ml-auto" /></td>
                                            <td className="px-6 py-4 hidden md:table-cell"><div className="h-4 bg-secondary/30 rounded w-20 ml-auto" /></td>
                                            <td className="px-6 py-4 hidden lg:table-cell"><div className="h-4 bg-secondary/30 rounded w-20 ml-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-10 bg-secondary/30 rounded w-24 ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredTokens.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-secondary-foreground">
                                            {searchQuery ? `No tokens found for "${searchQuery}"` : "No tokens available"}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTokens.map((token, i) => (
                                        <motion.tr
                                            key={token.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="hover:bg-secondary/10 transition-colors cursor-pointer group"
                                            onClick={() => window.location.href = `/tokens/${token.id}`}
                                        >
                                            <td className="px-6 py-4 text-sm font-mono text-secondary-foreground text-center">
                                                {i + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex-shrink-0" 
                                                        style={{ backgroundColor: token.color }} 
                                                    />
                                                    <div>
                                                        <div className="font-bold text-sm group-hover:text-primary transition-colors">
                                                            {token.name}
                                                        </div>
                                                        <div className="text-secondary-foreground text-[10px] font-bold uppercase">
                                                            {token.symbol}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm font-bold">
                                                ${(token.current_price ?? 0).toLocaleString(undefined, { 
                                                    minimumFractionDigits: (token.current_price ?? 0) < 1 ? 4 : 2,
                                                    maximumFractionDigits: (token.current_price ?? 0) < 1 ? 6 : 2 
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={clsx(
                                                    "flex items-center justify-end gap-1 text-sm font-bold",
                                                    (token.price_change_percentage_24h ?? 0) > 0 ? "text-success" : "text-destructive"
                                                )}>
                                                    {(token.price_change_percentage_24h ?? 0) > 0 ? (
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    ) : (
                                                        <ArrowDownRight className="w-4 h-4" />
                                                    )}
                                                    {Math.abs(token.price_change_percentage_24h ?? 0).toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-secondary-foreground hidden md:table-cell">
                                                {formatCurrency(token.market_cap ?? 0, true)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-secondary-foreground hidden lg:table-cell">
                                                {formatCurrency(token.total_volume ?? 0, true)}
                                            </td>
                                            <td className="px-6 py-4 text-right pr-6">
                                                <div className="flex justify-end">
                                                    <MiniChart 
                                                        data={token.sparkline_in_7d?.price?.slice(-24)} 
                                                        color={(token.price_change_percentage_24h ?? 0) > 0 ? "#27D545" : "#FD3B4C"} 
                                                    />
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Data attribution */}
                <div className="mt-4 text-center text-xs text-secondary-foreground">
                    Data provided by CoinGecko API • Refreshes every minute
                </div>
            </div>
        </main>
    );
}
