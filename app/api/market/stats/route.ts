import { NextResponse } from "next/server";
import { COINGECKO_BASE_URL, CACHE_TIMING } from "@/lib/constants";

export async function GET() {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/global`, {
            headers: { Accept: "application/json" },
            next: { revalidate: CACHE_TIMING.SERVER_STATS_REVALIDATE },
        });

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch market stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch market stats" },
            { status: 502 }
        );
    }
}
