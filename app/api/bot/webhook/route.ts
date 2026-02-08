import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/** Sanitize a value for safe inclusion in Telegram Markdown. */
function esc(value: unknown): string {
    return String(value ?? "").replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

export async function POST(req: Request) {
    try {
        // ── Auth: require shared secret header ──
        const authHeader = req.headers.get("x-webhook-secret");
        if (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { event, data } = body;

        if (!event || typeof event !== "string") {
            return NextResponse.json(
                { success: false, error: "Missing event field" },
                { status: 400 }
            );
        }

        let message = "";

        switch (event) {
            case "REBALANCE":
                message = `🔄 *Vault Rebalanced*\n\nPrice: $${esc(data?.price)}\nLP Value: $${esc(data?.lpValue)}\nHedge Value: $${esc(data?.hedgeValue)}\nDelta: Neutral`;
                break;
            case "HEALTH_WARNING":
                message = `⚠️ *Liquidation Warning*\n\nHealth factor is low: ${esc(data?.healthFactor)}\nImmediate action may be required.`;
                break;
            case "DEPOSIT":
                message = `💰 *Deposit Successful*\n\nUser: ${esc(data?.user)}\nAmount: ${esc(data?.amount)} USDC\nShares Minted: ${esc(data?.shares)}`;
                break;
            default:
                // Never dump raw data — log server-side only
                console.warn(`[webhook] Unknown event: ${event}`);
                message = `📢 *Notification*\n\nUnknown event: ${esc(event)}`;
        }

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            await fetch(
                `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: message,
                        parse_mode: "Markdown",
                    }),
                }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Bot API Error:", error);
        return NextResponse.json(
            { success: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
