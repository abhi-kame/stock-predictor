"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, BrainCircuit, Loader2, ArrowRight } from "lucide-react";
import { useStockStore } from "@/store/useStockStore";
import { Skeleton } from "@/components/ui/skeleton";

interface Recommendation {
  symbol: string;
  ticker: string;
  price: number;
  confidence: number;
  projectedYield: number;
  bullishCount: number;
  adx: number;
}

export function AIRecommendations() {
  const [data, setData] = useState<{ topBuys: Recommendation[], topSells: Recommendation[], timestamp: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { setSelectedSymbol } = useStockStore();

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await axios.get("/api/recommendations");
        setData(res.data);
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const handleSelect = (ticker: string) => {
    setSelectedSymbol(ticker);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <Card className="border-primary/20 shadow-xl overflow-hidden animate-fade-in group">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-4 border-b border-primary/10">
          <div className="flex gap-2">
             <BrainCircuit className="w-5 h-5 text-primary animate-pulse" />
             <Skeleton className="h-5 w-48" />
          </div>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (!data.topBuys.length && !data.topSells.length)) return null;

  return (
    <Card className="border-primary/20 shadow-xl overflow-hidden animate-fade-in group relative">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Target className="w-32 h-32" />
      </div>

      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-4 border-b border-primary/10 relative z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <div className="relative">
              <BrainCircuit className="w-5 h-5 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full animate-pulse" />
            </div>
            NIFTY 50 AI SCREENER
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Live Scan Active</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 relative z-10">
        <p className="text-xs text-muted-foreground mb-4">
          Our advanced ensemble engine analyzes all 50 underlying Nifty stocks 
          to identify the highest statistical probability breakouts and breakdowns.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TOP BUYS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-black text-emerald-500 tracking-wider uppercase">Top 5 Strong Buys</h3>
            </div>
            {data.topBuys.map((rec) => (
              <RecommendationRow key={rec.ticker} rec={rec} isBuy={true} onClick={() => handleSelect(rec.ticker)} />
            ))}
          </div>

          {/* TOP SELLS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-black text-rose-500 tracking-wider uppercase">Top 5 Strong Sells</h3>
            </div>
            {data.topSells.map((rec) => (
              <RecommendationRow key={rec.ticker} rec={rec} isBuy={false} onClick={() => handleSelect(rec.ticker)} />
            ))}
            {data.topSells.length === 0 && (
               <div className="h-14 flex items-center justify-center border border-dashed border-rose-500/20 rounded-xl bg-rose-500/5">
                 <p className="text-xs text-muted-foreground font-medium">No strong sell signals detected currently.</p>
               </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationRow({ rec, isBuy, onClick }: { rec: Recommendation; isBuy: boolean; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 group/row
        ${isBuy 
          ? "bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/10" 
          : "bg-rose-500/5 border-rose-500/10 hover:border-rose-500/30 hover:bg-rose-500/10"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg font-black text-[10px] ${isBuy ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"}`}>
          {Math.round(rec.confidence * 100)}%
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight">{rec.ticker.replace('.NS', '')}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{rec.symbol}</p>
        </div>
      </div>

      <div className="text-right flex items-center gap-4">
        <div>
          <p className={`text-sm font-bold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isBuy ? '+' : ''}{rec.projectedYield.toFixed(2)}%
          </p>
          <div className="flex gap-0.5 justify-end mt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full ${
                  i < (isBuy ? rec.bullishCount : 6 - rec.bullishCount) 
                    ? (isBuy ? 'bg-emerald-500' : 'bg-rose-500') 
                    : 'bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        </div>
        
        <ArrowRight className="w-4 h-4 text-muted-foreground/50 opacity-0 -ml-2 group-hover/row:opacity-100 group-hover/row:ml-0 transition-all" />
      </div>
    </div>
  );
}
