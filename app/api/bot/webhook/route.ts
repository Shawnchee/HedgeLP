import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event, data } = body;

        let message = "";

        // Handle different contract events
        switch (event) {
            case "REBALANCE":
                message = `🔄 *Vault Rebalanced*\n\nPrice: $${data.price}\nLP Value: $${data.lpValue}\nHedge Value: $${data.hedgeValue}\nDelta: Neutral`;
                break;
            case "HEALTH_WARNING":
                message = `⚠️ *Liquidation Warning*\n\nYour hedge position health factor is low: ${data.healthFactor}\nImmediate action may be required.`;
                break;
            case "DEPOSIT":
                message = `💰 *Deposit Successful*\n\nUser: ${data.user}\nAmount: ${data.amount} USDC\nShares Minted: ${data.shares}`;
                break;
            default:
                message = `📢 *Notification*\n\n${JSON.stringify(data)}`;
        }

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: "Markdown",
                }),
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Bot API Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
