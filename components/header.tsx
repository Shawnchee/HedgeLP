"use client";

import { ThemeToggle } from "./theme-toggle";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ShieldCheck, Wallet, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const NAV_ITEMS = [
    { name: "Swap", href: "/swap" },
    { name: "Tokens", href: "/tokens" },
    { name: "Pools", href: "/pools" },
    { name: "Vault", href: "/dashboard" },
];

export function Header() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-6">
            <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-white w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight hidden sm:inline-block">HedgeLP</span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                                pathname.startsWith(item.href)
                                    ? "bg-secondary text-foreground"
                                    : "text-secondary-foreground hover:bg-secondary/50 hover:text-foreground"
                            )}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>
            </div>

            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3">
                    <ThemeToggle />

                    {isConnected ? (
                        <button
                            onClick={() => disconnect()}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium"
                        >
                            <Wallet className="w-4 h-4" />
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </button>
                    ) : (
                        <button
                            onClick={() => connect({ connector: injected() })}
                            className="px-6 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-semibold"
                        >
                            Connect Wallet
                        </button>
                    )}
                </div>

                <button className="lg:hidden p-2 rounded-lg hover:bg-secondary/50">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
}
