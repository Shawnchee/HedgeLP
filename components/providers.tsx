"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia, arbitrum, base, foundry } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// WalletConnect Project ID - get from cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

const config = createConfig({
    chains: [arbitrum, base, mainnet, sepolia, foundry],
    connectors: [
        injected(),
        walletConnect({ 
            projectId: WALLETCONNECT_PROJECT_ID,
            metadata: {
                name: "HedgeLP",
                description: "Delta-Neutral Liquidity Provision",
                url: "https://hedgelp.xyz",
                icons: ["https://hedgelp.xyz/icon.png"],
            },
        }),
        coinbaseWallet({ appName: "HedgeLP" }),
    ],
    transports: {
        [arbitrum.id]: http(),
        [base.id]: http(),
        [mainnet.id]: http(),
        [sepolia.id]: http(),
        [foundry.id]: http(),
    },
});

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60, // 1 minute
                gcTime: 1000 * 60 * 5, // 5 minutes
            },
        },
    }));

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
