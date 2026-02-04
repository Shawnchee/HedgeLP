import { NextResponse } from "next/server";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids") || "";
    
    try {
        const response = await fetch(
            `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currency=usd`,
            {
                headers: {
                    "Accept": "application/json",
                },
                next: { revalidate: 15 }, // Cache for 15 seconds
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
            { status: 500 }
        );
    }
}
