import { NextResponse } from "next/server";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET() {
    try {
        const response = await fetch(`${COINGECKO_BASE}/global`, {
            headers: {
                "Accept": "application/json",
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
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
            { status: 500 }
        );
    }
}
