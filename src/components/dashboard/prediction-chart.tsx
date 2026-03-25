"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { BrainCircuit, Zap, TrendingUp, TrendingDown, Target, BarChart3, Activity, Layers, ArrowUpRight, ArrowDownRight, Minus, Shield, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockStore } from "@/store/useStockStore";

interface DayPrediction {
  day: number;
  date: string;
  predicted: number;
  low: number;
  high: number;
}

interface TradingSignal {
  name: string;
  signal: string;
  value: number;
  description: string;
}

interface ModelPrediction {
  name: string;
  prediction: number;
  weight: number;
  signal: string;
}

interface TechnicalSummary {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma20: number;
  sma50: number;
  ema9: number;
  ema21: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  atr: number;
  vwap: number;
  adx: number;
  obvTrend: string;
}

interface PredictionData {
  symbol: string;
  currentPrice: number;
  predictions: DayPrediction[];
  confidence: number;
  signals: TradingSignal[];
  insight: string;
  technicals: TechnicalSummary;
  modelBreakdown: ModelPrediction[];
}

const signalColors: Record<string, string> = {
  STRONG_BUY: "text-emerald-400",
  BUY: "text-emerald-500",
  NEUTRAL: "text-amber-400",
  SELL: "text-rose-400",
  STRONG_SELL: "text-rose-500",
  BULLISH: "text-emerald-400",
  BEARISH: "text-rose-400",
};

const signalBg: Record<string, string> = {
  STRONG_BUY: "bg-emerald-500/10 border-emerald-500/20",
  BUY: "bg-emerald-500/10 border-emerald-500/20",
  NEUTRAL: "bg-amber-500/10 border-amber-500/20",
  SELL: "bg-rose-500/10 border-rose-500/20",
  STRONG_SELL: "bg-rose-500/10 border-rose-500/20",
};

const signalIcons: Record<string, React.ReactNode> = {
  STRONG_BUY: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />,
  BUY: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />,
  NEUTRAL: <Minus className="w-3.5 h-3.5 text-amber-400" />,
  SELL: <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />,
  STRONG_SELL: <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />,
};

export function PredictionChart({
  symbol,
  history,
}: {
  symbol: string;
  history: any[];
}) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecast" | "signals" | "models">("forecast");
  const { aiModel, setAiModel } = useStockStore();

  useEffect(() => {
    const fetchPrediction = async () => {
      setLoading(true);
      try {
        const res = await axios.post(`/api/predict/${symbol}?model=${aiModel}`);
        setPrediction(res.data);
      } catch (error) {
        console.error("Prediction fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };

    if (symbol) fetchPrediction();
  }, [symbol, aiModel]);

  if (loading)
    return (
      <Card className="shadow-2xl border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden relative">
        <div className="absolute top-4 right-4 animate-pulse">
           <Zap className="w-6 h-6 text-primary" />
        </div>
        <CardHeader className="flex flex-row items-center justify-between pb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Skeleton className="md:col-span-3 h-[380px] rounded-2xl" />
            <div className="md:col-span-1 space-y-5">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );

  if (!prediction) return null;

  const changePct =
    ((prediction.predictions[0]?.predicted - prediction.currentPrice) /
      prediction.currentPrice) *
    100;
  const isBullish = changePct > 0;

  const historySlice = history?.slice(-15) || [];
  const chartData = [
    ...historySlice.map((h) => ({
      date: new Date(h.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      actual: h.close,
      predicted: null as number | null,
      high: null as number | null,
      low: null as number | null,
    })),
    {
      date: "Today",
      actual: prediction.currentPrice,
      predicted: prediction.currentPrice,
      high: null,
      low: null,
    },
    ...prediction.predictions.map((p) => ({
      date: new Date(p.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      actual: null as number | null,
      predicted: p.predicted,
      high: p.high,
      low: p.low,
    })),
  ];

  const bullishModels = prediction.modelBreakdown.filter(
    (m) => m.signal === "BULLISH"
  ).length;
  const totalModels = prediction.modelBreakdown.length;

  return (
    <Card className="shadow-2xl border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-[0.06]">
        <BrainCircuit className="w-40 h-40 text-primary" />
      </div>
      <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <CardHeader className="relative z-10 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <div className="relative">
                <BrainCircuit className="w-6 h-6 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-md rounded-full animate-pulse" />
              </div>
              {aiModel === 'lstm' ? 'TensorFlow LSTM Deep Learning' : 'StockAI Ensemble Intelligence'}
            </CardTitle>
            <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-2">
              <span>{aiModel === 'lstm' ? 'Sequence Prediction' : `6-Model Ensemble • ${bullishModels}/${totalModels} Bullish`}</span>
              <span className="hidden sm:inline">•</span>
              <div className="flex bg-muted rounded-full p-0.5 border border-muted-foreground/20 self-start sm:self-auto">
                <button 
                  onClick={() => setAiModel('ensemble')}
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all ${aiModel === 'ensemble' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Math Ensemble
                </button>
                <button 
                  onClick={() => setAiModel('lstm')}
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 ${aiModel === 'lstm' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Zap className="w-2.5 h-2.5" />
                  LSTM NeuNet
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`font-bold px-3 py-1.5 rounded-full text-xs ${
                prediction.confidence >= 0.7
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : prediction.confidence >= 0.5
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <Shield className="w-3 h-3 mr-1" />
              {(prediction.confidence * 100).toFixed(0)}% CONFIDENCE
            </Badge>
            <Badge
              variant="outline"
              className={`font-bold px-3 py-1.5 rounded-full text-xs ${
                isBullish
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              {isBullish ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {isBullish ? "BULLISH" : "BEARISH"} {Math.abs(changePct).toFixed(2)}%
            </Badge>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-muted/30 rounded-xl w-fit">
          {(
            [
              { key: "forecast", label: "Forecast", icon: <Target className="w-3.5 h-3.5" /> },
              { key: "signals", label: "Signals", icon: <Activity className="w-3.5 h-3.5" /> },
              { key: "models", label: "Models", icon: <Layers className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-2">
        {/* FORECAST TAB */}
        {activeTab === "forecast" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chart */}
            <div className="lg:col-span-3 h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={isBullish ? "#10b981" : "#ef4444"}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={isBullish ? "#10b981" : "#ef4444"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="confGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted))"
                    strokeOpacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    hide
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "16px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                      border: "1px solid hsl(var(--border) / 0.5)",
                      backdropFilter: "blur(12px)",
                      fontSize: "12px",
                    }}
                    labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
                    formatter={(value: any, name: any) => {
                      if (value === null) return ["-", name];
                      return [
                        `₹${Number(value).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`,
                        name,
                      ];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                  {/* Confidence band */}
                  <Area
                    name="Confidence Band"
                    type="monotone"
                    dataKey="high"
                    stroke="none"
                    fill="url(#confGradient)"
                    fillOpacity={1}
                    connectNulls={false}
                  />
                  <Area
                    name=" "
                    type="monotone"
                    dataKey="low"
                    stroke="none"
                    fill="transparent"
                    connectNulls={false}
                    legendType="none"
                  />
                  {/* Actual price */}
                  <Line
                    name="Actual Price"
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--foreground))" }}
                    activeDot={{ r: 5 }}
                    connectNulls={false}
                  />
                  {/* Predicted */}
                  <Line
                    name="AI Prediction"
                    type="monotone"
                    dataKey="predicted"
                    stroke={isBullish ? "#10b981" : "#ef4444"}
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{
                      r: 5,
                      fill: isBullish ? "#10b981" : "#ef4444",
                      strokeWidth: 2,
                      stroke: "white",
                    }}
                    activeDot={{ r: 7 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Right sidebar stats */}
            <div className="lg:col-span-1 space-y-4">
              {/* Target price */}
              <div className="p-4 rounded-2xl bg-background/60 backdrop-blur-md border border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3 text-primary" />
                  Next-Day Target
                </p>
                <p
                  className={`text-2xl font-black tracking-tighter ${
                    isBullish ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ₹
                  {prediction.predictions[0]?.predicted.toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    Range: ₹
                    {prediction.predictions[0]?.low.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    — ₹
                    {prediction.predictions[0]?.high.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* 7-Day forecast summary */}
              <div className="p-4 rounded-2xl bg-background/60 backdrop-blur-md border border-primary/10 shadow-sm">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-3 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3 text-blue-400" />
                  7-Day Forecast
                </p>
                <div className="space-y-2">
                  {prediction.predictions.slice(0, 5).map((p) => {
                    const dayChange =
                      ((p.predicted - prediction.currentPrice) /
                        prediction.currentPrice) *
                      100;
                    return (
                      <div
                        key={p.day}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground font-medium">
                          Day {p.day}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold tabular-nums">
                            ₹{p.predicted.toFixed(2)}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              dayChange > 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {dayChange > 0 ? "+" : ""}
                            {dayChange.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key technicals */}
              <div className="p-4 rounded-2xl bg-background/60 backdrop-blur-md border border-primary/10 shadow-sm">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-3 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-400" />
                  Key Levels
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VWAP</span>
                    <span className="font-bold tabular-nums">
                      ₹{prediction.technicals.vwap.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BB Upper</span>
                    <span className="font-bold tabular-nums text-rose-400">
                      ₹{prediction.technicals.bollingerUpper.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BB Lower</span>
                    <span className="font-bold tabular-nums text-emerald-400">
                      ₹{prediction.technicals.bollingerLower.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ATR</span>
                    <span className="font-bold tabular-nums">
                      ₹{prediction.technicals.atr.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SIGNALS TAB */}
        {activeTab === "signals" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prediction.signals.map((signal) => (
                <div
                  key={signal.name}
                  className={`p-4 rounded-2xl border transition-all hover:scale-[1.02] ${
                    signalBg[signal.signal] || "bg-muted/20 border-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold">{signal.name}</span>
                    <div className="flex items-center gap-1">
                      {signalIcons[signal.signal]}
                      <span
                        className={`text-[10px] font-black ${
                          signalColors[signal.signal] || "text-muted-foreground"
                        }`}
                      >
                        {signal.signal.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-black tabular-nums mb-1">
                    {typeof signal.value === 'number' && signal.value > 1000
                      ? signal.value.toLocaleString()
                      : signal.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Technical Indicator Grid */}
            <div className="p-5 rounded-2xl bg-muted/10 border border-muted/30">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-4">
                Technical Indicators
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "RSI (14)", value: prediction.technicals.rsi, highlight: prediction.technicals.rsi > 70 || prediction.technicals.rsi < 30 },
                  { label: "MACD", value: prediction.technicals.macd },
                  { label: "ADX", value: prediction.technicals.adx },
                  { label: "SMA 20", value: `₹${prediction.technicals.sma20.toFixed(2)}` },
                  { label: "SMA 50", value: `₹${prediction.technicals.sma50.toFixed(2)}` },
                  { label: "EMA 9", value: `₹${prediction.technicals.ema9.toFixed(2)}` },
                  { label: "EMA 21", value: `₹${prediction.technicals.ema21.toFixed(2)}` },
                  { label: "OBV Trend", value: prediction.technicals.obvTrend, isLabel: true },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                      {item.label}
                    </p>
                    <p
                      className={`text-sm font-black tabular-nums ${
                        (item as any).highlight
                          ? "text-amber-400"
                          : (item as any).isLabel
                          ? item.value === "BULLISH"
                            ? "text-emerald-400"
                            : item.value === "BEARISH"
                            ? "text-rose-400"
                            : "text-amber-400"
                          : ""
                      }`}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODELS TAB */}
        {activeTab === "models" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prediction.modelBreakdown.map((model) => {
                const modelChange =
                  ((model.prediction - prediction.currentPrice) /
                    prediction.currentPrice) *
                  100;
                return (
                  <div
                    key={model.name}
                    className="p-4 rounded-2xl bg-background/60 backdrop-blur-md border border-muted/30 hover:border-primary/20 transition-all hover:scale-[1.02] group/card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold">{model.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          model.signal === "BULLISH"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        }`}
                      >
                        {model.signal}
                      </Badge>
                    </div>
                    <p
                      className={`text-2xl font-black tabular-nums ${
                        model.signal === "BULLISH"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      ₹{model.prediction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-[10px] font-bold ${
                          modelChange > 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {modelChange > 0 ? "+" : ""}
                        {modelChange.toFixed(2)}%
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">
                          Weight:
                        </span>
                        <div className="w-16 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${model.weight * 100}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {(model.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Insight */}
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-primary fill-primary/30" />
                </div>
                <div>
                  <p className="text-[10px] text-primary uppercase font-black tracking-widest mb-2">
                    Ensemble Analysis
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-foreground/80">
                    {prediction.insight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
