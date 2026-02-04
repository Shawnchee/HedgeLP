"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
    { name: "Swap", href: "/swap" },
    { name: "Tokens", href: "/tokens" },
    { name: "Pools", href: "/pools" },
    { name: "Vault", href: "/dashboard" },
    { name: "Calculator", href: "/calculator" },
];

export function MobileMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                aria-label="Open menu"
            >
                <Menu className="w-6 h-6" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
                        />
                        
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-[300px] bg-card border-l z-[101] lg:hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b">
                                <span className="text-xl font-bold">Menu</span>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Navigation */}
                            <nav className="flex-1 p-4 space-y-1">
                                {NAV_ITEMS.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={clsx(
                                            "block px-4 py-3 rounded-xl text-lg font-semibold transition-colors",
                                            pathname.startsWith(item.href)
                                                ? "bg-primary/10 text-primary"
                                                : "hover:bg-secondary/50"
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>

                            {/* Footer */}
                            <div className="p-6 border-t space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-secondary-foreground">Theme</span>
                                    <ThemeToggle />
                                </div>
                                <WalletButton />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
