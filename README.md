<div align="center">
  <img src="https://img.shields.io/badge/Uniswap-v4-FF007A?style=for-the-badge&logo=uniswap&logoColor=white" alt="Uniswap v4" />
  <img src="https://img.shields.io/badge/GMX-v2-0066FF?style=for-the-badge" alt="GMX v2" />
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Arbitrum-Ready-12AAFF?style=for-the-badge&logo=arbitrum&logoColor=white" alt="Arbitrum" />
  <img src="https://img.shields.io/github/license/Shawnchee/HedgeLP?style=for-the-badge" alt="License" />
</div>

<br />

<div align="center">
  <h1>🛡️ HedgeLP</h1>
  <p><strong>Delta-Neutral Liquidity Provision on Uniswap v4</strong></p>
  <p>Capture trading fees while eliminating market exposure through atomic hedging.</p>
</div>

<br />

<p align="center">
  <a href="#-why-hedgelp">Why HedgeLP</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## 🌟 Why HedgeLP?

### The Problem

Traditional liquidity provision on DEXs like Uniswap comes with a significant risk: **Impermanent Loss (IL)**. When the price of assets in your LP position diverges from your entry point, you end up with less value than if you had simply held the tokens.

| Scenario | Pure LP Strategy | HedgeLP Strategy |
|----------|------------------|------------------|
| ETH -30% | **-34.5%** (IL + Price) | **-1.5%** (Hedged) |
| ETH +50% | +25% (Capped by IL) | +18% (Capped by Hedge) |
| ETH ±5%  | +12% (Fee Yield) | **+11%** (Net of Funding) |

> 💡 **Key Insight**: HedgeLP sacrifices a small portion of upside to dramatically protect your downside. You earn yield from trading fees while staying **delta-neutral** to price movements.

### Our Solution

HedgeLP is the first protocol to combine **Uniswap v4 Hooks** with perpetual protocol hedging (GMX v2) to create a truly delta-neutral liquidity provision strategy. Every deposit is automatically split:

- **80%** → High-fee Uniswap v4 liquidity pools
- **20%** → 1x ETH short position on GMX (as a hedge)

When the market moves, our Uniswap v4 Hook **atomically rebalances** your position to maintain delta neutrality—no manual intervention required.

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER DEPOSITS USDC                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────────┐
                  │      HedgeLPVault.sol       │
                  │        (ERC4626)            │
                  └─────────────────────────────┘
                    │                       │
           80% USDC │                       │ 20% USDC
                    ▼                       ▼
     ┌──────────────────────┐    ┌──────────────────────┐
     │   Uniswap v4 Pool    │    │   GMXHedgeAdapter    │
     │   (ETH/USDC LP)      │    │   (1x ETH Short)     │
     └──────────────────────┘    └──────────────────────┘
                    │                       │
                    │     ┌─────────────────┘
                    ▼     ▼
           ┌────────────────────────┐
           │    HedgeLPHook.sol    │
           │  (afterSwap Monitor)  │
           └────────────────────────┘
                        │
                        │ Price Deviation > 5%?
                        ▼
           ┌────────────────────────┐
           │  ATOMIC REBALANCE     │
           │  Adjust hedge size     │
           └────────────────────────┘
```

### Step-by-Step Flow

1. **Deposit**: User deposits USDC into the `HedgeLPVault`.
2. **Allocation**: The vault automatically splits funds 80/20 between the Uniswap LP and a GMX short.
3. **Monitoring**: The `HedgeLPHook` watches every swap in the pool for significant price changes.
4. **Rebalancing**: If the price deviates more than 5%, the hook triggers `vault.rebalance()` to adjust the hedge position size, keeping the overall delta near zero.
5. **Withdraw**: Users can redeem their shares at any time for the underlying value (LP + Hedge P&L).

---

## ✨ Features

### For Users (Layman's Guide)

| Feature | What It Means For You |
|---------|----------------------|
| **🛡️ Delta-Neutral** | Your portfolio value doesn't drop when ETH price drops. You're protected from market crashes. |
| **💰 Earn Yield** | You still earn trading fees from people swapping on Uniswap. This is pure income. |
| **🔄 Automatic** | No need to manually adjust anything. The protocol rebalances for you 24/7. |
| **📲 Alerts** | Get Telegram notifications when rebalances happen or if your position needs attention. |
| **🌓 Dark/Light Mode** | A beautiful interface that's easy on your eyes, day or night. |

### For Developers (Technical Guide)

| Component | Description |
|-----------|-------------|
| **HedgeLPVault.sol** | ERC4626-compliant vault managing deposits and the 80/20 split. Handles minting/burning of `vHLP` shares. |
| **HedgeLPHook.sol** | Uniswap v4 `afterSwap` hook that monitors sqrtPriceX96 and triggers rebalancing if delta exceeds threshold. |
| **GMXHedgeAdapter.sol** | Interface to GMX v2's ExchangeRouter for opening/closing perpetual short positions. |
| **Frontend** | Next.js 15 + Tailwind CSS + Framer Motion. Wagmi for wallet connection. Recharts for analytics. |
| **Telegram Bot** | API route at `/api/bot/webhook` to receive on-chain event notifications and push to users. |

---

## 🚀 Quick Start

### Prerequisites

- Bun 1.0+ (or Node.js 18+)
- Git
- (Optional) Foundry for smart contract development

### Installation

```bash
# Clone the repository
git clone https://github.com/Shawnchee/HedgeLP.git
cd HedgeLP

# Install dependencies
bun install

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Environment Variables

Create a `.env.local` file:

```env
# RPC URLs
NEXT_PUBLIC_ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### Smart Contracts (Foundry)

```bash
cd contracts

# Install dependencies (if using Foundry)
forge install

# Build contracts
forge build

# Run tests
forge test -vvv
```

---

## 🏗️ Architecture

### Project Structure

```
HedgeLP/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Vault dashboard
│   ├── swap/               # Swap interface
│   ├── tokens/             # Token market list
│   ├── tokens/[id]/        # Token detail page
│   ├── pools/              # Liquidity pools
│   └── api/bot/webhook/    # Telegram bot API
├── components/             # Reusable React components
│   ├── header.tsx          # Global navigation
│   ├── providers.tsx       # Wagmi + Theme providers
│   └── theme-toggle.tsx    # Dark/Light mode toggle
├── contracts/              # Solidity smart contracts
│   └── src/
│       ├── HedgeLPVault.sol
│       ├── HedgeLPHook.sol
│       └── GMXHedgeAdapter.sol
└── public/                 # Static assets
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, Framer Motion |
| **Web3** | Wagmi v2, Viem, TanStack Query |
| **Charts** | Recharts |
| **Smart Contracts** | Solidity 0.8.24, Foundry, OpenZeppelin |
| **Protocols** | Uniswap v4, GMX v2 |

---

## 📘 User Guide

### Getting Started

1. **Connect Your Wallet**: Click "Connect Wallet" in the top-right corner. We support MetaMask, Coinbase Wallet, and WalletConnect.

2. **Navigate to the Vault**: Click "Vault" in the navigation or go directly to `/dashboard`.

3. **Deposit USDC**: Enter the amount of USDC you want to deposit. You'll see a preview of your estimated shares (`vHLP`) and the allocation breakdown.

4. **Confirm Transaction**: Approve the USDC spending and confirm the deposit transaction.

5. **Monitor Your Position**: The dashboard shows your:
   - Total value
   - Current APR
   - Hedge delta status (should be "Neutral")
   - LP and Hedge position breakdown

6. **Withdraw Anytime**: Click "Withdraw", enter the number of shares to redeem, and confirm.

### Understanding the Dashboard

| Metric | Meaning |
|--------|---------|
| **Total Value** | Your current portfolio value in USD |
| **Hedge Delta** | Should always say "Neutral". If it shows a drift, a rebalance is pending. |
| **Estimated APR** | Your projected annual return from LP fees minus funding costs |
| **Active Pool Exposure** | Shows your LP position details (pool, allocation %) |
| **ETH Short** | Shows your hedge position details (size, P&L) |

---

## 🔒 Security

### Smart Contract Considerations

- **Non-Custodial**: All funds are held in audited ERC4626 vaults and Uniswap/GMX pools. The protocol never has direct custody.
- **No Leverage on Vault**: The vault itself uses no leverage. The GMX position is 1x short (delta hedge only).
- **Access Control**: Only the registered Uniswap v4 Hook can call `vault.rebalance()`.

### Risks

| Risk | Mitigation |
|------|------------|
| **Smart Contract Risk** | Contracts are based on battle-tested OpenZeppelin and Uniswap v4 libraries. Audit pending. |
| **Oracle Risk** | We rely on Uniswap v4's native price oracle (sqrtPriceX96). |
| **Funding Rate Risk** | In extreme markets, GMX funding rates can spike. The protocol caps max allocation to shorts. |
| **Protocol Risk (GMX)** | If GMX experiences issues, the hedge leg may be affected. |

---

## 🤝 Contributing

We welcome contributions from the community! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute

1. **Fork the Repository**: Click the "Fork" button on GitHub.
2. **Clone Your Fork**: `git clone https://github.com/Shawnchee/HedgeLP.git`
3. **Create a Branch**: `git checkout -b feature/your-feature-name`
4. **Make Changes**: Implement your feature or fix.
5. **Test**: Ensure all tests pass with `bun test` and `forge test`.
6. **Commit**: Use conventional commits (e.g., `feat: add new feature`).
7. **Push**: `git push origin feature/your-feature-name`
8. **Open a Pull Request**: Go to the original repo and open a PR.

### Development Guidelines

- Follow the existing code style (Prettier + ESLint).
- Write tests for new features.
- Update documentation if you change user-facing behavior.
- Be respectful in code reviews.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 HedgeLP DAO

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 🔗 Links

- **GitHub**: [https://github.com/Shawnchee/HedgeLP](https://github.com/Shawnchee/HedgeLP)
- **Live Demo**: Coming soon
- **Documentation**: This README + inline code comments

---

## 👥 Team

<table>
  <tr>
    <td align="center">
      <strong>Shawn Chee</strong><br />
      <sub>Lead Developer & Smart Contracts</sub>
    </td>
    <td align="center">
      <strong>Elvin Tan</strong><br />
      <sub>Frontend & UX Design</sub>
    </td>
    <td align="center">
      <strong>Ng Hui Siang</strong><br />
      <sub>Protocol Research & Strategy</sub>
    </td>
  </tr>
</table>

---

<div align="center">
  <p>Built with ❤️ for the DeFi community</p>
  <p>
    <a href="https://github.com/Shawnchee/HedgeLP/issues">Report Bug</a> •
    <a href="https://github.com/Shawnchee/HedgeLP/issues">Request Feature</a>
  </p>
</div>
