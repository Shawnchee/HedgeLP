"use client";

import { Header } from "@/components/header";
import { PoolDepositModal, type PoolDepositSettings } from "@/components/pool-deposit-modal";
import type { DepositResult } from "@/hooks/use-pool-deposit";
import {
    Search, Star, ArrowUpRight, RefreshCw, Loader2,
    TrendingUp, ArrowDownUp, ChevronDown, ChevronRight, Wifi, Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import { useChainId } from "wagmi";
import {
    useTopPools, useRewardPools, usePoolStats,
    formatTvl, formatApy, getTokenIconFromSymbol,
    type Pool,
} from "@/hooks/use-pool-data";
import { usePositions, type VaultPosition } from "@/hooks/use-positions";

type SortOption = "apy-desc" | "apy-asc" | "tvl-desc" | "tvl-asc";
type VersionFilter = "all" | "v2" | "v3" | "v4";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "apy-desc", label: "Highest APY" },
    { value: "apy-asc", label: "Lowest APY" },
    { value: "tvl-desc", label: "Highest TVL" },
    { value: "tvl-asc", label: "Lowest TVL" },
];

const VERSION_FILTERS: { value: VersionFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "v2", label: "V2" },
    { value: "v3", label: "V3" },
    { value: "v4", label: "V4" },
];

export default function PoolsPage() {
    const chainId = useChainId();
    const isSepolia = chainId === 11155111;

    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("apy-desc");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [versionFilter, setVersionFilter] = useState<VersionFilter>("all");
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [showDepositModal, setShowDepositModal] = useState(false);

    const { data: topPools, isLoading: poolsLoading, refetch, isFetching } = useTopPools(50);
    const { data: rewardPools, isLoading: rewardsLoading } = useRewardPools(5);
    const { data: poolStats, isLoading: statsLoading } = usePoolStats();
    const { addPosition } = usePositions();

    const handlePoolClick = useCallback((pool: Pool) => {
        setSelectedPool(pool);
        setShowDepositModal(true);
    }, []);

    const handleDepositSuccess = useCallback((pool: Pool, amount: number, settings: PoolDepositSettings, result?: DepositResult, ethPrice?: number) => {
        const icons = getTokenIconFromSymbol(pool.symbol);
        const isReal = !!result;
        const ep = ethPrice ?? 0;

        // Calculate real USD values for on-chain deposits
        const depositedUsd = isReal
            ? parseFloat(result.totalEthDeposited) * ep
            : amount;
        const lpValueUsd = isReal
            ? parseFloat(result.lpEthAmount) * ep
            : amount * settings.lpPercent / 100;
        const hedgeValueUsd = isReal
            ? (parseFloat(result.hedgeUsdcFormatted) > 0
                ? parseFloat(result.hedgeUsdcFormatted)       // USDC = 1:1 USD
                : parseFloat(result.hedgeEthAmount) * ep)
            : amount * (100 - settings.lpPercent) / 100;

        // Estimate LP USDC received (from LP swap half)
        const totalUsdc = parseFloat(result?.totalUsdcReceived ?? "0");
        const hedgeUsdc = parseFloat(result?.hedgeUsdcFormatted ?? "0");
        const lpUsdcReceived = Math.max(0, totalUsdc - hedgeUsdc);

        const newPos: VaultPosition = {
            id: `pos-${Date.now()}`,
            pool: pool.name,
            protocol: pool.version || "Uniswap V4",
            chain: isReal ? "Sepolia" : pool.chain,
            deposited: depositedUsd,
            currentValue: depositedUsd,
            pnl: 0,
            pnlPercent: 0,
            lpPercent: settings.lpPercent,
            hedgePercent: 100 - settings.lpPercent,
            apy: pool.apy || 0,
            autoCompound: settings.autoCompound,
            autoStopLoss: settings.autoStopLoss,
            openedAt: "Just now",
            timestamp: Date.now(),
            icon1: icons.token1Icon,
            icon2: icons.token2Icon,
            color1: pool.color1,
            color2: pool.color2,

            // Real on-chain data (single multicall tx)
            isReal,
            network: isReal ? "Sepolia" : undefined,
            totalEthDeposited: result?.totalEthDeposited,
            lpEthAmount: result?.lpEthAmount,
            lpWethKept: result?.lpWethKept,
            lpUsdcReceived: lpUsdcReceived > 0 ? lpUsdcReceived.toFixed(2) : undefined,
            hedgeEthAmount: result?.hedgeEthAmount,
            hedgeUsdcReceived: result?.hedgeUsdcFormatted,
            totalUsdcReceived: result?.totalUsdcReceived,
            txHash: result?.txHash,
            ethPriceAtDeposit: ep > 0 ? ep : undefined,
            lpValueUsd,
            hedgeValueUsd,
            depositedUsd,

            // 1x Short / Delta-Neutral
            shortSizeEth: result?.shortSizeEth,
            lpEthExposure: result?.lpEthExposure,
            hedgeCoverage: result?.hedgeCoverage,
        };
        addPosition(newPos);
    }, [addPosition]);

    // Filter and sort pools
    const filteredPools = useMemo(() => {
        if (!topPools) return [];
        let pools = [...topPools];

        // Version filter
        if (versionFilter !== "all") {
            pools = pools.filter(pool => pool.version === versionFilter);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            pools = pools.filter(pool =>
                pool.name.toLowerCase().includes(query) ||
                pool.symbol.toLowerCase().includes(query) ||
                pool.chain.toLowerCase().includes(query)
            );
        }

        pools.sort((a, b) => {
            switch (sortBy) {
                case "apy-desc": return (b.apy ?? 0) - (a.apy ?? 0);
                case "apy-asc": return (a.apy ?? 0) - (b.apy ?? 0);
                case "tvl-desc": return (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0);
                case "tvl-asc": return (a.tvlUsd ?? 0) - (b.tvlUsd ?? 0);
                default: return 0;
            }
        });

        return pools;
    }, [topPools, searchQuery, sortBy, versionFilter]);

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Sepolia Banner */}
                {isSepolia && (
                    <div className="lg:col-span-12">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-success/10 to-primary/10 border border-success/30"
                        >
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/20 border border-success/30">
                                <Wifi className="w-4 h-4 text-success" />
                                <span className="text-sm font-bold text-success">Sepolia Testnet</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-foreground/80">
                                <Zap className="w-4 h-4 text-primary" />
                                <span>Real on-chain pool deposits &bull; Click any pool to add liquidity via Uniswap V4</span>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Left Column: Stats + Top Pools */}
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
                                <div className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">{stat.label}</div>
                                <div className="text-lg font-mono font-bold">
                                    {stat.loading ? <span className="animate-pulse bg-secondary/50 rounded w-16 h-6 inline-block" /> : stat.value}
                                </div>
                            </motion.div>
                        ))}
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
                                    {isFetching ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <RefreshCw className="w-4 h-4 text-secondary-foreground" />}
                                </button>
                                {/* Version Filter */}
                                <div className="flex items-center rounded-xl bg-secondary/20 p-0.5">
                                    {VERSION_FILTERS.map((filter) => (
                                        <button
                                            key={filter.value}
                                            onClick={() => setVersionFilter(filter.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                versionFilter === filter.value
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-secondary-foreground hover:text-foreground hover:bg-secondary/50"
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
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
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                                    </button>
                                    {showSortMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                                            <div className="absolute right-0 top-full mt-1 w-40 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                                                {SORT_OPTIONS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 transition-colors ${sortBy === option.value ? "bg-primary/10 text-primary font-bold" : ""}`}
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
                                    {searchQuery
                                        ? `No pools found for "${searchQuery}"${versionFilter !== "all" ? ` in ${versionFilter.toUpperCase()}` : ""}`
                                        : versionFilter !== "all"
                                            ? `No ${versionFilter.toUpperCase()} pools available`
                                            : "No pools available"}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredPools.map((pool, i) => (
                                        <motion.div
                                            key={pool.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            onClick={() => handlePoolClick(pool)}
                                            className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="flex -space-x-3">
                                                    {(() => {
                                                        const icons = getTokenIconFromSymbol(pool.symbol);
                                                        return (
                                                            <>
                                                                <img src={icons.token1Icon} alt="Token 1" className="w-10 h-10 rounded-full border-4 border-card z-10"
                                                                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                                                                <div className="w-10 h-10 rounded-full border-4 border-card z-10 hidden" style={{ backgroundColor: pool.color1 }} />
                                                                <img src={icons.token2Icon} alt="Token 2" className="w-10 h-10 rounded-full border-4 border-card"
                                                                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                                                                <div className="w-10 h-10 rounded-full border-4 border-card hidden" style={{ backgroundColor: pool.color2 }} />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div>
                                                    <div className="font-bold group-hover:text-primary transition-colors">{pool.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-bold uppercase">{pool.version}</span>
                                                        <span className="text-[10px] text-secondary-foreground font-bold">{pool.fee}</span>
                                                        <span className="text-[10px] text-secondary-foreground">{pool.chain}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-sm font-mono font-bold text-success">{formatApy(pool.apy)} APY</div>
                                                    <div className="text-[10px] text-secondary-foreground font-bold">TVL: {formatTvl(pool.tvlUsd)}</div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-secondary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-2 text-xs text-secondary-foreground text-center">
                            Pool data from DeFiLlama &bull; Real-time APY and TVL &bull; Click any pool to open a HedgeLP position
                        </div>
                    </section>
                </div>

                {/* Right Column */}
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
                                        onClick={() => handlePoolClick(pool)}
                                        className="p-4 rounded-2xl border bg-gradient-to-br from-card to-card/50 hover:border-primary/50 transition-all cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {(() => {
                                                        const icons = getTokenIconFromSymbol(pool.symbol);
                                                        return (
                                                            <>
                                                                <img src={icons.token1Icon} alt="" className="w-8 h-8 rounded-full border-2 border-card"
                                                                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                                                                <div className="w-8 h-8 rounded-full border-2 border-card hidden" style={{ backgroundColor: pool.color1 }} />
                                                                <img src={icons.token2Icon} alt="" className="w-8 h-8 rounded-full border-2 border-card"
                                                                    onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                                                                <div className="w-8 h-8 rounded-full border-2 border-card hidden" style={{ backgroundColor: pool.color2 }} />
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
                                                <div className="text-[9px] text-secondary-foreground uppercase font-bold tracking-wider mb-0.5">Base APR</div>
                                                <div className="text-sm font-mono font-bold">{formatApy(pool.apyBase)}</div>
                                            </div>
                                            <div className="p-2 rounded-xl bg-primary/5">
                                                <div className="text-[9px] text-primary uppercase font-bold tracking-wider mb-0.5">Reward APR</div>
                                                <div className="text-sm font-mono font-bold text-primary">+{formatApy(pool.apyReward)}</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[10px] text-secondary-foreground">TVL: {formatTvl(pool.tvlUsd)} &bull; {pool.chain}</div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-secondary-foreground text-sm">No reward pools available</div>
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
                            onClick={() => window.location.href = "/dashboard"}
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
                                    <span className="text-sm font-medium text-secondary-foreground group-hover:text-foreground transition-colors">{item}</span>
                                    <ArrowUpRight className="w-4 h-4 text-secondary-foreground group-hover:text-primary transition-colors" />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* Pool Deposit Modal */}
            <AnimatePresence>
                <PoolDepositModal
                    isOpen={showDepositModal}
                    onClose={() => { setShowDepositModal(false); setSelectedPool(null); }}
                    pool={selectedPool}
                    onSuccess={handleDepositSuccess}
                />
            </AnimatePresence>
        </main>
    );
}
