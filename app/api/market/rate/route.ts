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
            `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currency=usd`,
            {
                headers: { Accept: "application/json" },
                next: { revalidate: CACHE_TIMING.SERVER_PRICE_REVALIDATE },
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch exchange rate:", error);
        return NextResponse.json(
            { error: "Failed to fetch rate" },
            { status: 502 }
        );
    }
}
