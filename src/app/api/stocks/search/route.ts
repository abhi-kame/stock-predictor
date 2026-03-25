import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/api/stock-search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) return NextResponse.json([], { status: 400 });

  try {
    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
