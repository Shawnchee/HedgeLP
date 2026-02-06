# HedgeLP Army Bot

Telegram bot for the HedgeLP vault — live market data, pool yields, vault management, and interactive deposit/withdraw/rebalance flows.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env.local

# 3. Fill in the required token
#    Get one from https://t.me/BotFather
echo "TELEGRAM_BOT_TOKEN=<your-token>" >> .env.local

# 4. Run the bot
npm run bot:telegram
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | List all commands |
| `/price <token>` | Token price & 24h stats (CoinGecko) |
| `/vault` | HedgeLP vault status, APR, TVL, and actions |
| `/pools [chain]` | Top Uniswap/Curve/Aave pools by TVL (DeFiLlama) |
| `/apy [chain]` | Top pools sorted by APY |
| `/news` | Trending coins on CoinGecko |
| `/stats` | Global crypto market overview |

## Vault Actions (Interactive)

From `/vault`, tap the inline buttons to:

- **Deposit** — select amount, preview, connect wallet, sign, confirm
- **Withdraw** — select amount or enter custom, preview, sign, confirm
- **Rebalance** — pick a preset LP/Hedge split (60–95%) or enter a custom %, preview estimated APR impact, then sign

Each action walks through a simulated wallet-connect and transaction-signing flow with mock on-chain confirmation.

## Environment Variables

Only `TELEGRAM_BOT_TOKEN` is required. Everything else has sensible defaults.

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | — | **Required.** Token from @BotFather |
| `TELEGRAM_CHAT_ID` | — | Chat ID for webhook notifications |
| `BOT_ALLOWED_CHAT_IDS` | *(all)* | Comma-separated chat IDs that can use the bot. Empty = public |
| `BOT_POLLING_INTERVAL_MS` | `2000` | Polling interval (ms) |
| `BOT_RATE_LIMIT_MAX` | `20` | Max commands per user per window |
| `BOT_RATE_LIMIT_WINDOW_SEC` | `60` | Rate-limit window (seconds) |
| `BOT_HTTP_TIMEOUT_MS` | `10000` | API call timeout (ms) |
| `BOT_HTTP_MAX_RETRIES` | `2` | Retries on transient API failures |
| `BOT_TOP_POOLS_COUNT` | `10` | Number of pools shown in `/pools` and `/apy` |
| `BOT_LOG_LEVEL` | `info` | Log level: `debug` / `info` / `warn` / `error` |

## Project Structure

```
bot/
├── telegram-bot.ts        # Entrypoint — starts polling, graceful shutdown
├── commands.ts            # Command router, rate limiting, chat allow-list
├── config.ts              # Env var loading & validation
├── handlers/
│   ├── help.ts            # /start, /help
│   ├── price.ts           # /price
│   ├── pools.ts           # /pools, /apy
│   ├── news.ts            # /news
│   ├── stats.ts           # /stats
│   ├── vault.ts           # /vault
│   └── callbacks.ts       # Inline keyboard callback dispatcher (deposit/withdraw/rebalance flows)
├── services/
│   ├── api-client.ts      # Direct HTTP calls to CoinGecko & DeFiLlama (with retry)
│   ├── mock-vault.ts      # Simulated vault state & mutation functions
│   └── session-store.ts   # In-memory per-user session for multi-step flows (10 min TTL)
└── utils/
    ├── formatters.ts      # MarkdownV2 escaping & number formatting
    ├── logger.ts          # Structured JSON logger
    ├── rate-limiter.ts    # Per-user sliding-window rate limiter
    └── token-map.ts       # Token symbol → CoinGecko ID mapping
```

## Data Sources

| Source | Used by |
|--------|---------|
| [CoinGecko API](https://www.coingecko.com/en/api) (free tier) | `/price`, `/news`, `/stats` |
| [DeFiLlama Yields API](https://yields.llama.fi) | `/pools`, `/apy` |
| Mock vault (in-memory) | `/vault`, deposit, withdraw, rebalance |

## Notes

- The bot runs standalone — no need for the Next.js server.
- Vault data is mock (contracts not deployed yet). State resets on restart.
- CoinGecko free tier is rate-limited (~10-30 req/min). The bot retries on 429s with exponential back-off.
