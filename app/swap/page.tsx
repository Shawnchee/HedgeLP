"use client";

import { Header } from "@/components/header";
import { Settings, ChevronDown, Info, Search, Zap, TrendingUp, ArrowUpDown, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import { WalletButton } from "@/components/wallet-button";
import { useTokenPrices, useExchangeRate, formatCurrency, SUPPORTED_TOKENS } from "@/hooks/use-market-data";
import { useMockSwap } from "@/hooks/use-mock-transaction";

interface Token {
    id: string;
    symbol: string;
    name: string;
    balance: string;
    color: string;
    decimals: number;
}

// Token list with CoinGecko IDs for real prices
const SWAP_TOKENS: Token[] = [
    { id: "ethereum", symbol: "ETH", name: "Ethereum", balance: "1.24", color: "#627EEA", decimals: 18 },
    { id: "usd-coin", symbol: "USDC", name: "USD Coin", balance: "2,450.00", color: "#2775CA", decimals: 6 },
    { id: "tether", symbol: "USDT", name: "Tether", balance: "500.00", color: "#26A17B", decimals: 6 },
    { id: "dai", symbol: "DAI", name: "Dai", balance: "120.00", color: "#F5AC37", decimals: 18 },
    { id: "uniswap", symbol: "UNI", name: "Uniswap", balance: "0.00", color: "#FF007A", decimals: 18 },
    { id: "wrapped-bitcoin", symbol: "WBTC", name: "Wrapped Bitcoin", balance: "0.05", color: "#F7931A", decimals: 8 },
    { id: "chainlink", symbol: "LINK", name: "Chainlink", balance: "25.00", color: "#375BD2", decimals: 18 },
    { id: "arbitrum", symbol: "ARB", name: "Arbitrum", balance: "150.00", color: "#28A0F0", decimals: 18 },
    { id: "optimism", symbol: "OP", name: "Optimism", balance: "0.00", color: "#FF0420", decimals: 18 },
    { id: "aave", symbol: "AAVE", name: "Aave", balance: "0.00", color: "#B6509E", decimals: 18 },
];

type SwapStep = "idle" | "confirming" | "signing" | "pending" | "success" | "error";

export default function SwapPage() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const [sellAmount, setSellAmount] = useState("");
    const [sellToken, setSellToken] = useState<Token>(SWAP_TOKENS[0]); // ETH
    const [buyToken, setBuyToken] = useState<Token | null>(null);
    const [tokenSelectMode, setTokenSelectMode] = useState<"sell" | "buy" | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [slippage, setSlippage] = useState(0.5);
    const [showSettings, setShowSettings] = useState(false);
    
    // Mock transaction hook for genuine wallet signing
    const { 
        swap, 
        status: swapStatus, 
        txHash, 
        error: swapError, 
        reset: resetSwap,
        isLoading: swapLoading,
        isRejected 
    } = useMockSwap({
        onSuccess: () => {
            // Clear form on success
            setSellAmount("");
        }
    });
    
    // Map status to swapStep for backward compatibility
    const swapStep: SwapStep = swapStatus === "rejected" ? "error" : swapStatus;
    const errorMessage = isRejected ? "Transaction cancelled by user" : swapError;

    // Fetch real prices
    const { data: tokenPrices, isLoading: pricesLoading } = useTokenPrices();
    const { data: exchangeRate, isLoading: rateLoading, refetch: refetchRate } = useExchangeRate(
        sellToken.id, 
        buyToken?.id || ""
    );

    // Get real-time prices for tokens
    const getTokenPrice = (tokenId: string): number => {
        if (!tokenPrices) return 0;
        const token = tokenPrices.find(t => t.id === tokenId);
        return token?.current_price || 0;
    };

    // Calculate buy amount with real rates
    const calculatedBuyAmount = useMemo(() => {
        if (!sellAmount || !buyToken || !exchangeRate) return "";
        const amount = parseFloat(sellAmount) * exchangeRate.rate;
        return amount.toFixed(6);
    }, [sellAmount, buyToken, exchangeRate]);

    // USD values
    const sellUsdValue = useMemo(() => {
        if (!sellAmount || !exchangeRate) return 0;
        return parseFloat(sellAmount) * exchangeRate.fromPrice;
    }, [sellAmount, exchangeRate]);

    const buyUsdValue = useMemo(() => {
        if (!calculatedBuyAmount || !exchangeRate) return 0;
        return parseFloat(calculatedBuyAmount) * exchangeRate.toPrice;
    }, [calculatedBuyAmount, exchangeRate]);

    // Price impact calculation
    const priceImpact = useMemo(() => {
        if (!sellUsdValue || !buyUsdValue) return 0;
        const impact = ((sellUsdValue - buyUsdValue) / sellUsdValue) * 100;
        return Math.max(0, impact);
    }, [sellUsdValue, buyUsdValue]);

    // Filter tokens based on search query
    const filteredTokens = useMemo(() => {
        if (!searchQuery) return SWAP_TOKENS;
        const query = searchQuery.toLowerCase();
        return SWAP_TOKENS.filter(
            t => t.symbol.toLowerCase().includes(query) || t.name.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    // Switch tokens (two-way swap)
    const handleSwitchTokens = () => {
        if (buyToken) {
            const tempToken = sellToken;
            setSellToken(buyToken);
            setBuyToken(tempToken);
            setSellAmount(calculatedBuyAmount);
        }
    };

    // Handle token selection
    const handleSelectToken = (token: Token) => {
        if (tokenSelectMode === "sell") {
            if (buyToken?.symbol === token.symbol) {
                setBuyToken(sellToken);
            }
            setSellToken(token);
        } else if (tokenSelectMode === "buy") {
            if (sellToken.symbol === token.symbol) {
                setSellToken(buyToken || SWAP_TOKENS[0]);
            }
            setBuyToken(token);
        }
        setTokenSelectMode(null);
        setSearchQuery("");
    };

    // Handle swap with genuine wallet signing
    const handleSwap = async () => {
        if (!isConnected || !buyToken || !sellAmount || parseFloat(sellAmount) <= 0) return;
        
        // Use mock swap hook which triggers real wallet signing
        await swap({
            fromToken: sellToken.symbol,
            toToken: buyToken.symbol,
            fromAmount: sellAmount,
            toAmount: calculatedBuyAmount,
        });
    };

    // Reset transaction state
    const resetTransaction = () => {
        resetSwap();
    };

    // Minimum received with slippage
    const minReceived = useMemo(() => {
        if (!calculatedBuyAmount) return "0";
        const amount = parseFloat(calculatedBuyAmount) * (1 - slippage / 100);
        return amount.toFixed(6);
    }, [calculatedBuyAmount, slippage]);

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
                        <div className="flex items-center gap-2">
                            {rateLoading && (
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            )}
                            <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
                            >
                                <Settings className="w-4 h-4 text-secondary-foreground" />
                            </button>
                        </div>
                    </div>

                    {/* Settings Dropdown */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-4 rounded-2xl bg-secondary/20 overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-bold">Max Slippage</span>
                                    <span className="text-sm font-mono font-bold text-primary">{slippage}%</span>
                                </div>
                                <div className="flex gap-2">
                                    {[0.1, 0.5, 1.0].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setSlippage(s)}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                                                slippage === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 hover:bg-secondary'
                                            }`}
                                        >
                                            {s}%
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        value={slippage}
                                        onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                                        className="w-20 py-2 px-3 rounded-xl bg-secondary/50 text-sm font-mono font-bold text-center outline-none focus:ring-1 focus:ring-primary"
                                        step="0.1"
                                        min="0.1"
                                        max="50"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-1 relative">
                        {/* Sell Card */}
                        <div className="p-4 rounded-2xl bg-secondary/20 border-none group focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-secondary-foreground">Sell</span>
                                <button 
                                    onClick={() => setSellAmount(sellToken.balance.replace(/,/g, ''))}
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
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/[^0-9.]/g, '');
                                        setSellAmount(value);
                                    }}
                                    className="bg-transparent border-none outline-none text-4xl font-mono p-0 w-full"
                                />
                                <button
                                    onClick={() => setTokenSelectMode("sell")}
                                    className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-2xl transition-colors shrink-0"
                                >
                                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: sellToken.color }} />
                                    <span className="font-bold">{sellToken.symbol}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-secondary-foreground">
                                    {pricesLoading ? (
                                        <span className="animate-pulse">Loading...</span>
                                    ) : (
                                        `$${sellUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                    )}
                                </span>
                                <span className="text-xs text-secondary-foreground">
                                    Balance: {sellToken.balance} {sellToken.symbol}
                                </span>
                            </div>
                        </div>

                        {/* Switch Button */}
                        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 z-10">
                            <motion.button
                                whileHover={{ rotate: 180 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                onClick={handleSwitchTokens}
                                className="w-10 h-10 bg-card border-4 border-background rounded-xl flex items-center justify-center cursor-pointer hover:bg-secondary transition-colors shadow-sm"
                                title="Switch tokens"
                            >
                                <ArrowUpDown className="w-4 h-4 text-primary" />
                            </motion.button>
                        </div>

                        {/* Buy Card */}
                        <div className="p-4 rounded-2xl bg-secondary/20 border-none group focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-secondary-foreground">Buy</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-4xl font-mono w-full">
                                    {rateLoading ? (
                                        <Loader2 className="w-6 h-6 animate-spin text-secondary-foreground" />
                                    ) : (
                                        calculatedBuyAmount || "0"
                                    )}
                                </div>
                                <button
                                    onClick={() => setTokenSelectMode("buy")}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all shrink-0 ${
                                        buyToken 
                                            ? 'bg-secondary/50 hover:bg-secondary' 
                                            : 'bg-primary text-primary-foreground hover:opacity-90'
                                    }`}
                                >
                                    {buyToken ? (
                                        <>
                                            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: buyToken.color }} />
                                            <span className="font-bold">{buyToken.symbol}</span>
                                        </>
                                    ) : (
                                        <span className="font-bold">Select token</span>
                                    )}
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-xs text-secondary-foreground">
                                    ${buyUsdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-secondary-foreground">
                                    Balance: {buyToken?.balance || '0'} {buyToken?.symbol || ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Exchange Rate & Details */}
                    {buyToken && exchangeRate && (
                        <div className="mt-3 p-3 rounded-xl bg-secondary/10 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-secondary-foreground">
                                    <Zap className="w-3 h-3 text-success" />
                                    <span>Rate</span>
                                </div>
                                <span className="font-mono font-bold">
                                    1 {sellToken.symbol} = {exchangeRate.rate.toFixed(6)} {buyToken.symbol}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary-foreground">Min. received</span>
                                <span className="font-mono">{minReceived} {buyToken.symbol}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary-foreground">Price impact</span>
                                <span className={`font-mono ${priceImpact > 1 ? 'text-warning' : 'text-success'}`}>
                                    {priceImpact.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-secondary-foreground">Network fee</span>
                                <span className="font-mono">~$2.50</span>
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <div className="mt-4">
                            <WalletButton />
                        </div>
                    ) : !buyToken ? (
                        <button 
                            className="w-full mt-4 py-4 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold text-lg cursor-not-allowed"
                            disabled
                        >
                            Select a token
                        </button>
                    ) : !sellAmount || parseFloat(sellAmount) <= 0 ? (
                        <button 
                            className="w-full mt-4 py-4 rounded-2xl bg-secondary/50 text-secondary-foreground font-bold text-lg cursor-not-allowed"
                            disabled
                        >
                            Enter an amount
                        </button>
                    ) : (
                        <button 
                            onClick={handleSwap}
                            disabled={swapStep !== "idle"}
                            className="w-full mt-4 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            {swapStep === "idle" ? "Swap" : "Processing..."}
                        </button>
                    )}
                </div>

                {/* Price Impact Warning */}
                {buyToken && priceImpact > 3 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-2xl border border-warning/30 bg-warning/5 flex items-start gap-3"
                    >
                        <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold text-sm text-warning">High Price Impact</div>
                            <div className="text-xs text-secondary-foreground">
                                This trade has a price impact of {priceImpact.toFixed(2)}%. Consider reducing your trade size.
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Data attribution */}
                <div className="mt-4 text-center text-xs text-secondary-foreground">
                    Live prices from CoinGecko • Refreshes every 15 seconds
                </div>
            </motion.div>

            {/* Token Select Modal */}
            <AnimatePresence>
                {tokenSelectMode && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setTokenSelectMode(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[420px] bg-card border rounded-3xl p-6 z-[101] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">
                                    Select a token to {tokenSelectMode}
                                </h3>
                                <button 
                                    onClick={() => setTokenSelectMode(null)} 
                                    className="text-secondary-foreground hover:text-foreground"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="relative mb-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search name or paste address"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-secondary/30 rounded-2xl outline-none focus:ring-1 focus:ring-primary transition-all"
                                />
                            </div>
                            
                            {/* Popular tokens */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {SWAP_TOKENS.slice(0, 6).map((t) => {
                                    const isSelected = tokenSelectMode === "sell" 
                                        ? t.symbol === sellToken.symbol 
                                        : t.symbol === buyToken?.symbol;
                                    const isDisabled = tokenSelectMode === "sell" 
                                        ? t.symbol === buyToken?.symbol 
                                        : t.symbol === sellToken.symbol;
                                    
                                    const tokenPrice = getTokenPrice(t.id);
                                    
                                    return (
                                        <button 
                                            key={t.symbol} 
                                            onClick={() => !isDisabled && handleSelectToken(t)}
                                            disabled={isDisabled}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
                                                isSelected 
                                                    ? 'bg-primary/10 border-primary' 
                                                    : isDisabled 
                                                        ? 'opacity-40 cursor-not-allowed' 
                                                        : 'hover:bg-secondary/50'
                                            }`}
                                        >
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} />
                                            <span className="font-bold text-xs">{t.symbol}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            
                            {/* Token list */}
                            <div className="space-y-1 -mx-2 max-h-[300px] overflow-y-auto pr-2">
                                {filteredTokens.map((token) => {
                                    const isSelected = tokenSelectMode === "sell" 
                                        ? token.symbol === sellToken.symbol 
                                        : token.symbol === buyToken?.symbol;
                                    const isOtherSide = tokenSelectMode === "sell" 
                                        ? token.symbol === buyToken?.symbol 
                                        : token.symbol === sellToken.symbol;
                                    
                                    const tokenPrice = getTokenPrice(token.id);
                                    
                                    return (
                                        <motion.button
                                            key={token.symbol}
                                            onClick={() => handleSelectToken(token)}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-primary/10 border border-primary' 
                                                    : isOtherSide
                                                        ? 'opacity-50 hover:bg-secondary/20'
                                                        : 'hover:bg-secondary/30'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full" style={{ backgroundColor: token.color }} />
                                                <div className="text-left">
                                                    <div className="font-bold">{token.name}</div>
                                                    <div className="text-[10px] text-secondary-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                                                        {token.symbol}
                                                        {tokenPrice > 0 && (
                                                            <span className="text-[10px] text-secondary-foreground/50">
                                                                ${tokenPrice.toLocaleString(undefined, { maximumFractionDigits: tokenPrice < 1 ? 4 : 2 })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-mono font-bold">{token.balance}</div>
                                                <div className="text-[10px] text-secondary-foreground">
                                                    ${(parseFloat(token.balance.replace(/,/g, '')) * (tokenPrice || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                                
                                {filteredTokens.length === 0 && (
                                    <div className="text-center py-8 text-secondary-foreground">
                                        No tokens found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Transaction Modal */}
            <AnimatePresence>
                {swapStep !== "idle" && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[380px] bg-card border rounded-3xl p-8 z-[201] shadow-2xl"
                        >
                            {swapStep === "confirming" && (
                                <div className="text-center">
                                    <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                                    <h3 className="text-xl font-bold mb-2">Confirm Swap</h3>
                                    <p className="text-secondary-foreground text-sm mb-6">
                                        Swapping {sellAmount} {sellToken.symbol} for {calculatedBuyAmount} {buyToken?.symbol}
                                    </p>
                                    <div className="p-4 rounded-xl bg-secondary/20 text-sm">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-secondary-foreground">Rate</span>
                                            <span className="font-mono">1 {sellToken.symbol} = {exchangeRate?.rate.toFixed(4)} {buyToken?.symbol}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-secondary-foreground">Min. received</span>
                                            <span className="font-mono">{minReceived} {buyToken?.symbol}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {swapStep === "signing" && (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Waiting for Signature</h3>
                                    <p className="text-secondary-foreground text-sm">
                                        Please confirm this transaction in your wallet
                                    </p>
                                </div>
                            )}

                            {swapStep === "pending" && (
                                <div className="text-center">
                                    <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
                                    <h3 className="text-xl font-bold mb-2">Transaction Pending</h3>
                                    <p className="text-secondary-foreground text-sm mb-4">
                                        Waiting for blockchain confirmation...
                                    </p>
                                    {txHash && (
                                        <a
                                            href={`https://arbiscan.io/tx/${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                                        >
                                            View on Explorer
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            )}

                            {swapStep === "success" && (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-success" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Swap Successful!</h3>
                                    <p className="text-secondary-foreground text-sm mb-6">
                                        You received {calculatedBuyAmount} {buyToken?.symbol}
                                    </p>
                                    {txHash && (
                                        <a
                                            href={`https://arbiscan.io/tx/${txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-xs text-primary hover:underline mb-6"
                                        >
                                            View on Explorer
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    <button
                                        onClick={resetTransaction}
                                        className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}

                            {swapStep === "error" && (
                                <div className="text-center">
                                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                                        <AlertCircle className="w-8 h-8 text-destructive" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Transaction Failed</h3>
                                    <p className="text-secondary-foreground text-sm mb-6">
                                        {errorMessage || "Something went wrong. Please try again."}
                                    </p>
                                    <button
                                        onClick={resetTransaction}
                                        className="w-full py-3 rounded-2xl bg-secondary/50 font-bold hover:bg-secondary transition-all"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
