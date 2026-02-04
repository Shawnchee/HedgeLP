"use client";

import { Header } from "@/components/header";
import { ArrowDown, Settings, ChevronDown, Info, Search, Zap } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const POPULAR_TOKENS = [
    { symbol: "ETH", name: "Ethereum", balance: "1.24", color: "#627EEA" },
    { symbol: "USDC", name: "USD Coin", balance: "2,450.00", color: "#2775CA" },
    { symbol: "UNI", name: "Uniswap", balance: "0.00", color: "#FF007A" },
    { symbol: "WBTC", name: "Wrapped Bitcoin", balance: "0.05", color: "#F7931A" },
];

export default function SwapPage() {
    const [sellAmount, setSellAmount] = useState("");
    const [buyAmount, setBuyAmount] = useState("");
    const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false);

    return (
        <main className="min-h-screen pt-32 bg-background text-foreground flex flex-col items-center">
            <Header />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[480px] p-2"
            >
                <div className="bg-card border rounded-3xl p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <nav className="flex items-center gap-4">
                            <span className="font-bold cursor-pointer">Swap</span>
                            <span className="text-secondary-foreground font-bold cursor-not-allowed opacity-50">Limit</span>
                            <span className="text-secondary-foreground font-bold cursor-not-allowed opacity-50">Send</span>
                        </nav>
                        <Settings className="w-4 h-4 text-secondary-foreground cursor-pointer hover:text-foreground transition-colors" />
                    </div>

                    <div className="space-y-1 relative">
                        {/* Sell Card */}
                        <div className="p-4 rounded-2xl bg-secondary/20 border-none group focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-secondary-foreground">Sell</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={sellAmount}
                                    onChange={(e) => setSellAmount(e.target.value)}
                                    className="bg-transparent border-none outline-none text-4xl font-mono p-0 w-full"
                                />
                                <button
                                    onClick={() => setIsTokenSelectOpen(true)}
                                    className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-2xl transition-colors shrink-0"
                                >
                                    <div className="w-6 h-6 rounded-full bg-[#627EEA]" />
                                    <span className="font-bold">ETH</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-secondary-foreground">$2,314.87</span>
                                <span className="text-xs text-secondary-foreground">Balance: 1.24 ETH</span>
                            </div>
                        </div>

                        {/* Switch Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10">
                            <div className="w-10 h-10 bg-card border-4 border-background rounded-xl flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors shadow-sm">
                                <ArrowDown className="w-4 h-4 text-primary" />
                            </div>
                        </div>

                        {/* Buy Card */}
                        <div className="p-4 rounded-2xl bg-secondary/20 border-none group focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-secondary-foreground">Buy</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <input
                                    type="text"
                                    placeholder="0"
                                    value={buyAmount}
                                    onChange={(e) => setBuyAmount(e.target.value)}
                                    className="bg-transparent border-none outline-none text-4xl font-mono p-0 w-full"
                                />
                                <button
                                    onClick={() => setIsTokenSelectOpen(true)}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-2xl hover:opacity-90 transition-opacity shrink-0"
                                >
                                    <span className="font-bold">Select token</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <span className="text-xs text-secondary-foreground">Balance: 0</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-1 px-4 py-2">
                        <div className="flex items-center justify-between text-xs text-secondary-foreground group cursor-pointer hover:text-foreground">
                            <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-warning" />
                                <span>1 ETH = 2,314 USDC</span>
                                <span className="text-[10px] text-secondary-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">($1.00)</span>
                            </div>
                            <Info className="w-3 h-3" />
                        </div>
                    </div>

                    <button className="w-full mt-2 py-4 rounded-2xl bg-primary/10 text-primary font-bold text-lg hover:bg-primary/20 transition-colors">
                        Connect Wallet
                    </button>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                    <div className="p-4 rounded-2xl border bg-card/30 flex items-center justify-between cursor-pointer hover:bg-card/50 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                                <TrendingUp className="w-4 h-4 text-success" />
                            </div>
                            <span className="text-sm font-bold">Price Impact</span>
                        </div>
                        <span className="text-sm text-success font-mono font-bold">0.05%</span>
                    </div>
                </div>
            </motion.div>

            {/* Token Select Modal */}
            <AnimatePresence>
                {isTokenSelectOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsTokenSelectOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-card border rounded-3xl p-6 z-[101] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Select a token</h3>
                                <button onClick={() => setIsTokenSelectOpen(false)} className="text-secondary-foreground hover:text-foreground">✕</button>
                            </div>
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search name or paste address"
                                    className="w-full pl-10 pr-4 py-3 bg-secondary/30 rounded-2xl outline-none focus:ring-1 focus:ring-primary transition-all"
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                                {POPULAR_TOKENS.slice(0, 4).map((t) => (
                                    <button key={t.symbol} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border hover:bg-secondary/50 transition-colors">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                                        <span className="font-bold text-xs">{t.symbol}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-1 -mx-2 max-h-[300px] overflow-y-auto pr-2">
                                {POPULAR_TOKENS.map((token) => (
                                    <div key={token.symbol} className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/30 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full" style={{ backgroundColor: token.color }} />
                                            <div>
                                                <div className="font-bold">{token.name}</div>
                                                <div className="text-[10px] text-secondary-foreground font-bold uppercase tracking-wider">{token.symbol}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-mono font-bold">{token.balance}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
