import { NextRequest, NextResponse } from "next/server";
import { runPrediction, HistoryPoint } from "@/lib/api/prediction-engine";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function fetchHistoryFromYahoo(symbol: string): Promise<HistoryPoint[]> {
  // Fetch ~1 year of daily data for best prediction quality
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  const [chartResult, quoteResult] = await Promise.all([
    yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1d",
    }).catch(() => null),
    yahooFinance.quote(symbol).catch(() => null),
  ]);

  if (!chartResult || !chartResult.quotes || chartResult.quotes.length === 0) {
    throw new Error(`No historical data found for symbol: ${symbol}`);
  }

  const history = chartResult.quotes
    .filter((q: any) => q.close != null)
    .map((q: any) => ({
      date: new Date(q.date).toISOString().split("T")[0],
      open: q.open ?? q.close!,
      high: q.high ?? q.close!,
      low: q.low ?? q.close!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));

  // Sync the last data point with real-time market price if it exists
  if (quoteResult && quoteResult.regularMarketPrice && history.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastPoint = history[history.length - 1];

    if (lastPoint.date === todayStr) {
      lastPoint.close = quoteResult.regularMarketPrice;
      // Also adjust high/low if current price exceeds them
      lastPoint.high = Math.max(lastPoint.high ?? 0, lastPoint.close);
      lastPoint.low = Math.min(lastPoint.low ?? lastPoint.close, lastPoint.close);
    } else {
      // If we don't have today's candle yet, add a synthetic one
      history.push({
        date: todayStr,
        open: quoteResult.regularMarketPrice,
        high: quoteResult.regularMarketPrice,
        low: quoteResult.regularMarketPrice,
        close: quoteResult.regularMarketPrice,
        volume: 0, 
      });
    }
  }

  return history;
}

import { runLSTMPrediction } from "@/lib/api/lstm-engine";

async function handlePrediction(symbol: string, modelType: string = "ensemble") {
  const history = await fetchHistoryFromYahoo(symbol);

  if (history.length < 30) {
    throw new Error(
      `Not enough data for ${symbol} (need 30+ days, got ${history.length})`
    );
  }

  if (modelType === "lstm") {
    return await runLSTMPrediction(history, symbol);
  }

  const result = runPrediction(history, symbol, 7);
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const modelType = searchParams.get("model") || "ensemble";

  try {
    const data = await handlePrediction(symbol, modelType);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Prediction Error:", error.message);
    return NextResponse.json(
      { error: "Prediction failed", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const { searchParams } = new URL(request.url);
  const modelType = searchParams.get("model") || "ensemble";

  try {
    const data = await handlePrediction(symbol, modelType);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Prediction Error:", error.message);
    return NextResponse.json(
      { error: "Prediction failed", details: error.message },
      { status: 500 }
    );
  }
}
