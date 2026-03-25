"use client";

import { useEffect, useState } from "react";
import { useStockStore } from "@/store/useStockStore";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Trash2, ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function WatchlistPage() {
  const { watchlist, fetchWatchlist, removeFromWatchlist } = useStockStore();
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchWatchlist();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (watchlist.length === 0) {
        setStocks([]);
        return;
      }
      try {
        const promises = watchlist.map(item => axios.get(`/api/stocks/${item.symbol}`));
        const responses = await Promise.all(promises);
        setStocks(responses.map(r => r.data));
      } catch (error) {
        console.error("Failed to fetch watchlist quotes:", error);
      }
    };

    if (watchlist.length > 0) fetchQuotes();
  }, [watchlist]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-8 space-y-8 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tighter">My Watchlist</h1>
              <p className="text-muted-foreground font-medium">Monitor your favorite stocks in real-time</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Star className="w-6 h-6 text-primary fill-primary/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => (
              <WatchlistCard 
                key={stock.quote.symbol} 
                stock={stock} 
                onRemove={() => removeFromWatchlist(stock.quote.symbol)} 
              />
            ))}

            {stocks.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center space-y-4 rounded-3xl border-2 border-dashed border-muted/50">
                <div className="flex justify-center">
                  <Star className="w-12 h-12 text-muted-foreground/30" />
                </div>
                <p className="text-xl font-bold text-muted-foreground">Your watchlist is empty</p>
                <Link href="/dashboard">
                  <Button variant="outline" className="rounded-full px-8">Browse Stocks</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function WatchlistCard({ stock, onRemove }: { stock: any, onRemove: () => void }) {
  const quote = stock.quote;
  const isPositive = quote.change >= 0;

  return (
    <Card className="shadow-lg border-muted/50 hover:border-primary/30 transition-all group overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold">{quote.symbol}</CardTitle>
          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{quote.name}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <p className="text-3xl font-black tabular-nums tracking-tighter">${quote.price.toFixed(2)}</p>
          <div className={`flex items-center text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            {quote.changePercent.toFixed(2)}%
          </div>
        </div>
        
        <div className="pt-4 border-t border-muted/30 flex justify-between items-center">
          <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 h-5 border-muted-foreground/20 bg-muted/20">
            {quote.exchange}
          </Badge>
          <Link href={`/dashboard`}>
            <Button variant="ghost" size="sm" className="h-8 gap-2 text-primary font-bold hover:bg-primary/10 rounded-full">
              View Chart
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
