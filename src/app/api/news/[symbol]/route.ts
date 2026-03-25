import { NextRequest, NextResponse } from "next/server";
import { fetchNews, getAggregatedSentiment } from "@/lib/api/news";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  
  try {
    const news = await fetchNews(symbol);
    const sentiment = getAggregatedSentiment(news);

    return NextResponse.json({ news, sentiment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
