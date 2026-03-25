"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Target, BrainCircuit, ArrowRight, Landmark,
  Building2, BarChart3, Rocket, Cpu, Calculator, X, ArrowUpIcon, ArrowDownIcon,
  Loader2, ChevronRight, Activity, TrendingUpIcon
} from "lucide-react";
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

interface SegmentData {
  topBuys: Recommendation[];
  topSells: Recommendation[];
  timestamp: number;
  segment: string;
  model: string;
}

interface StockDetail {
  quote: any;
  loading: boolean;
}

const SEGMENTS = [
  { key: "nifty50", label: "Nifty 50", icon: Landmark, description: "Top 50 blue-chip stocks from the NSE Nifty index", color: "from-blue-500 to-indigo-500" },
  { key: "niftybank", label: "Nifty Bank", icon: Building2, description: "Major banking sector stocks from the Nifty Bank index", color: "from-amber-500 to-orange-500" },
  { key: "largecap", label: "Large Cap", icon: BarChart3, description: "High market-cap stocks beyond Nifty 50 with strong fundamentals", color: "from-emerald-500 to-teal-500" },
  { key: "smallcap", label: "Small Cap", icon: Rocket, description: "High-growth small-cap stocks with breakout potential", color: "from-violet-500 to-purple-500" },
] as const;

type SegmentKey = typeof SEGMENTS[number]["key"];
type ModelType = "ensemble" | "lstm";

export function AIRecommendations() {
  const [activeSegment, setActiveSegment] = useState<SegmentKey>("nifty50");
  const [activeModel, setActiveModel] = useState<ModelType>("ensemble");
  const [cache, setCache] = useState<Record<string, SegmentData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<Recommendation | null>(null);
  const [stockDetail, setStockDetail] = useState<StockDetail>({ quote: null, loading: false });
  const { setSelectedSymbol } = useStockStore();

  const cacheKey = `${activeSegment}_${activeModel}`;
  const currentSegment = SEGMENTS.find(s => s.key === activeSegment)!;
  const data = cache[cacheKey] ?? null;

  const fetchSegment = useCallback(async (segment: SegmentKey, model: ModelType) => {
    const key = `${segment}_${model}`;
    if (cache[key]) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/api/recommendations?segment=${segment}&model=${model}`);
      setCache(prev => ({ ...prev, [key]: res.data }));
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    fetchSegment(activeSegment, activeModel);
  }, [activeSegment, activeModel, fetchSegment]);

  // Fetch stock detail when a stock is selected
  const fetchStockDetail = useCallback(async (ticker: string) => {
    setStockDetail({ quote: null, loading: true });
    try {
      const res = await axios.get(`/api/stocks/${ticker}?range=1mo`);
      setStockDetail({ quote: res.data.quote, loading: false });
    } catch (error) {
      console.error("Failed to fetch stock detail:", error);
      setStockDetail({ quote: null, loading: false });
    }
  }, []);

  const handleStockClick = (rec: Recommendation) => {
    setSelectedStock(rec);
    fetchStockDetail(rec.ticker);
  };

  const handleViewOnDashboard = () => {
    if (selectedStock) {
      setSelectedSymbol(selectedStock.ticker);
      setSelectedStock(null);
      // Navigate to dashboard
      window.location.href = "/dashboard";
    }
  };

  const formatCurrency = (val: number) => {
    if (val === undefined || val === null) return "N/A";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
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
    <div className="space-y-4">
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
              AI MARKET SCREENER
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Model Toggle */}
              <div className="flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setActiveModel("ensemble")}
                  className={`text-[9px] px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    activeModel === "ensemble"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calculator className="w-3 h-3" />
                  Math
                </button>
                <button
                  onClick={() => setActiveModel("lstm")}
                  className={`text-[9px] px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                    activeModel === "lstm"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  TensorFlow
                </button>
              </div>

              {/* Live indicator */}
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase hidden sm:block">Live Scan</span>
              </div>
            </div>
          </div>

          {/* Segment Tabs */}
          <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-hide">
            {SEGMENTS.map(seg => {
              const Icon = seg.icon;
              const isActive = activeSegment === seg.key;
              return (
                <button
                  key={seg.key}
                  onClick={() => setActiveSegment(seg.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap border
                    ${isActive
                      ? `bg-gradient-to-r ${seg.color} text-white border-transparent shadow-lg shadow-primary/10 scale-[1.02]`
                      : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60 hover:text-foreground hover:border-border"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {seg.label}
                </button>
              );
            })}
          </div>
        </CardHeader>
        
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              {currentSegment.description} — {activeModel === "lstm" ? "TensorFlow LSTM deep learning" : "6-model math ensemble"} scan.
            </p>
            <Badge variant="outline" className="text-[9px] font-bold border-primary/20 bg-primary/5 text-primary shrink-0">
              {activeModel === "lstm" ? "LSTM Neural Net" : "Ensemble (6 Models)"}
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>
          ) : !data || (!data.topBuys.length && !data.topSells.length) ? (
            <div className="h-48 flex flex-col items-center justify-center gap-3 border border-dashed border-muted-foreground/20 rounded-xl">
              <BrainCircuit className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">No signals available for this segment yet.</p>
              <p className="text-xs text-muted-foreground/60">The scanner is processing — check back shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TOP BUYS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-black text-emerald-500 tracking-wider uppercase">Top 5 Strong Buys</h3>
                </div>
                {data.topBuys.map((rec) => (
                  <RecommendationRow key={rec.ticker} rec={rec} isBuy={true} onClick={() => handleStockClick(rec)} isSelected={selectedStock?.ticker === rec.ticker} />
                ))}
                {data.topBuys.length === 0 && (
                  <div className="h-14 flex items-center justify-center border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/5">
                    <p className="text-xs text-muted-foreground font-medium">No strong buy signals detected currently.</p>
                  </div>
                )}
              </div>

              {/* TOP SELLS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-black text-rose-500 tracking-wider uppercase">Top 5 Strong Sells</h3>
                </div>
                {data.topSells.map((rec) => (
                  <RecommendationRow key={rec.ticker} rec={rec} isBuy={false} onClick={() => handleStockClick(rec)} isSelected={selectedStock?.ticker === rec.ticker} />
                ))}
                {data.topSells.length === 0 && (
                  <div className="h-14 flex items-center justify-center border border-dashed border-rose-500/20 rounded-xl bg-rose-500/5">
                    <p className="text-xs text-muted-foreground font-medium">No strong sell signals detected currently.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Detail Panel */}
      {selectedStock && (
        <Card className="border-primary/20 shadow-xl overflow-hidden animate-fade-in">
          <CardHeader className="py-3 px-4 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">{selectedStock.ticker.replace('.NS', '')}</CardTitle>
                  <p className="text-[10px] text-muted-foreground">{selectedStock.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleViewOnDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-all"
                >
                  Full Analysis
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setSelectedStock(null)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {stockDetail.loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : stockDetail.quote ? (
              <div className="space-y-4">
                {/* Price Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Price</p>
                    <p className="text-2xl font-black tabular-nums">{formatCurrency(stockDetail.quote.price)}</p>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-sm font-bold ${stockDetail.quote.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {stockDetail.quote.change >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                      {Math.abs(stockDetail.quote.change).toFixed(2)} ({typeof stockDetail.quote.changePercent === 'number' ? stockDetail.quote.changePercent.toFixed(2) : stockDetail.quote.changePercent}%)
                    </div>
                    <Badge className={`text-[9px] mt-1 ${selectedStock.projectedYield > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      AI PROJECTION: {selectedStock.projectedYield > 0 ? '+' : ''}{selectedStock.projectedYield.toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <DetailMetric label="Market Cap" value={formatCompact(stockDetail.quote.marketCap)} />
                  <DetailMetric label="P/E Ratio" value={stockDetail.quote.peRatio?.toFixed(2) || "N/A"} />
                  <DetailMetric label="Volume" value={formatCompact(stockDetail.quote.volume)} />
                  <DetailMetric label="Confidence" value={`${Math.round(selectedStock.confidence * 100)}%`} highlight />
                  <DetailMetric label="52W High" value={formatCurrency(stockDetail.quote.fiftyTwoWeekHigh)} />
                  <DetailMetric label="52W Low" value={formatCurrency(stockDetail.quote.fiftyTwoWeekLow)} />
                  <DetailMetric label="Day High" value={formatCurrency(stockDetail.quote.dayHigh)} />
                  <DetailMetric label="Day Low" value={formatCurrency(stockDetail.quote.dayLow)} />
                </div>

                {/* AI Signal Bar */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-primary/5">
                  <BrainCircuit className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">
                      {activeModel === 'lstm' ? 'TensorFlow LSTM Signal' : 'Ensemble AI Signal'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedStock.bullishCount >= 4
                        ? `Strong bullish consensus (${selectedStock.bullishCount}/6 models bullish). Consider accumulation.`
                        : selectedStock.bullishCount <= 2
                        ? `Bearish signal detected (${6 - selectedStock.bullishCount}/6 models bearish). Caution advised.`
                        : `Mixed signals (${selectedStock.bullishCount}/6 bullish). Await directional clarity.`
                      }
                    </p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < selectedStock.bullishCount ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Failed to load stock details.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2.5 rounded-xl border ${highlight ? 'border-primary/20 bg-primary/5' : 'border-border/50 bg-card/50'}`}>
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

function RecommendationRow({ rec, isBuy, onClick, isSelected }: { rec: Recommendation; isBuy: boolean; onClick: () => void; isSelected?: boolean }) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 group/row
        ${isSelected
          ? "ring-2 ring-primary/50 border-primary/30 bg-primary/5"
          : isBuy 
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
