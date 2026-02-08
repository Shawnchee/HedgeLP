"use client";

import { ThemeToggle } from "./theme-toggle";
import { WalletButton } from "./wallet-button";
import { MobileMenu } from "./mobile-menu";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { NAV_ITEMS } from "@/lib/constants";

export function Header() {
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-4 sm:px-6">
            {/* Logo + Nav */}
            <div className="flex items-center gap-6 lg:gap-8">
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

            {/* Actions */}
            <div className="flex items-center gap-3">
                {/* Desktop: Theme + Wallet */}
                <div className="hidden sm:flex items-center gap-3">
                    <ThemeToggle />
                    <WalletButton />
                </div>

                {/* Mobile: Menu */}
                <MobileMenu />
            </div>
        </header>
    );
}
