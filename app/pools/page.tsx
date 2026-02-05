"use client";

import { Header } from "@/components/header";
import { WalletButton } from "@/components/wallet-button";
import { Plus, Search, Info, ChevronRight, Star, ArrowUpRight, RefreshCw, Loader2, TrendingUp, Shield, ArrowDownUp, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { useTopPools, useRewardPools, usePoolStats, formatTvl, formatApy, getTokenIconFromSymbol } from "@/hooks/use-pool-data";

type SortOption = "apy-desc" | "apy-asc" | "tvl-desc" | "tvl-asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "apy-desc", label: "Highest APY" },
    { value: "apy-asc", label: "Lowest APY" },
    { value: "tvl-desc", label: "Highest TVL" },
    { value: "tvl-asc", label: "Lowest TVL" },
];

export default function PoolsPage() {
    const { isConnected } = useAccount();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("apy-desc");
    const [showSortMenu, setShowSortMenu] = useState(false);

    const { data: topPools, isLoading: poolsLoading, refetch, isFetching } = useTopPools(10);
    const { data: rewardPools, isLoading: rewardsLoading } = useRewardPools(5);
    const { data: poolStats, isLoading: statsLoading } = usePoolStats();

    // Filter and sort pools
    const filteredPools = useMemo(() => {
        if (!topPools) return [];

        let pools = [...topPools];

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            pools = pools.filter(pool =>
                pool.name.toLowerCase().includes(query) ||
                pool.symbol.toLowerCase().includes(query) ||
                pool.chain.toLowerCase().includes(query)
            );
        }

        // Sort pools
        pools.sort((a, b) => {
            switch (sortBy) {
                case "apy-desc":
                    return (b.apy ?? 0) - (a.apy ?? 0);
                case "apy-asc":
                    return (a.apy ?? 0) - (b.apy ?? 0);
                case "tvl-desc":
                    return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
                case "tvl-asc":
                    return (a.tvlUsd ?? 0) - (b.tvlUsd ?? 0);
                default:
                    return 0;
            }
        });

        return pools;
    }, [topPools, searchQuery, sortBy]);

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Your Positions & Top Pools */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Pool Stats */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Total TVL", value: poolStats ? formatTvl(poolStats.totalTvl) : "$2.68B", loading: statsLoading },
                            { label: "24H Volume", value: poolStats ? formatTvl(poolStats.totalVolume24h) : "$4.14B", loading: statsLoading },
                            { label: "Avg APY", value: poolStats ? `${poolStats.avgApy.toFixed(1)}%` : "12.5%", loading: statsLoading },
                            { label: "Active Pools", value: poolStats ? poolStats.poolCount.toLocaleString() : "1,500+", loading: statsLoading },
                        ].map((stat, i) => (
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
                                <div className="text-lg font-mono font-bold">
                                    {stat.loading ? (
                                        <span className="animate-pulse bg-secondary/50 rounded w-16 h-6 inline-block" />
                                    ) : (
                                        stat.value
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </section>

                    {/* Your Positions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold">Your positions</h2>
                            <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">
                                <Plus className="w-4 h-4" />
                                New position
                            </button>
                        </div>

                        {!isConnected ? (
                            <div className="p-12 rounded-2xl border border-dashed bg-card/30 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4">
                                    <Shield className="w-6 h-6 text-secondary-foreground" />
                                </div>
                                <h3 className="font-bold mb-2">Connect Your Wallet</h3>
                                <p className="text-secondary-foreground text-sm max-w-sm mb-6">
                                    Connect your wallet to view your liquidity positions and start earning fees.
                                </p>
                                <WalletButton />
                            </div>
                        ) : (
                            <div className="p-12 rounded-2xl border border-dashed bg-card/30 flex flex-col items-center justify-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4">
                                    <Info className="w-6 h-6 text-secondary-foreground" />
                                </div>
                                <h3 className="font-bold mb-2">No positions yet</h3>
                                <p className="text-secondary-foreground text-sm max-w-sm mb-6">
                                    You don't have any liquidity positions. Create a new position to start earning fees and rewards on eligible pools.
                                </p>
                                <div className="flex gap-4">
                                    <button className="px-6 py-2 rounded-xl bg-secondary/50 font-bold text-sm hover:bg-secondary transition-colors">
                                        Explore pools
                                    </button>
                                    <button className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">
                                        New position
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Top Pools */}
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold">Top Pools</h2>
                                <button
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                    className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors disabled:opacity-50"
                                >
                                    {isFetching ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4 text-secondary-foreground" />
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowSortMenu(!showSortMenu)}
                                        className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-xl text-sm font-medium hover:bg-secondary/50 transition-colors"
                                    >
                                        <ArrowDownUp className="w-4 h-4" />
                                        <span className="hidden sm:inline">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showSortMenu && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowSortMenu(false)}
                                            />
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                                                {SORT_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => {
                                                            setSortBy(option.value);
                                                            setShowSortMenu(false);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 transition-colors ${sortBy === option.value ? 'bg-primary/10 text-primary font-bold' : ''
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                {/* Search */}
                                <div className="relative max-w-xs">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search pools..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-secondary/30 rounded-xl border-none outline-none focus:ring-1 focus:ring-primary transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-card overflow-hidden">
                            {poolsLoading ? (
                                // Loading skeleton
                                <div className="divide-y">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                                            <div className="flex items-center gap-4">
                                                <div className="flex -space-x-3">
                                                    <div className="w-10 h-10 rounded-full bg-secondary/30" />
                                                    <div className="w-10 h-10 rounded-full bg-secondary/30" />
                                                </div>
                                                <div>
                                                    <div className="h-4 bg-secondary/30 rounded w-24 mb-2" />
                                                    <div className="h-3 bg-secondary/30 rounded w-16" />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="h-4 bg-secondary/30 rounded w-16 mb-2" />
                                                <div className="h-3 bg-secondary/30 rounded w-20" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPools.length === 0 ? (
                                <div className="p-12 text-center text-secondary-foreground">
                                    {searchQuery ? `No pools found for "${searchQuery}"` : "No pools available"}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredPools.map((pool, i) => (
                                        <motion.div
                                            key={pool.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex -space-x-3">
                                                    {(() => {
                                                        const icons = getTokenIconFromSymbol(pool.symbol);
                                                        return (
                                                            <>
                                                                <img
                                                                    src={icons.token1Icon}
                                                                    alt="Token 1"
                                                                    className="w-10 h-10 rounded-full border-4 border-card z-10"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div
                                                                    className="w-10 h-10 rounded-full border-4 border-card z-10 hidden"
                                                                    style={{ backgroundColor: pool.color1 }}
                                                                />
                                                                <img
                                                                    src={icons.token2Icon}
                                                                    alt="Token 2"
                                                                    className="w-10 h-10 rounded-full border-4 border-card"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div
                                                                    className="w-10 h-10 rounded-full border-4 border-card hidden"
                                                                    style={{ backgroundColor: pool.color2 }}
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <div className="font-bold group-hover:text-primary transition-colors">
                                                        {pool.name}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-bold uppercase">
                                                            {pool.version}
                                                        </span>
                                                        <span className="text-[10px] text-secondary-foreground font-bold">
                                                            {pool.fee}
                                                        </span>
                                                        <span className="text-[10px] text-secondary-foreground">
                                                            {pool.chain}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono font-bold text-success">
                                                    {formatApy(pool.apy)} APY
                                                </div>
                                                <div className="text-[10px] text-secondary-foreground font-bold">
                                                    TVL: {formatTvl(pool.tvlUsd)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Data attribution */}
                        <div className="mt-2 text-xs text-secondary-foreground text-center">
                            Pool data from DeFiLlama • Real-time APY and TVL
                        </div>
                    </section>
                </div>

                {/* Right Column: Rewards & Learn */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Pools with rewards */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Pools with rewards</h2>
                            <Star className="w-4 h-4 text-primary" fill="currentColor" />
                        </div>
                        <div className="space-y-4">
                            {rewardsLoading ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="p-4 rounded-2xl border bg-card animate-pulse">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-secondary/30" />
                                                <div className="w-8 h-8 rounded-full bg-secondary/30" />
                                            </div>
                                            <div className="h-4 bg-secondary/30 rounded w-24" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 rounded-xl bg-secondary/20 h-14" />
                                            <div className="p-2 rounded-xl bg-secondary/20 h-14" />
                                        </div>
                                    </div>
                                ))
                            ) : rewardPools && rewardPools.length > 0 ? (
                                rewardPools.map((pool) => (
                                    <motion.div
                                        key={pool.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-2xl border bg-gradient-to-br from-card to-card/50 hover:border-primary/50 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {(() => {
                                                        const icons = getTokenIconFromSymbol(pool.symbol);
                                                        return (
                                                            <>
                                                                <img
                                                                    src={icons.token1Icon}
                                                                    alt="Token 1"
                                                                    className="w-8 h-8 rounded-full border-2 border-card"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div
                                                                    className="w-8 h-8 rounded-full border-2 border-card hidden"
                                                                    style={{ backgroundColor: pool.color1 }}
                                                                />
                                                                <img
                                                                    src={icons.token2Icon}
                                                                    alt="Token 2"
                                                                    className="w-8 h-8 rounded-full border-2 border-card"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                                    }}
                                                                />
                                                                <div
                                                                    className="w-8 h-8 rounded-full border-2 border-card hidden"
                                                                    style={{ backgroundColor: pool.color2 }}
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="font-bold text-sm">{pool.name}</div>
                                            </div>
                                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Star className="w-3.5 h-3.5 text-primary" fill="currentColor" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 rounded-xl bg-secondary/20">
                                                <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider mb-0.5">
                                                    Base APR
                                                </div>
                                                <div className="text-sm font-mono font-bold">
                                                    {formatApy(pool.apyBase)}
                                                </div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-primary/5">
                                                <div className="text-[9px] text-primary uppercase font-bold tracking-wider mb-0.5">
                                                    Reward APR
                                                </div>
                                                <div className="text-sm font-mono font-bold text-primary">
                                                    +{formatApy(pool.apyReward)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[10px] text-secondary-foreground">
                                            TVL: {formatTvl(pool.tvlUsd)} • {pool.chain}
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-secondary-foreground text-sm">
                                    No reward pools available
                                </div>
                            )}
                        </div>
                    </section>

                    {/* HedgeLP Vault CTA */}
                    <section className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h3 className="font-bold">HedgeLP Vault</h3>
                        </div>
                        <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                            Earn LP fees while automatically hedging against price volatility. Our delta-neutral strategy protects your capital in any market condition.
                        </p>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-card/50 mb-4">
                            <div>
                                <div className="text-[10px] text-secondary-foreground uppercase font-bold">Est. APY</div>
                                <div className="text-xl font-mono font-bold text-success">18.4%</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-secondary-foreground uppercase font-bold">Risk Level</div>
                                <div className="text-sm font-bold text-primary">Delta Neutral</div>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all"
                        >
                            Explore Vault
                        </button>
                    </section>

                    {/* Learn Section */}
                    <section className="p-6 rounded-2xl bg-secondary/20 border-none space-y-4">
                        <h3 className="font-bold">Learn about liquidity provision</h3>
                        <div className="space-y-3">
                            {[
                                "Providing liquidity on different protocols",
                                "Hooks on Uniswap v4",
                                "Understanding fees and rewards",
                                "Impermanent loss explained",
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between group cursor-pointer">
                                    <span className="text-sm font-medium text-secondary-foreground group-hover:text-foreground transition-colors">
                                        {item}
                                    </span>
                                    <ArrowUpRight className="w-4 h-4 text-secondary-foreground group-hover:text-primary transition-colors" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
