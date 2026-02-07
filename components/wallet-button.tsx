"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from "wagmi";
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SUPPORTED_CHAINS = [
    { id: 42161, name: "Arbitrum", color: "#28A0F0" },
    { id: 8453, name: "Base", color: "#0052FF" },
    { id: 1, name: "Ethereum", color: "#627EEA" },
    { id: 11155111, name: "Sepolia", color: "#CFB5F0" },
    { id: 31337, name: "Local", color: "#F5F5F5" },
];

export function WalletButton() {
    const { address, isConnected } = useAccount();
    // Prevent hydration mismatch by deferring connected state until mounted
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    const { connectors, connect, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { data: balance } = useBalance({ address });

    const [showConnectModal, setShowConnectModal] = useState(false);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const currentChain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    const isUnsupportedChain = chainId && !SUPPORTED_CHAINS.some(c => c.id === chainId);

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    // Render placeholder until hydration is complete to prevent mismatch
    if (!mounted) {
        return (
            <button
                className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
            >
                Connect Wallet
            </button>
        );
    }

    if (!isConnected) {
        return (
            <>
                <button
                    onClick={() => setShowConnectModal(true)}
                    className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm"
                >
                    Connect Wallet
                </button>

                {/* Connect Modal */}
                <AnimatePresence>
                    {showConnectModal && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowConnectModal(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-card border rounded-3xl p-6 z-[101] shadow-2xl"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold">Connect Wallet</h3>
                                    <button 
                                        onClick={() => setShowConnectModal(false)}
                                        className="text-secondary-foreground hover:text-foreground transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {connectors.map((connector) => (
                                        <button
                                            key={connector.uid}
                                            onClick={() => {
                                                connect({ connector });
                                                setShowConnectModal(false);
                                            }}
                                            disabled={isPending}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border hover:bg-secondary/50 transition-colors disabled:opacity-50"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold">{connector.name}</div>
                                                <div className="text-xs text-secondary-foreground">
                                                    {connector.type === 'injected' ? 'Browser Wallet' : 
                                                     connector.type === 'walletConnect' ? 'Mobile & Desktop' :
                                                     'Popular Wallet'}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <p className="text-xs text-secondary-foreground text-center mt-6">
                                    By connecting, you agree to our Terms of Service
                                </p>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </>
        );
    }

    // Connected state
    return (
        <>
            <div className="flex items-center gap-2">
                {/* Chain Selector */}
                {isUnsupportedChain ? (
                    <button
                        onClick={() => switchChain?.({ chainId: 42161 })}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-destructive/20 text-destructive font-semibold text-sm"
                    >
                        <AlertCircle className="w-4 h-4" />
                        Wrong Network
                    </button>
                ) : (
                    <button
                        onClick={() => setShowAccountModal(true)}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-sm"
                    >
                        <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: currentChain?.color || '#627EEA' }}
                        />
                        <span className="font-medium">{currentChain?.name || 'Unknown'}</span>
                    </button>
                )}

                {/* Account Button */}
                <button
                    onClick={() => setShowAccountModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium"
                >
                    <Wallet className="w-4 h-4" />
                    <span className="font-mono">{formatAddress(address!)}</span>
                    <ChevronDown className="w-3 h-3" />
                </button>
            </div>

            {/* Account Modal */}
            <AnimatePresence>
                {showAccountModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAccountModal(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-card border rounded-3xl p-6 z-[101] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold">Account</h3>
                                <button 
                                    onClick={() => setShowAccountModal(false)}
                                    className="text-secondary-foreground hover:text-foreground transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Address */}
                            <div className="p-4 rounded-2xl bg-secondary/20 mb-4">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-lg">{formatAddress(address!)}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyAddress}
                                            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                                            title="Copy address"
                                        >
                                            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <a
                                            href={`https://arbiscan.io/address/${address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                                            title="View on explorer"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                                {balance && (
                                    <div className="text-sm text-secondary-foreground mt-2">
                                        Balance: {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}
                                    </div>
                                )}
                            </div>

                            {/* Chain Selector */}
                            <div className="mb-4">
                                <div className="text-sm font-bold text-secondary-foreground mb-2">Network</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {SUPPORTED_CHAINS.map((chain) => (
                                        <button
                                            key={chain.id}
                                            onClick={() => switchChain?.({ chainId: chain.id })}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                                                chainId === chain.id
                                                    ? 'bg-primary/10 border-primary'
                                                    : 'hover:bg-secondary/50'
                                            }`}
                                        >
                                            <div 
                                                className="w-4 h-4 rounded-full" 
                                                style={{ backgroundColor: chain.color }}
                                            />
                                            <span className="text-sm font-medium">{chain.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Disconnect */}
                            <button
                                onClick={() => {
                                    disconnect();
                                    setShowAccountModal(false);
                                }}
                                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Disconnect
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
