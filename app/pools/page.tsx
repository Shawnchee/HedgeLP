"use client";

import { Header } from "@/components/header";
import { Plus, Search, Info, ChevronRight, Star, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const TOP_POOLS = [
    { id: "wise-eth", name: "WISE / ETH", version: "v2", fee: "0.3%", apr: "0.01%", tvl: "$1.2M", color1: "#14F195", color2: "#627EEA" },
    { id: "eth-usdt", name: "ETH / USDT", version: "v3", fee: "0.3%", apr: "38.69%", tvl: "$45.2M", color1: "#627EEA", color2: "#26A17B" },
    { id: "wbtc-eth", name: "WBTC / ETH", version: "v3", fee: "0.3%", apr: "11.52%", tvl: "$82.1M", color1: "#F7931A", color2: "#627EEA" },
    { id: "usdc-eth", name: "USDC / ETH", version: "v3", fee: "0.05%", apr: "7.55%", tvl: "$120.4M", color1: "#2775CA", color2: "#627EEA" },
    { id: "eth-usdc-high", name: "ETH / USDC", version: "v3", fee: "0.05%", apr: "50.12%", tvl: "$65.0M", color1: "#627EEA", color2: "#2775CA" },
];

const REWARD_POOLS = [
    { id: "usde-usdt", name: "USDE / USDT", version: "v4", fee: "0.0045%", apr: "1.53%", bonus: "+7.04%", color1: "#565D6D", color2: "#26A17B" },
    { id: "usdc-usdt", name: "USDC / USDT", version: "v4", fee: "0.0008%", apr: "1.9%", bonus: "+5.12%", color1: "#2775CA", color2: "#26A17B" },
];

export default function PoolsPage() {
    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Your Positions & Top Pools */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Your Positions */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold">Your positions</h2>
                            <button className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">
                                <Plus className="w-4 h-4" />
                                New position
                            </button>
                        </div>

                        <div className="p-12 rounded-2xl border border-dashed bg-card/30 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center mb-4">
                                <Info className="w-6 h-6 text-secondary-foreground" />
                            </div>
                            <h3 className="font-bold mb-2">No positions</h3>
                            <p className="text-secondary-foreground text-sm max-w-sm mb-6">
                                You don't have any liquidity positions. Create a new position to start earning fees and rewards on eligible pools.
                            </p>
                            <div className="flex gap-4">
                                <button className="px-6 py-2 rounded-xl bg-secondary/50 font-bold text-sm hover:bg-secondary transition-colors">Explore pools</button>
                                <button className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all">New position</button>
                            </div>
                        </div>
                    </section>

                    {/* Top Pools by TVL */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Top pools by TVL</h2>
                            <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer hover:underline">
                                Explore more pools
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="rounded-2xl border bg-card divide-y">
                            {TOP_POOLS.map((pool, i) => (
                                <div key={pool.id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-3">
                                            <div className="w-10 h-10 rounded-full border-4 border-card z-10" style={{ backgroundColor: pool.color1 }} />
                                            <div className="w-10 h-10 rounded-full border-4 border-card" style={{ backgroundColor: pool.color2 }} />
                                        </div>
                                        <div>
                                            <div className="font-bold">{pool.name}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-secondary/50 px-1.5 py-0.5 rounded font-bold uppercase">{pool.version}</span>
                                                <span className="text-[10px] text-secondary-foreground font-bold">{pool.fee}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono font-bold">{pool.apr} APR</div>
                                        <div className="text-[10px] text-secondary-foreground font-bold">TVL: {pool.tvl}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Rewards & Learn */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Pools with rewards */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">Pools with rewards</h2>
                        <div className="space-y-4">
                            {REWARD_POOLS.map((pool) => (
                                <div key={pool.id} className="p-4 rounded-2xl border bg-gradient-to-br from-card to-card/50 hover:border-primary/50 transition-all cursor-pointer">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full border-2 border-card" style={{ backgroundColor: pool.color1 }} />
                                                <div className="w-8 h-8 rounded-full border-2 border-card" style={{ backgroundColor: pool.color2 }} />
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
                                            <div className="text-sm font-mono font-bold">{pool.apr}</div>
                                        </div>
                                        <div className="p-2 rounded-xl bg-primary/5">
                                            <div className="text-[9px] text-primary uppercase font-bold tracking-wider mb-0.5">Bonus</div>
                                            <div className="text-sm font-mono font-bold text-primary">{pool.bonus}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="text-center">
                                <button className="text-sm font-bold text-secondary-foreground hover:text-foreground transition-colors">
                                    Explore Unichain pools →
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Learn Section */}
                    <section className="p-6 rounded-2xl bg-secondary/20 border-none space-y-4">
                        <h3 className="font-bold">Learn about liquidity provision</h3>
                        <div className="space-y-3">
                            {[
                                "Providing liquidity on different protocols",
                                "Hooks on Uniswap v4",
                                "Understanding fees and rewards",
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
        </main>
    );
}
