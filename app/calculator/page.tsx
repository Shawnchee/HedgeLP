"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { AllocationDonut } from "@/components/allocation-donut";
import { CompoundingChart } from "@/components/compounding-chart";
import { 
    Calculator, 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Info, 
    ChevronDown,
    Sparkles,
    RefreshCw,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Scenario = "bull" | "sideways" | "bear" | "custom";

// Accurate calculation functions
function calculateImpermanentLoss(priceRatio: number): number {
    // IL formula: 2 * sqrt(priceRatio) / (1 + priceRatio) - 1
    // priceRatio = newPrice / oldPrice
    if (priceRatio <= 0) return 0;
    const sqrtRatio = Math.sqrt(priceRatio);
    const il = (2 * sqrtRatio) / (1 + priceRatio) - 1;
    return Math.abs(il); // Return as positive loss
}

function calculateCompoundedReturn(
    principal: number,
    dailyRate: number,
    days: number,
    compoundFrequency: "daily" | "weekly" | "monthly" | "none"
): number {
    if (compoundFrequency === "none") {
        // Simple interest
        return principal * dailyRate * days;
    }

    let periodsPerYear: number;
    switch (compoundFrequency) {
        case "daily":
            periodsPerYear = 365;
            break;
        case "weekly":
            periodsPerYear = 52;
            break;
        case "monthly":
            periodsPerYear = 12;
            break;
        default:
            periodsPerYear = 365;
    }

    const annualRate = dailyRate * 365;
    const periods = (days / 365) * periodsPerYear;
    const ratePerPeriod = annualRate / periodsPerYear;
    
    // Compound interest: P * (1 + r/n)^(n*t) - P
    const finalValue = principal * Math.pow(1 + ratePerPeriod, periods);
    return finalValue - principal;
}

export default function CalculatorPage() {
    // User inputs
    const [investment, setInvestment] = useState(10000);
    const [days, setDays] = useState(90);
    const [lpPercent, setLpPercent] = useState(80);
    const [scenario, setScenario] = useState<Scenario>("sideways");
    const [customPriceChange, setCustomPriceChange] = useState(0);
    const [lpApr, setLpApr] = useState(100);
    const [fundingRate, setFundingRate] = useState(0.015); // Daily rate as percentage
    const [autoCompound, setAutoCompound] = useState(true);
    const [compoundFrequency, setCompoundFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
    const [showChart, setShowChart] = useState(true);
    // Advanced settings always visible
    const showAdvanced = true;

    const hedgePercent = 100 - lpPercent;

    // Calculate price change based on scenario
    const priceChange = useMemo(() => {
        switch (scenario) {
            case "bull": return 50;
            case "bear": return -30;
            case "sideways": return 0;
            case "custom": return customPriceChange;
        }
    }, [scenario, customPriceChange]);

    // Price ratio for IL calculation (newPrice / oldPrice)
    const priceRatio = 1 + priceChange / 100;

    // Accurate calculations
    const calculations = useMemo(() => {
        const lpAllocation = lpPercent / 100;
        const hedgeAllocation = hedgePercent / 100;
        const daysFraction = days / 365;

        // Daily LP fee rate
        const dailyLpRate = (lpApr / 100) / 365;

        // LP principal value
        const lpPrincipal = investment * lpAllocation;
        const hedgePrincipal = investment * hedgeAllocation;

        // === LP POSITION CALCULATIONS ===
        
        // 1. LP Fees earned (with or without compounding)
        const lpFeesEarned = autoCompound
            ? calculateCompoundedReturn(lpPrincipal, dailyLpRate, days, compoundFrequency)
            : lpPrincipal * (lpApr / 100) * daysFraction;

        // 2. Impermanent Loss
        // For a 50/50 pool, half is volatile asset
        const ilPercent = calculateImpermanentLoss(priceRatio);
        const ilLoss = lpPrincipal * ilPercent;

        // 3. LP price exposure
        // In a 50/50 pool, 50% of LP value is exposed to volatile asset price
        // After IL adjustment, the LP value changes
        const lpValueAfterIL = lpPrincipal * (1 - ilPercent);
        // The volatile portion changes with price
        const volatilePortion = lpValueAfterIL * 0.5;
        const stablePortion = lpValueAfterIL * 0.5;
        // Price change impact on volatile portion
        const lpPriceImpact = volatilePortion * (priceChange / 100);

        // Total LP P&L
        const lpPnL = lpFeesEarned - ilLoss + lpPriceImpact;

        // === HEDGE POSITION CALCULATIONS ===
        
        // 1. Funding costs (daily rate applied)
        const totalFundingCost = hedgePrincipal * (fundingRate / 100) * days;

        // 2. Hedge P&L (short position profits when price drops)
        // Short 1x: profit = -priceChange * position size
        const hedgePositionPnL = hedgePrincipal * (-priceChange / 100);

        // Total Hedge P&L
        const hedgePnL = hedgePositionPnL - totalFundingCost;

        // === TOTAL RETURNS ===
        
        const hedgeLPReturn = lpPnL + hedgePnL;
        const hedgeLPPercent = (hedgeLPReturn / investment) * 100;
        const finalValue = investment + hedgeLPReturn;

        // === COMPARISON: PURE LP ===
        
        const pureLpFees = calculateCompoundedReturn(investment, dailyLpRate, days, autoCompound ? compoundFrequency : "none");
        const pureLpIL = investment * ilPercent;
        const pureLpPriceImpact = investment * 0.5 * (priceChange / 100);
        const pureLPReturn = pureLpFees - pureLpIL + pureLpPriceImpact;
        const pureLPPercent = (pureLPReturn / investment) * 100;

        // === COMPARISON: HODL ===
        
        const hodlReturn = investment * (priceChange / 100);
        const hodlPercent = priceChange;

        // === COMPARISON: NO COMPOUND ===
        
        const noCompoundLpFees = lpPrincipal * (lpApr / 100) * daysFraction;
        const noCompoundReturn = noCompoundLpFees - ilLoss + lpPriceImpact + hedgePositionPnL - totalFundingCost;
        const compoundBonus = autoCompound ? (hedgeLPReturn - noCompoundReturn) : 0;

        // Annualized APY
        const annualizedAPY = hedgeLPPercent > 0 
            ? ((Math.pow(1 + hedgeLPPercent / 100, 365 / days) - 1) * 100)
            : hedgeLPPercent * (365 / days);

        // Daily yield for chart
        const effectiveDailyYield = hedgeLPReturn > 0 
            ? (Math.pow(finalValue / investment, 1 / days) - 1)
            : hedgeLPReturn / (investment * days);

        return {
            // LP breakdown
            lpFeesEarned,
            ilLoss,
            lpPriceImpact,
            lpPnL,
            
            // Hedge breakdown
            hedgePositionPnL,
            totalFundingCost,
            hedgePnL,
            
            // Totals
            hedgeLPReturn,
            hedgeLPPercent,
            finalValue,
            annualizedAPY,
            
            // Comparisons
            pureLPReturn,
            pureLPPercent,
            hodlReturn,
            hodlPercent,
            
            // Compound effect
            compoundBonus,
            noCompoundReturn,
            
            // Chart data
            effectiveDailyYield,
        };
    }, [investment, days, lpPercent, hedgePercent, lpApr, fundingRate, priceChange, priceRatio, autoCompound, compoundFrequency]);

    const formatCurrency = (value: number) => {
        const sign = value >= 0 ? "+" : "";
        return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    return (
        <main className="min-h-screen pt-16 bg-background text-foreground">
            <Header />

            <div className="max-w-6xl mx-auto p-6">
                {/* Title */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                        <Calculator className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">ROI Calculator</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">Estimate Your Returns</h1>
                    <p className="text-secondary-foreground max-w-xl mx-auto">
                        Customize your allocation and simulate performance under different market conditions
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Inputs */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Allocation Donut */}
                        <div className="p-6 rounded-2xl bg-card border">
                            <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-4 block text-center">
                                Allocation Strategy
                            </label>
                            <AllocationDonut
                                lpPercent={lpPercent}
                                onChange={setLpPercent}
                                size={200}
                            />
                            <p className="text-xs text-secondary-foreground text-center mt-3">
                                Drag the handle to adjust LP vs Hedge allocation
                            </p>
                        </div>

                        {/* Combined Settings Card - Investment, Period, Scenario, Compound */}
                        <div className="rounded-2xl bg-card border overflow-hidden">
                            {/* Investment Amount */}
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest">
                                        Initial Investment
                                    </label>
                                    <div className="text-xl font-mono font-bold text-primary">
                                        ${investment.toLocaleString()}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="100"
                                    max="1000000"
                                    step="100"
                                    value={investment}
                                    onChange={(e) => setInvestment(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary/50 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-secondary-foreground mt-1">
                                    <span>$100</span>
                                    <span>$1M</span>
                                </div>
                            </div>

                            {/* Time Period */}
                            <div className="p-4 border-b">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest">
                                        Time Period
                                    </label>
                                    <div className="text-xl font-mono font-bold">
                                        {days} <span className="text-sm text-secondary-foreground">days</span>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="365"
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value))}
                                    className="w-full h-2 bg-secondary/50 rounded-full appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[10px] text-secondary-foreground mt-1">
                                    <span>1 day</span>
                                    <span>1 year</span>
                                </div>
                            </div>

                            {/* Market Scenario */}
                            <div className="p-4 border-b">
                                <label className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-3 block">
                                    Market Scenario
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { key: "bull" as const, label: "Bull", icon: TrendingUp, change: "+50%", color: "text-success" },
                                        { key: "sideways" as const, label: "Flat", icon: Minus, change: "±0%", color: "text-warning" },
                                        { key: "bear" as const, label: "Bear", icon: TrendingDown, change: "-30%", color: "text-destructive" },
                                        { key: "custom" as const, label: "Custom", icon: Calculator, change: `${customPriceChange >= 0 ? '+' : ''}${customPriceChange}%`, color: "text-primary" },
                                    ].map((s) => (
                                        <button
                                            key={s.key}
                                            onClick={() => setScenario(s.key)}
                                            className={`p-2 rounded-xl border-2 transition-all ${
                                                scenario === s.key
                                                    ? "border-primary bg-primary/5"
                                                    : "border-transparent bg-secondary/30 hover:bg-secondary/50"
                                            }`}
                                        >
                                            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                                            <div className="text-[10px] font-bold">{s.label}</div>
                                            <div className="text-[9px] text-secondary-foreground">{s.change}</div>
                                        </button>
                                    ))}
                                </div>
                                {scenario === "custom" && (
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs text-secondary-foreground">Price change:</span>
                                        <input
                                            type="number"
                                            value={customPriceChange}
                                            onChange={(e) => setCustomPriceChange(Number(e.target.value))}
                                            className="flex-1 px-3 py-1.5 rounded-lg bg-background border text-right font-mono text-sm"
                                        />
                                        <span className="text-sm text-secondary-foreground">%</span>
                                    </div>
                                )}
                            </div>

                            {/* Auto-compound toggle */}
                            <div className="p-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoCompound}
                                        onChange={(e) => setAutoCompound(e.target.checked)}
                                        className="w-5 h-5 rounded accent-primary"
                                    />
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className={`w-4 h-4 ${autoCompound ? "text-primary" : "text-secondary-foreground"}`} />
                                            <span className="font-bold text-sm">Auto-compound</span>
                                        </div>
                                        {autoCompound && (
                                            <div className="flex gap-1">
                                                {(["daily", "weekly", "monthly"] as const).map((freq) => (
                                                    <button
                                                        key={freq}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCompoundFrequency(freq);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                                            compoundFrequency === freq
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-secondary/50 hover:bg-secondary"
                                                        }`}
                                                    >
                                                        {freq.charAt(0).toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Advanced Settings - Always Visible */}
                        <div className="rounded-2xl bg-card border overflow-hidden">
                            <div className="p-4 border-b bg-card/50">
                                <span className="text-sm font-bold">Advanced Settings</span>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* LP APR */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-secondary-foreground">LP Fee APR</span>
                                        <span className="font-mono font-bold">{lpApr}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1000"
                                        value={lpApr}
                                        onChange={(e) => setLpApr(Number(e.target.value))}
                                        className="w-full h-2 bg-secondary/50 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-secondary-foreground mt-1">
                                        Annual percentage rate from LP trading fees
                                    </p>
                                </div>

                                {/* Funding Rate - Now allows positive and negative */}
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-secondary-foreground">Daily Funding Rate</span>
                                        <span className={`font-mono font-bold ${fundingRate >= 0 ? "text-destructive" : "text-success"}`}>
                                            {fundingRate >= 0 ? "-" : "+"}{Math.abs(fundingRate).toFixed(3)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-0.05"
                                        max="0.1"
                                        step="0.001"
                                        value={fundingRate}
                                        onChange={(e) => setFundingRate(Number(e.target.value))}
                                        className="w-full h-2 bg-secondary/50 rounded-full appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-secondary-foreground mt-1">
                                        {fundingRate >= 0 
                                            ? "Cost to maintain short hedge (paid to longs)" 
                                            : "Earn funding from longs (bull market scenario)"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Results */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-6"
                    >
                        {/* HedgeLP Result Card */}
                        <div className="p-6 rounded-2xl bg-card border-2 border-primary shadow-xl shadow-primary/10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">HedgeLP Strategy</h3>
                                        <p className="text-xs text-secondary-foreground">{lpPercent}% LP + {hedgePercent}% Hedge</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-secondary-foreground">Annualized</div>
                                    <div className={`font-mono font-bold ${calculations.annualizedAPY >= 0 ? "text-success" : "text-destructive"}`}>
                                        {calculations.annualizedAPY >= 0 ? "+" : ""}{calculations.annualizedAPY.toFixed(1)}% APY
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-secondary-foreground">Final Value</span>
                                    <span className="text-4xl font-mono font-bold">
                                        ${calculations.finalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-secondary-foreground">Total Return</span>
                                    <span className={`text-xl font-mono font-bold ${calculations.hedgeLPReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                        {formatCurrency(calculations.hedgeLPReturn)}
                                        <span className="text-sm ml-1">({calculations.hedgeLPPercent >= 0 ? "+" : ""}{calculations.hedgeLPPercent.toFixed(2)}%)</span>
                                    </span>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="pt-4 border-t space-y-3 text-sm">
                                    {/* LP Section */}
                                    <div className="text-xs font-bold text-secondary-foreground uppercase tracking-wider">LP Position ({lpPercent}%)</div>
                                    <div className="flex justify-between pl-3">
                                        <span className="text-secondary-foreground">Trading Fees {autoCompound && `(${compoundFrequency})`}</span>
                                        <span className="font-mono text-success">{formatCurrency(calculations.lpFeesEarned)}</span>
                                    </div>
                                    <div className="flex justify-between pl-3">
                                        <span className="text-secondary-foreground">Impermanent Loss</span>
                                        <span className="font-mono text-destructive">-${calculations.ilLoss.toFixed(0)}</span>
                                    </div>
                                    <div className="flex justify-between pl-3">
                                        <span className="text-secondary-foreground">Price Exposure</span>
                                        <span className={`font-mono ${calculations.lpPriceImpact >= 0 ? "text-success" : "text-destructive"}`}>
                                            {formatCurrency(calculations.lpPriceImpact)}
                                        </span>
                                    </div>
                                    
                                    {/* Hedge Section */}
                                    <div className="text-xs font-bold text-secondary-foreground uppercase tracking-wider pt-2">Hedge Position ({hedgePercent}%)</div>
                                    <div className="flex justify-between pl-3">
                                        <span className="text-secondary-foreground">Short P&L</span>
                                        <span className={`font-mono ${calculations.hedgePositionPnL >= 0 ? "text-success" : "text-destructive"}`}>
                                            {formatCurrency(calculations.hedgePositionPnL)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pl-3">
                                        <span className="text-secondary-foreground">
                                            {calculations.totalFundingCost >= 0 ? "Funding Cost" : "Funding Earned"} ({days}d)
                                        </span>
                                        <span className={`font-mono ${calculations.totalFundingCost >= 0 ? "text-destructive" : "text-success"}`}>
                                            {calculations.totalFundingCost >= 0 ? "-" : "+"}${Math.abs(calculations.totalFundingCost).toFixed(0)}
                                        </span>
                                    </div>

                                    {/* Compound Bonus */}
                                    {autoCompound && calculations.compoundBonus > 0 && (
                                        <div className="flex justify-between pt-2 border-t text-primary">
                                            <span className="flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                Compound Boost
                                            </span>
                                            <span className="font-mono font-bold">+${calculations.compoundBonus.toFixed(0)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Compounding Chart */}
                        {calculations.effectiveDailyYield > 0 && (
                            <div className="p-4 rounded-2xl bg-card border">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-bold">Growth Projection</span>
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showChart}
                                            onChange={(e) => setShowChart(e.target.checked)}
                                            className="w-4 h-4 rounded accent-primary"
                                        />
                                        Show comparison
                                    </label>
                                </div>
                                <CompoundingChart
                                    investment={investment}
                                    days={days}
                                    dailyYield={calculations.effectiveDailyYield}
                                    showCompound={autoCompound}
                                    showNonCompound={showChart}
                                />
                            </div>
                        )}

                        {/* Comparison Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-card border">
                                <h4 className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-3">Pure LP (100%)</h4>
                                <div className="text-2xl font-mono font-bold mb-1">
                                    ${(investment + calculations.pureLPReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className={`text-sm font-mono ${calculations.pureLPReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                    {calculations.pureLPReturn >= 0 ? "+" : ""}{calculations.pureLPPercent.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-secondary-foreground mt-2">
                                    No hedge protection
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-card border">
                                <h4 className="text-xs font-bold text-secondary-foreground uppercase tracking-widest mb-3">HODL</h4>
                                <div className="text-2xl font-mono font-bold mb-1">
                                    ${(investment + calculations.hodlReturn).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className={`text-sm font-mono ${calculations.hodlReturn >= 0 ? "text-success" : calculations.hodlReturn < 0 ? "text-destructive" : "text-secondary-foreground"}`}>
                                    {calculations.hodlReturn >= 0 ? "+" : ""}{calculations.hodlPercent.toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-secondary-foreground mt-2">
                                    Just holding the asset
                                </div>
                            </div>
                        </div>

                        {/* Insight */}
                        <div className="p-4 rounded-xl bg-secondary/20 flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-secondary-foreground leading-relaxed">
                                {scenario === "bear" ? (
                                    <>
                                        <span className="text-foreground font-semibold">In bear markets</span>, HedgeLP with {hedgePercent}% hedge 
                                        {calculations.hedgeLPPercent > calculations.pureLPPercent ? " outperforms" : " underperforms"} Pure LP by{" "}
                                        <span className={calculations.hedgeLPPercent > calculations.pureLPPercent ? "text-success" : "text-destructive"}>
                                            {Math.abs(calculations.hedgeLPPercent - calculations.pureLPPercent).toFixed(1)}%
                                        </span>. 
                                        {hedgePercent > 0 ? " The hedge absorbs downside risk." : " Consider adding a hedge for protection."}
                                    </>
                                ) : scenario === "bull" ? (
                                    <>
                                        <span className="text-foreground font-semibold">In bull markets</span>, HedgeLP 
                                        {hedgePercent > 0 && " underperforms due to the short hedge."} 
                                        {" "}Consider reducing hedge allocation to {Math.max(0, hedgePercent - 10)}% to capture more upside.
                                    </>
                                ) : (
                                    <>
                                        <span className="text-foreground font-semibold">In sideways markets</span>, 
                                        {autoCompound 
                                            ? ` auto-compounding adds $${calculations.compoundBonus.toFixed(0)} (${((calculations.compoundBonus / investment) * 100).toFixed(2)}%) extra.`
                                            : " enable auto-compound to maximize returns via compound interest."}
                                        {hedgePercent > 20 && " Consider lower hedge allocation to reduce funding costs."}
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Quick Scenario Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setScenario("bear")}
                                className="flex-1 py-3 px-4 rounded-xl border hover:bg-secondary/50 transition-colors text-sm font-bold"
                            >
                                Try Bear (-30%)
                            </button>
                            <button
                                onClick={() => setScenario("bull")}
                                className="flex-1 py-3 px-4 rounded-xl border hover:bg-secondary/50 transition-colors text-sm font-bold"
                            >
                                Try Bull (+50%)
                            </button>
                            <button
                                onClick={() => {
                                    setLpPercent(80);
                                    setScenario("sideways");
                                    setAutoCompound(true);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl border hover:bg-secondary/50 transition-colors text-sm font-bold"
                            >
                                Reset
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
