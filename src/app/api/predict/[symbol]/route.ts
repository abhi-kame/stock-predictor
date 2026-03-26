import { NextRequest, NextResponse } from "next/server";
import { runPrediction, HistoryPoint } from "@/lib/api/prediction-engine";
import { runLSTMPrediction } from "@/lib/api/lstm-engine";
import { runAdvancedLSTMPrediction } from "@/lib/api/advanced-lstm-engine";
import { runGRUPrediction, runCNNPrediction, runHybridCNN_GRUPrediction } from "@/lib/api/gru-cnn-engine";
import { runMetaLearnerPrediction } from "@/lib/api/meta-learner-engine";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

async function fetchHistoryFromYahoo(symbol: string): Promise<HistoryPoint[]> {
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

  if (quoteResult && quoteResult.regularMarketPrice && history.length > 0) {
    const todayStr = new Date().toISOString().split("T")[0];
    const lastPoint = history[history.length - 1];

    if (lastPoint.date === todayStr) {
      lastPoint.close = quoteResult.regularMarketPrice;
      lastPoint.high = Math.max(lastPoint.high ?? 0, lastPoint.close);
      lastPoint.low = Math.min(lastPoint.low ?? lastPoint.close, lastPoint.close);
    } else {
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

async function handlePrediction(symbol: string, modelType: string = "ensemble") {
  const history = await fetchHistoryFromYahoo(symbol);

  if (history.length < 30) {
    throw new Error(
      `Not enough data for ${symbol} (need 30+ days, got ${history.length})`
    );
  }

  switch (modelType) {
    case "lstm":
      return await runLSTMPrediction(history, symbol);
    case "advanced-lstm":
      return await runAdvancedLSTMPrediction(history, symbol, 7);
    case "gru":
      return await runGRUPrediction(history, symbol, 7);
    case "cnn":
      return await runCNNPrediction(history, symbol, 7);
    case "cnn-gru":
      return await runHybridCNN_GRUPrediction(history, symbol, 7);
    case "meta":
      return await runMetaLearnerPrediction(history, symbol, 7);
    case "ensemble":
    default:
      return runPrediction(history, symbol, 7);
  }
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
