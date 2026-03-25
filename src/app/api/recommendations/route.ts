import { NextResponse } from "next/server";
import { runPrediction, HistoryPoint } from "@/lib/api/prediction-engine";
import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

// All 50 NIFTY 50 Stocks (Yahoo Finance Symbols)
const NIFTY_50 = [
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "BHARTIARTL.NS",
  "INFY.NS", "ITC.NS", "L&TFH.NS", "SBIN.NS", "BAJFINANCE.NS",
  "KOTAKBANK.NS", "AXISBANK.NS", "M&M.NS", "HINDUNILVR.NS", "MARUTI.NS",
  "ASIANPAINT.NS", "SUNPHARMA.NS", "TITAN.NS", "TATASTEEL.NS", "ULTRACEMCO.NS",
  "TATAMOTORS.NS", "NTPC.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "NESTLEIND.NS",
  "ADANIENT.NS", "ONGC.NS", "WIPRO.NS", "HCLTECH.NS", "JSWSTEEL.NS",
  "GRASIM.NS", "TCS.NS", "HINDALCO.NS", "COALINDIA.NS", "ADANIPORTS.NS",
  "DRREDDY.NS", "BRITANNIA.NS", "BAJAJ-AUTO.NS", "EICHERMOT.NS", "INDUSINDBK.NS",
  "TATACONSUM.NS", "BPCL.NS", "HEROMOTOCO.NS", "DIVISLAB.NS", "CIPLA.NS",
  "UPL.NS", "TECHM.NS", "APOLLOHOSP.NS", "HDFCLIFE.NS", "SBILIFE.NS"
];

// In-memory cache to prevent Yahoo Finance ban and ensure ultra-fast load 
let cachedRecommendations: any = null;
let lastCacheTime = 0;
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

export async function GET() {
  const now = Date.now();
  if (cachedRecommendations && (now - lastCacheTime) < CACHE_TTL) {
    return NextResponse.json(cachedRecommendations);
  }

  try {
    // 1. Fetch live quotes for ALL 50 using ONE bulk request!
    // This gives us real-time prices for anchoring.
    let quotes: any[] = [];
    try {
      quotes = await yahooFinance.quote(NIFTY_50);
    } catch(e) {
      console.error("Bulk quote fetch failed:", e);
    }
    
    // Map quotes for quick lookup
    const quoteMap = new Map();
    for (const q of quotes) {
      quoteMap.set(q.symbol, q);
    }

    // 2. Fetch history in batches of 10 to avoid 429 Too Many Requests
    const allHistories = [];
    const batchSize = 10;
    for (let i = 0; i < NIFTY_50.length; i += batchSize) {
      const batchSymbols = NIFTY_50.slice(i, i + batchSize);
      const batchPromises = batchSymbols.map(sym => fetchHistoryForSymbol(sym));
      const batchResults = await Promise.all(batchPromises);
      allHistories.push(...batchResults.filter(Boolean));
      // Slight delay between batches (200ms)
      await new Promise((r) => setTimeout(r, 200));
    }

    // 3. Process predictions
    const predictions = [];

    for (const data of allHistories) {
      if (!data) continue;
      
      const { symbol, history } = data;
      const quote = quoteMap.get(symbol);
      
      // Sync real-time price
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
        if (history.length >= 30) {
          const result = runPrediction(history, symbol, 7);
          
          // Calculate overall projected upside/downside manually
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
            overallScore: (bullishCount * 20) + (result.confidence * 100) + Math.min(projectedYield * 5, 50) 
            // Score formula balances model consensus, prediction confidence, and actual upside
          });
        }
      } catch (e) {
        // Skip stock if prediction fails
      }
    }

    // 4. Sort to find best Buy and best Sell
    // Sort by Score DESC
    const sortedDesc = [...predictions].sort((a, b) => b.overallScore - a.overallScore);
    const topBuys = sortedDesc.slice(0, 5);

    // Sort by Score ASC for Sells (we want strong bearish signals, lowest scores)
    const sortedAsc = [...predictions].sort((a, b) => a.overallScore - b.overallScore);
    // Sells should logically have negative projected yields.
    const topSells = sortedAsc.filter(p => p.bullishCount <= 2 && p.projectedYield < 0).slice(0, 5);

    const responseJSON = {
      timestamp: now,
      topBuys,
      topSells,
    };

    cachedRecommendations = responseJSON;
    lastCacheTime = now;

    return NextResponse.json(responseJSON);
  } catch (error: any) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
