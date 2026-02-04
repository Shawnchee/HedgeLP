import { NextResponse } from "next/server";

const DEFILLAMA_BASE = "https://yields.llama.fi";

export async function GET() {
    try {
        const response = await fetch(`${DEFILLAMA_BASE}/pools`, {
            headers: {
                "Accept": "application/json",
            },
            next: { revalidate: 300 }, // Cache for 5 minutes
        });
        
        if (!response.ok) {
            throw new Error(`DeFiLlama API error: ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch pools:", error);
        return NextResponse.json(
            { error: "Failed to fetch pools" },
            { status: 500 }
        );
    }
}
