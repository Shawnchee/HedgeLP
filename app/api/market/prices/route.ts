import { NextResponse } from "next/server";
import { COINGECKO_BASE_URL, CACHE_TIMING } from "@/lib/constants";
import { sanitizeTokenIds } from "@/lib/sanitize";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = sanitizeTokenIds(searchParams.get("ids") || "");

    if (!ids) {
        return NextResponse.json(
            { error: "Missing or invalid token IDs" },
            { status: 400 }
        );
    }

    try {
        const response = await fetch(
            `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h,7d`,
            {
                headers: { Accept: "application/json" },
                next: { revalidate: CACHE_TIMING.SERVER_PRICES_REVALIDATE },
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch token prices:", error);
        return NextResponse.json(
            { error: "Failed to fetch prices" },
            { status: 502 }
        );
    }
}
