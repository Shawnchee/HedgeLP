import { NextResponse } from "next/server";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids") || "";
    
    try {
        const response = await fetch(
            `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=24h,7d`,
            {
                headers: {
                    "Accept": "application/json",
                },
                next: { revalidate: 30 }, // Cache for 30 seconds
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
            { status: 500 }
        );
    }
}
