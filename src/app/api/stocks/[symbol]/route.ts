import { NextRequest, NextResponse } from "next/server";
import { getStockData } from "@/lib/api/stock";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "1mo";
  
  try {
    const data = await getStockData(symbol, range);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
