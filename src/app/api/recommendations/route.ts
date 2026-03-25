import { NextResponse } from "next/server";
import { runPrediction, HistoryPoint } from "@/lib/api/prediction-engine";
import { runLSTMPrediction } from "@/lib/api/lstm-engine";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

// ============ MARKET SEGMENT STOCK LISTS ============

const NIFTY_50 = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "BHARTIARTL.NS",
  "INFY.NS", "ITC.NS", "LT.NS", "SBIN.NS", "BAJFINANCE.NS",
  "KOTAKBANK.NS", "AXISBANK.NS", "M&M.NS", "HINDUNILVR.NS", "MARUTI.NS",
  "ASIANPAINT.NS", "SUNPHARMA.NS", "TITAN.NS", "TATASTEEL.NS", "ULTRACEMCO.NS",
  "TATAMOTORS.NS", "NTPC.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "NESTLEIND.NS",
  "ADANIENT.NS", "ONGC.NS", "WIPRO.NS", "HCLTECH.NS", "JSWSTEEL.NS",
  "GRASIM.NS", "HINDALCO.NS", "COALINDIA.NS", "ADANIPORTS.NS",
  "DRREDDY.NS", "BRITANNIA.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS", "INDUSINDBK.NS",
  "TATACONSUM.NS", "BPCL.NS", "HEROMOTOCO.NS", "DIVISLAB.NS", "CIPLA.NS",
  "UPL.NS", "TECHM.NS", "APOLLOHOSP.NS", "HDFCLIFE.NS", "SBILIFE.NS"
];

const NIFTY_BANK = [
  "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
  "INDUSINDBK.NS", "BANKBARODA.NS", "PNB.NS", "FEDERALBNK.NS", "IDFCFIRSTB.NS",
  "BANDHANBNK.NS", "AUBANK.NS"
];

const LARGE_CAP = [
  "HAL.NS", "VEDL.NS", "DABUR.NS", "GODREJCP.NS", "PIDILITIND.NS",
  "HAVELLS.NS", "AMBUJACEM.NS", "DLF.NS", "SIEMENS.NS", "ABB.NS",
  "TRENT.NS", "JIOFIN.NS", "ZOMATO.NS", "IOC.NS", "IRCTC.NS"
];

const SMALL_CAP = [
  "IDEA.NS", "SUZLON.NS", "IRFC.NS", "NHPC.NS", "YESBANK.NS",
  "ZEEL.NS", "NATIONALUM.NS", "SAIL.NS", "GMRINFRA.NS", "NBCC.NS",
  "HUDCO.NS", "RVNL.NS", "BEL.NS", "SJVN.NS", "RECLTD.NS"
];

type SegmentKey = "nifty50" | "niftybank" | "largecap" | "smallcap";

const SEGMENT_MAP: Record<SegmentKey, string[]> = {
  nifty50: NIFTY_50,
  niftybank: NIFTY_BANK,
  largecap: LARGE_CAP,
  smallcap: SMALL_CAP,
};

// Per-segment + per-model in-memory cache
const segmentCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60; // 1 Hour

async function fetchHistoryForSymbol(symbol: string): Promise<{ symbol: string; history: HistoryPoint[] } | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    const chartResult = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1d",
    });

    if (!chartResult || !chartResult.quotes || chartResult.quotes.length === 0) {
      return null;
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

    return { symbol, history };
  } catch (error) {
    console.error(`Error fetching history for ${symbol}`);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segment = (searchParams.get("segment") || "nifty50") as SegmentKey;
  const model = searchParams.get("model") || "ensemble"; // 'ensemble' or 'lstm'
  const stocks = SEGMENT_MAP[segment] || NIFTY_50;

  // Cache key includes both segment and model
  const cacheKey = `${segment}_${model}`;
  const now = Date.now();
  const cached = segmentCache[cacheKey];
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Fetch live quotes using bulk request
    let quotes: any[] = [];
    try {
      quotes = await yahooFinance.quote(stocks);
    } catch(e) {
      console.error("Bulk quote fetch failed:", e);
    }
    
    const quoteMap = new Map();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q);
    }

    // 2. Fetch history in batches of 10
    const allHistories = [];
    const batchSize = 10;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batchSymbols = stocks.slice(i, i + batchSize);
      const batchPromises = batchSymbols.map(sym => fetchHistoryForSymbol(sym));
      const batchResults = await Promise.all(batchPromises);
      allHistories.push(...batchResults.filter(Boolean));
      await new Promise((r) => setTimeout(r, 200));
    }

    // 3. Process predictions
    const predictions = [];

    for (const data of allHistories) {
      if (!data) continue;
      
      const { symbol, history } = data;
      const quote = quoteMap.get(symbol);
      
      if (quote && quote.regularMarketPrice && history.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const lastPoint = history[history.length - 1];

        if (lastPoint.date === todayStr) {
          lastPoint.close = quote.regularMarketPrice;
        } else {
          history.push({
            date: todayStr,
            open: quote.regularMarketPrice,
            high: quote.regularMarketPrice,
            low: quote.regularMarketPrice,
            close: quote.regularMarketPrice,
            volume: 0, 
          });
        }
      }

      try {
        const minDataPoints = model === 'lstm' ? 61 : 30;
        if (history.length >= minDataPoints) {
          // Run prediction based on selected model
          const result = model === 'lstm' 
            ? await runLSTMPrediction(history, symbol)
            : runPrediction(history, symbol, 7);
          
          const currentPrice = result.currentPrice;
          const targetPrice = result.predictions[result.predictions.length - 1].predicted;
          const projectedYield = ((targetPrice - currentPrice) / currentPrice) * 100;
          
          const bullishCount = result.modelBreakdown.filter(m => m.signal === 'BULLISH').length;

          predictions.push({
            symbol: quote?.shortName || quote?.longName || symbol,
            ticker: symbol,
            price: currentPrice,
            confidence: result.confidence,
            projectedYield,
            bullishCount,
            adx: result.technicals.adx,
            modelType: model,
            overallScore: (bullishCount * 20) + (result.confidence * 100) + Math.min(projectedYield * 5, 50) 
          });
        }
      } catch (e) {
        // Skip stock if prediction fails
      }
    }

    // 4. Sort to find best Buy and best Sell
    const sortedDesc = [...predictions].sort((a, b) => b.overallScore - a.overallScore);
    const topBuys = sortedDesc.slice(0, 5);

    const sortedAsc = [...predictions].sort((a, b) => a.overallScore - b.overallScore);
    const topSells = model === 'lstm'
      ? sortedAsc.filter(p => p.projectedYield < 0).slice(0, 5)
      : sortedAsc.filter(p => p.bullishCount <= 2 && p.projectedYield < 0).slice(0, 5);

    const responseJSON = {
      segment,
      model,
      timestamp: now,
      topBuys,
      topSells,
    };

    segmentCache[cacheKey] = { data: responseJSON, timestamp: now };

    return NextResponse.json(responseJSON);
  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
