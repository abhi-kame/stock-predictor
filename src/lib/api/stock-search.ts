import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();

export const searchStocks = async (query: string) => {
  try {
    const result: any = await yahooFinance.search(query, {
      newsCount: 0,
    });

    const quotes = result.quotes || [];

    return quotes
      .filter((q: any) => q.isYahooFinance && (q.quoteType === "EQUITY" || q.quoteType === "ETF"))
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || "Unknown",
        type: q.quoteType || "Equity",
      }))
      .slice(0, 15);
  } catch (error) {
    console.error(`Error searching stocks for ${query}:`, error);
    return [];
  }
};
