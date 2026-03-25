import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, Star, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStockStore } from "@/store/useStockStore";
import { useState } from "react";
import { AlertDialog } from "./alert-dialog";

import { Skeleton } from "@/components/ui/skeleton";

export function StockHeader({ quote }: { quote: any }) {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStockStore();
  const [alertOpen, setAlertOpen] = useState(false);

  if (!quote) return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-col md:items-end gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );

  const isPositive = quote.change >= 0;
  const inWatchlist = watchlist.some((item) => item.symbol === quote.symbol);

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await removeFromWatchlist(quote.symbol);
    } else {
      await addToWatchlist(quote.symbol, quote.name);
    }
  };

  const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return "N/A";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: quote.currency || 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatCompact = (val: number) => {
    if (val === undefined || val === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short'
    }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight">{quote.name}</h1>
            <Badge variant="outline" className="text-xs font-mono px-2 py-0 h-5 border-primary/20 bg-primary/5 text-primary">
              {quote.exchange}
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground font-medium flex items-center gap-2">
            {quote.symbol}
            <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-sm">{quote.currency}</span>
          </p>
        </div>

        <div className="flex flex-col md:items-end gap-1">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black tabular-nums">{formatCurrency(quote.price)}</span>
            <div className={`flex items-center text-lg font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {isPositive ? <ArrowUpIcon className="w-5 h-5 mr-0.5" /> : <ArrowDownIcon className="w-5 h-5 mr-0.5" />}
              {Math.abs(quote.change).toFixed(2)} ({typeof quote.changePercent === 'number' ? quote.changePercent.toFixed(2) : parseFloat(quote.changePercent) ? parseFloat(quote.changePercent).toFixed(2) : quote.changePercent}%)
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button 
              variant={inWatchlist ? "secondary" : "outline"} 
              size="sm" 
              className={`h-8 gap-2 rounded-full border-muted-foreground/20 ${inWatchlist ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
              onClick={toggleWatchlist}
            >
              <Star className={`h-3.5 w-3.5 ${inWatchlist ? 'fill-primary' : ''}`} />
              {inWatchlist ? "Saved" : "Watchlist"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2 rounded-full border-muted-foreground/20"
              onClick={() => setAlertOpen(true)}
            >
              <Bell className="h-3.5 w-3.5" />
              Set Alert
            </Button>
          </div>
        </div>
      </div>
      
      <AlertDialog 
        open={alertOpen} 
        onOpenChange={setAlertOpen} 
        symbol={quote.symbol} 
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard label="Market Cap" value={formatCompact(quote.marketCap)} />
        <MetricCard label="P/E Ratio" value={quote.peRatio?.toFixed(2) || "N/A"} />
        <MetricCard label="Avg Volume" value={formatCompact(quote.volume)} />
        <MetricCard label="52W High" value={formatCurrency(quote.fiftyTwoWeekHigh)} />
        <MetricCard label="52W Low" value={formatCurrency(quote.fiftyTwoWeekLow)} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-muted/40 shadow-none">
      <CardContent className="p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
