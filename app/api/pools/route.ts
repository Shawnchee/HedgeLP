import { NextResponse } from "next/server";
import { DEFILLAMA_BASE_URL, CACHE_TIMING } from "@/lib/constants";

export async function GET() {
    try {
        const response = await fetch(`${DEFILLAMA_BASE_URL}/pools`, {
            headers: { Accept: "application/json" },
            next: { revalidate: CACHE_TIMING.SERVER_POOLS_REVALIDATE },
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
            { status: 502 }
        );
    }
}
