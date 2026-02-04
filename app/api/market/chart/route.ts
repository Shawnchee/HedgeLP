import { NextResponse } from "next/server";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "ethereum";
    const days = searchParams.get("days") || "7";
    
    try {
        const response = await fetch(
            `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
            {
                headers: {
                    "Accept": "application/json",
                },
                next: { revalidate: 60 }, // Cache for 1 minute
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
            { status: 500 }
        );
    }
}
