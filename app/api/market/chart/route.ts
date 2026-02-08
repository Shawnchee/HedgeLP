import { NextResponse } from "next/server";
import { COINGECKO_BASE_URL, CACHE_TIMING } from "@/lib/constants";
import { sanitizeCoinId, sanitizeChartDays } from "@/lib/sanitize";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = sanitizeCoinId(searchParams.get("id") || "ethereum");
    const days = sanitizeChartDays(searchParams.get("days") || "7");

    try {
        const response = await fetch(
            `${COINGECKO_BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
            {
                headers: { Accept: "application/json" },
                next: { revalidate: CACHE_TIMING.SERVER_CHART_REVALIDATE },
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch chart data:", error);
        return NextResponse.json(
            { error: "Failed to fetch chart" },
            { status: 502 }
        );
    }
}
