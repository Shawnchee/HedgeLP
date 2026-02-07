"use client";

import { Header } from "@/components/header";
import { WalletButton } from "@/components/wallet-button";
import {
    ArrowUpRight,
    ArrowDownRight,
    ChevronDown,
    Info,
    TrendingUp,
    Activity,
    Globe,
    Twitter,
    ArrowUpDown,
    Loader2,
    RefreshCw,
    ExternalLink
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
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import {
    useTokenPrice,
    useTokenChart,
    useExchangeRate,
    formatCurrency,
    SUPPORTED_TOKENS,
    type TimeFrame
} from "@/hooks/use-market-data";

const TIMEFRAMES: { label: string; value: TimeFrame }[] = [
    { label: "1H", value: "1h" },
    { label: "1D", value: "24h" },
    { label: "1W", value: "7d" },
    { label: "1M", value: "30d" },
    { label: "3M", value: "90d" },
    { label: "1Y", value: "1y" },
];

const SWAP_TOKENS = [
    { id: "ethereum", symbol: "ETH", name: "Ethereum", color: "#627EEA", image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/eth.svg" },
    { id: "usd-coin", symbol: "USDC", name: "USD Coin", color: "#2775CA", image: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png" },
    { id: "tether", symbol: "USDT", name: "Tether", color: "#26A17B", image: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png" },
    { id: "dai", symbol: "DAI", name: "Dai", color: "#F5AC37", image: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/dai.svg" },
];

export default function TokenDetailPage() {
    const { id } = useParams();
    const { isConnected } = useAccount();
    const [timeframe, setTimeframe] = useState<TimeFrame>("7d");
    const [sellAmount, setSellAmount] = useState("");
    const [sellToken, setSellToken] = useState(SWAP_TOKENS[0]);
    const [buyToken, setBuyToken] = useState<typeof SWAP_TOKENS[0] | null>(null);
    const [showTokenSelector, setShowTokenSelector] = useState<"sell" | "buy" | null>(null);

    // Fetch real data
    const { data: token, isLoading: tokenLoading, refetch } = useTokenPrice(id as string);
    const { data: chartData, isLoading: chartLoading } = useTokenChart(id as string, timeframe);
    const { data: exchangeRate } = useExchangeRate(sellToken.id, buyToken?.id || "");

    // Calculate buy amount
    const buyAmount = useMemo(() => {
        if (!sellAmount || !exchangeRate) return "";
        const amount = parseFloat(sellAmount) * exchangeRate.rate;
        return amount.toFixed(6);
    }, [sellAmount, exchangeRate]);

    // Switch tokens
    const handleSwitchTokens = () => {
        if (buyToken) {
            const temp = sellToken;
            setSellToken(buyToken);
            setBuyToken(temp);
            setSellAmount(buyAmount);
        }
    };

    // Token config fallback
    const tokenConfig: { id: string; symbol: string; name: string; color: string; decimals: number; image: string } =
        Object.values(SUPPORTED_TOKENS).find(t => t.id === id) ?? {
            id: id as string,
            symbol: "TOKEN",
            name: "Token",
            color: "#627EEA",
            decimals: 18,
            image: "https://via.placeholder.com/48/627EEA/ffffff?text=TOKEN"
        };

    // Price change color
    const priceChange = token?.price_change_percentage_24h || 0;
    const isPositive = priceChange >= 0;

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Chart & Stats */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Token Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <img
                                src={token?.image || tokenConfig.image || `https://via.placeholder.com/48/${tokenConfig.color.slice(1)}/ffffff?text=${tokenConfig.symbol}`}
                                alt={token?.symbol || tokenConfig.symbol}
                                className="w-12 h-12 rounded-full"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                            <div
                                className="w-12 h-12 rounded-full hidden"
                                style={{ backgroundColor: token?.color || tokenConfig.color }}
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-3xl font-bold">
                                        {tokenLoading ? (
                                            <span className="animate-pulse bg-secondary/50 rounded w-32 h-8 inline-block" />
                                        ) : (
                                            token?.name || tokenConfig.name
                                        )}
                                    </h1>
                                    <span className="text-secondary-foreground font-bold uppercase">
                                        {token?.symbol || tokenConfig.symbol}
                                    </span>
                                    <button
                                        onClick={() => refetch()}
                                        className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4 text-secondary-foreground" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {tokenLoading ? (
                                        <span className="animate-pulse bg-secondary/50 rounded w-24 h-7 inline-block" />
                                    ) : (
                                        <>
                                            <span className="text-2xl font-mono font-bold">
                                                ${token?.current_price.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: token?.current_price < 1 ? 6 : 2
                                                })}
                                            </span>
                                            <span className={`text-sm font-bold flex items-center gap-0.5 ${isPositive ? "text-success" : "text-destructive"}`}>
                                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {Math.abs(priceChange).toFixed(2)}%
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Timeframe Selector */}
                        <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf.value}
                                    onClick={() => setTimeframe(tf.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === tf.value
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-secondary-foreground hover:text-foreground"
                                        }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Large Price Chart */}
                    <motion.div
                        key={timeframe}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-[400px] w-full bg-card rounded-3xl border p-6 relative group overflow-hidden"
                    >
                        {chartLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : chartData && chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isPositive ? "#27D545" : "#FD3B4C"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={isPositive ? "#27D545" : "#FD3B4C"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis
                                        dataKey="time"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#98A1C0' }}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis
                                        hide
                                        domain={['dataMin * 0.99', 'dataMax * 1.01']}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-popover border p-3 rounded-xl shadow-2xl outline-none">
                                                        <p className="text-lg font-mono font-bold">
                                                            ${payload[0].value?.toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-secondary-foreground uppercase font-bold tracking-widest">
                                                            {payload[0].payload.time}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={isPositive ? "#27D545" : "#FD3B4C"}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorVal)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-secondary-foreground">
                                No chart data available
                            </div>
                        )}
                    </motion.div>

                    {/* Token Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Market Cap", value: token ? formatCurrency(token.market_cap, true) : "—" },
                            { label: "24H Volume", value: token ? formatCurrency(token.total_volume, true) : "—" },
                            { label: "Circulating Supply", value: token ? `${(token.circulating_supply / 1e6).toFixed(1)}M` : "—" },
                            { label: "7D Change", value: token ? `${token.price_change_percentage_7d?.toFixed(2) || 0}%` : "—" },
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
                                <div className="text-sm font-mono font-bold">{stat.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* About Token */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold">About {token?.name || tokenConfig.name}</h2>
                        <p className="text-secondary-foreground leading-relaxed text-sm">
                            {token?.name || tokenConfig.name} ({token?.symbol?.toUpperCase() || tokenConfig.symbol}) is a cryptocurrency
                            traded on decentralized exchanges. View real-time price charts, market data, and trading information.
                        </p>
                        <div className="flex gap-4">
                            <a
                                href={`https://www.coingecko.com/en/coins/${id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-bold text-secondary-foreground hover:text-foreground transition-colors"
                            >
                                <ExternalLink className="w-3 h-3" />
                                View on CoinGecko
                            </a>
                        </div>
                    </section>
                </div>

                {/* Right Column: Swap Widget */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-card border rounded-3xl p-4 shadow-xl sticky top-24">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <span className="font-bold">Swap</span>
                            <div className="flex items-center gap-2 text-secondary-foreground">
                                <span className="text-[10px] font-bold text-success">Live Rates</span>
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>

                        <div className="space-y-1 relative">
                            {/* Sell */}
                            <div className="p-4 rounded-2xl bg-secondary/20 border-none group transition-all">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-secondary-foreground">Sell</span>
                                    <button
                                        onClick={() => setSellAmount("1")}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <input
                                        type="text"
                                        placeholder="0"
                                        value={sellAmount}
                                        onChange={(e) => setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                        className="bg-transparent border-none outline-none text-2xl font-mono p-0 w-full"
                                    />
                                    <button
                                        onClick={() => setShowTokenSelector("sell")}
                                        className="flex items-center gap-2 bg-secondary/50 px-2 py-1.5 rounded-xl text-xs font-bold hover:bg-secondary transition-colors"
                                    >
                                        <img src={sellToken.image} alt={sellToken.symbol} className="w-4 h-4 rounded-full" onError={(e) => e.currentTarget.style.backgroundColor = sellToken.color} />
                                        {sellToken.symbol}
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="text-xs text-secondary-foreground mt-2">
                                    ≈ ${sellAmount ? (parseFloat(sellAmount) * (exchangeRate?.fromPrice || 0)).toLocaleString() : '0.00'}
                                </div>
                            </div>

                            {/* Switch */}
                            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10">
                                <motion.button
                                    whileHover={{ rotate: 180 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleSwitchTokens}
                                    className="w-8 h-8 bg-card border-4 border-background rounded-lg flex items-center justify-center cursor-pointer hover:bg-secondary transition-all"
                                >
                                    <ArrowUpDown className="w-3 h-3 text-primary" />
                                </motion.button>
                            </div>

                            {/* Buy */}
                            <div className="p-4 rounded-2xl bg-secondary/20 border-none group transition-all">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-secondary-foreground">Buy</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="text-2xl font-mono">
                                        {buyToken ? (buyAmount || "0") : "0"}
                                    </div>
                                    <button
                                        onClick={() => setShowTokenSelector("buy")}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors ${buyToken ? 'bg-secondary/50 hover:bg-secondary' : 'bg-primary text-primary-foreground'
                                            }`}
                                    >
                                        {buyToken ? (
                                            <>
                                                <img src={buyToken.image} alt={buyToken.symbol} className="w-4 h-4 rounded-full" onError={(e) => e.currentTarget.style.backgroundColor = buyToken.color} />
                                                {buyToken.symbol}
                                            </>
                                        ) : (
                                            "Select token"
                                        )}
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="text-xs text-secondary-foreground mt-2">
                                    ≈ ${buyAmount && exchangeRate ? (parseFloat(buyAmount) * exchangeRate.toPrice).toLocaleString() : '0.00'}
                                </div>
                            </div>
                        </div>

                        {/* Exchange Rate */}
                        {exchangeRate && buyToken && (
                            <div className="mt-2 px-4 py-2 text-xs text-secondary-foreground flex items-center justify-between">
                                <span>1 {sellToken.symbol} = {exchangeRate.rate.toFixed(6)} {buyToken.symbol}</span>
                                <Info className="w-3 h-3" />
                            </div>
                        )}

                        {/* Action Button */}
                        {!isConnected ? (
                            <div className="mt-4">
                                <WalletButton />
                            </div>
                        ) : !buyToken ? (
                            <button
                                disabled
                                className="w-full mt-4 py-3 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold cursor-not-allowed"
                            >
                                Select a token
                            </button>
                        ) : !sellAmount || parseFloat(sellAmount) <= 0 ? (
                            <button
                                disabled
                                className="w-full mt-4 py-3 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold cursor-not-allowed"
                            >
                                Enter an amount
                            </button>
                        ) : (
                            <button className="w-full mt-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                                Swap
                            </button>
                        )}

                        <div className="mt-4 p-4 rounded-2xl bg-secondary/10 flex flex-col gap-2">
                            <div className="flex justify-between text-[10px] font-bold text-secondary-foreground uppercase">
                                <span>Network Cost</span>
                                <span className="text-foreground">~$2.34</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-secondary-foreground uppercase">
                                <span>Price Impact</span>
                                <span className="text-success">&lt;0.01%</span>
                            </div>
                        </div>
                    </div>

                    {/* HedgeLP CTA */}
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            <h3 className="font-bold text-sm">HedgeLP Strategy</h3>
                        </div>
                        <p className="text-xs text-secondary-foreground leading-relaxed mb-4">
                            Earn yield on this asset while protecting against price volatility. Our strategy maintains a delta-neutral position for high-APY liquidity provision.
                        </p>
                        <button
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-all"
                        >
                            Deposit to Vault
                        </button>
                    </div>
                </div>
            </div>

            {/* Token Selector Modal */}
            <AnimatePresence>
                {showTokenSelector && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTokenSelector(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[380px] bg-card border rounded-3xl p-6 z-[101] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold">
                                    Select token to {showTokenSelector}
                                </h3>
                                <button
                                    onClick={() => setShowTokenSelector(null)}
                                    className="text-secondary-foreground hover:text-foreground"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2">
                                {SWAP_TOKENS.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => {
                                            if (showTokenSelector === "sell") {
                                                setSellToken(t);
                                            } else {
                                                setBuyToken(t);
                                            }
                                            setShowTokenSelector(null);
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors"
                                    >
                                        <img src={t.image} alt={t.symbol} className="w-8 h-8 rounded-full" onError={(e) => e.currentTarget.style.backgroundColor = t.color} />
                                        <div className="text-left">
                                            <div className="font-bold">{t.name}</div>
                                            <div className="text-xs text-secondary-foreground">{t.symbol}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
