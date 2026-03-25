import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

export const getStockData = async (symbol: string, range: string = "1mo") => {
  try {
    // Fetch quote and history in parallel using yahoo-finance2 (completely free)
    let quoteSummary: any = null;
    let chartResult: any = null;

    try {
      quoteSummary = await yahooFinance.quote(symbol);
    } catch (e) {
      console.error("Quote fetch error:", e);
    }

    try {
      chartResult = await yahooFinance.chart(symbol, {
        period1: getStartDate(range),
        period2: new Date().toISOString().split("T")[0],
        interval: "1d",
      });
    } catch (e) {
      console.error("Chart fetch error:", e);
    }

    const history = (chartResult?.quotes || [])
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        open: q.open ?? q.close,
        high: q.high ?? q.close,
        low: q.low ?? q.close,
        close: q.close,
        volume: q.volume ?? 0,
      }));

    const q: any = quoteSummary || {};

    return {
      quote: {
        symbol: q.symbol || symbol,
        price: q.regularMarketPrice || history[history.length - 1]?.close || 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent
          ? `${q.regularMarketChangePercent.toFixed(2)}%`
          : "0%",
        name: q.shortName || q.longName || symbol,
        currency: q.currency || "USD",
        exchange: q.fullExchangeName || q.exchange || "Unknown",
        marketCap: q.marketCap || 0,
        volume: q.regularMarketVolume || 0,
        peRatio: q.trailingPE || 0,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow || 0,
      },
      history,
    };
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);

    // Return mock data for local development if API fails
    const mockPrice = 2500 + Math.random() * 100;
    const mockHistory = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const close = 2400 + Math.random() * 200;
      return {
        date: date.toISOString().split("T")[0],
        open: close - Math.random() * 20,
        high: close + Math.random() * 30,
        low: close - Math.random() * 30,
        close,
        volume: 1000000 + Math.random() * 500000,
      };
    });

    return {
      quote: {
        symbol: symbol,
        price: mockPrice,
        change: 15.5,
        changePercent: "0.65%",
        name: `${symbol} (Offline)`,
        currency: "USD",
        exchange: "N/A",
        marketCap: 0,
        volume: 1200000,
        peRatio: 0,
        fiftyTwoWeekHigh: 2800,
        fiftyTwoWeekLow: 2100,
      },
      history: mockHistory,
    };
  }
};

function getStartDate(range: string): string {
  const now = new Date();
  switch (range) {
    case "1d":
      now.setDate(now.getDate() - 2);
      break;
    case "5d":
      now.setDate(now.getDate() - 7);
      break;
    case "1mo":
      now.setMonth(now.getMonth() - 1);
      break;
    case "3mo":
      now.setMonth(now.getMonth() - 3);
      break;
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      now.setMonth(now.getMonth() - 1);
  }
  return now.toISOString().split("T")[0];
}
