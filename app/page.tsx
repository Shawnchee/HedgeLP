"use client";

import { Header } from "@/components/header";
import {
  Shield,
  TrendingUp,
  Zap,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Flame,
  LayoutDashboard
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-success/10 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/50 border mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-secondary-foreground">Now Live on Arbitrum & Base</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
          >
            Yield without <br />
            <span className="text-primary italic">Volatility.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg md:text-xl text-secondary-foreground mb-10 leading-relaxed"
          >
            The first delta-neutral liquidity provision protocol utilizing Uniswap v4 Hooks. Captures fees, eliminates market risk.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
            >
              Start Earning
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/swap"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary/50 font-bold text-lg hover:bg-secondary transition-all flex items-center justify-center gap-2"
            >
              Explore Markets
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y bg-card/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x h-24">
          {[
            { label: "Total Value Locked", value: "$42.8M" },
            { label: "Average APR", value: "18.4%" },
            { label: "Fees Earned", value: "$1.2M" },
            { label: "Hedged Delta", value: "Neutral" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center px-4">
              <span className="text-[10px] font-bold text-secondary-foreground uppercase tracking-widest mb-1">{stat.label}</span>
              <span className="text-lg md:text-xl font-mono font-bold italic">{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Comparison */}
      <section className="py-24 px-6 bg-secondary/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Engineered for Market Downturns</h2>
            <p className="text-secondary-foreground">How HedgeLP compares to standard LP strategies during a 30% ETH drop.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl border bg-card relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                <Flame className="w-8 h-8 text-destructive opacity-20 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold mb-6">Standard LP Position</h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-foreground">Price Change (-30%)</span>
                  <span className="font-mono text-destructive">-$3,000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-foreground">Impermanent Loss</span>
                  <span className="font-mono text-destructive">-$450</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t font-bold text-lg">
                  <span>Total Net Loss</span>
                  <span className="text-destructive">-34.5%</span>
                </div>
              </div>
              <div className="text-xs text-secondary-foreground leading-relaxed italic">
                Standard LP strategies are exposed to the underlying asset's price. When the market drops, so does your capital.
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-primary bg-card relative overflow-hidden group shadow-2xl shadow-primary/10">
              <div className="absolute top-0 right-0 p-4">
                <Shield className="w-8 h-8 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                HedgeLP Neutral Vault
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase">Engineered</span>
              </h3>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-foreground">Price Change (-30%)</span>
                  <span className="font-mono text-destructive">-$3,000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-secondary-foreground">GMX Hedge Profit</span>
                  <span className="font-mono text-success">+$2,850</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t font-bold text-lg">
                  <span>Total Net Loss</span>
                  <span className="text-success">-1.5%</span>
                </div>
              </div>
              <div className="text-xs text-secondary-foreground leading-relaxed italic">
                By hedging the volatile portion of your LP position, HedgeLP preserves your capital regardless of market direction.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Deposit USDC",
                desc: "Your capital is split 80% into high-fee Uniswap v4 pools and 20% into an insurance hedge.",
                icon: Zap
              },
              {
                step: "02",
                title: "Atomic Rebalancing",
                desc: "Uniswap v4 Hooks monitor price action. If the market moves, we automatically adjust your hedge via GMX.",
                icon: TrendingUp
              },
              {
                step: "03",
                title: "Earn Pure Yield",
                desc: "Withdraw your principal and earned fees at any time. Enjoy the yield of DeFi without the price-drop anxiety.",
                icon: Shield
              },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-primary/25 mb-4">{step.step}</div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                </div>
                <p className="text-secondary-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 -skew-y-3 translate-y-24" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">Ready to outsmart the market?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-foreground text-background font-bold text-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Go to Dashboard
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          </div>
          <p className="mt-8 text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            No management fees until 2027.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t font-bold text-xs text-secondary-foreground tracking-widest uppercase">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-8">
            <Link href="/swap" className="hover:text-foreground transition-colors">Swap</Link>
            <Link href="/tokens" className="hover:text-foreground transition-colors">Tokens</Link>
            <Link href="/pools" className="hover:text-foreground transition-colors">Pools</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Vault</Link>
          </div>
          <div>© 2026 HedgeLP DAO</div>
        </div>
      </footer>
    </main>
  );
}
