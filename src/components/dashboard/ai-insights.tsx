"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Radio,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

import { Skeleton } from "@/components/ui/skeleton";

import { useStockStore } from "@/store/useStockStore";

interface PredictionData {
  currentPrice: number;
  confidence: number;
  predictions: { day: number; predicted: number }[];
  technicals: {
    rsi: number;
    macd: number;
    macdSignal: number;
    adx: number;
    sma20: number;
    sma50: number;
    ema9: number;
    ema21: number;
    atr: number;
    vwap: number;
    obvTrend: string;
  };
  modelBreakdown: { signal: string }[];
  insight: string;
}

export function AIInsights({
  symbol,
  sentiment,
  quote,
}: {
  symbol: string;
  sentiment: any;
  quote: any;
}) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const { aiModel } = useStockStore();

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const res = await axios.post(`/api/predict/${symbol}?model=${aiModel}`);
        setPrediction(res.data);
      } catch (error) {
        console.error("Failed to fetch prediction for insights:", error);
      }
    };

    if (symbol) fetchPrediction();
  }, [symbol, aiModel]);

  if (!quote)
    return (
      <Card className="border-primary/20 shadow-xl overflow-hidden">
        <CardHeader className="bg-primary/5 py-4">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );

  const bullishModels = prediction?.modelBreakdown?.filter(
    (m) => m.signal === "BULLISH"
  ).length ?? 0;
  const totalModels = prediction?.modelBreakdown?.length ?? 6;
  const sentimentScore = sentiment?.score || 0;
  const isBullish = bullishModels >= 4 && sentimentScore >= 0;
  const isBearish = bullishModels <= 2;

  const overallSignal = isBullish
    ? "STRONGLY BULLISH"
    : isBearish
    ? "BEARISH"
    : "NEUTRAL / MIXED";

  // Generate dynamic insights based on real data
  const rsi = prediction?.technicals?.rsi ?? 50;
  const adx = prediction?.technicals?.adx ?? 25;
  const ema9 = prediction?.technicals?.ema9 ?? 0;
  const ema21 = prediction?.technicals?.ema21 ?? 0;
  const sma20 = prediction?.technicals?.sma20 ?? 0;
  const sma50 = prediction?.technicals?.sma50 ?? 0;
  const atr = prediction?.technicals?.atr ?? 0;
  const currentPrice = prediction?.currentPrice ?? quote.price;

  // Technical insight
  const getTechnicalInsight = () => {
    const signals: string[] = [];

    if (ema9 > ema21) {
      signals.push("EMA 9/21 shows bullish crossover");
    } else {
      signals.push("EMA 9/21 shows bearish crossover");
    }

    if (sma20 > sma50) {
      signals.push("Golden cross pattern active (SMA 20 > SMA 50)");
    } else {
      signals.push("Death cross pattern detected (SMA 20 < SMA 50)");
    }

    if (adx > 25) {
      signals.push(`Strong trend (ADX: ${adx.toFixed(1)})`);
    } else {
      signals.push(`Weak trend / range-bound (ADX: ${adx.toFixed(1)})`);
    }

    return signals.join(". ") + ".";
  };

  // RSI insight
  const getRSIInsight = () => {
    if (rsi > 80) return `RSI at ${rsi.toFixed(0)} — extremely overbought. High probability of pullback within 2-3 sessions.`;
    if (rsi > 70) return `RSI at ${rsi.toFixed(0)} — overbought territory. Monitor for reversal signals near resistance.`;
    if (rsi < 20) return `RSI at ${rsi.toFixed(0)} — extremely oversold. Strong bounce potential imminent.`;
    if (rsi < 30) return `RSI at ${rsi.toFixed(0)} — oversold. Accumulation opportunity for swing traders.`;
    if (rsi > 55) return `RSI at ${rsi.toFixed(0)} — bullish momentum. Trend continuation likely.`;
    if (rsi < 45) return `RSI at ${rsi.toFixed(0)} — bearish momentum. Watch for support levels.`;
    return `RSI at ${rsi.toFixed(0)} — neutral zone. Await directional breakout.`;
  };

  // News insight
  const getNewsInsight = () => {
    if (sentimentScore > 1)
      return "Strong positive news sentiment. Multiple sources report favorable developments, institutional interest.";
    if (sentimentScore > 0)
      return "Mildly positive news coverage. Market sentiment leans optimistic with stable outlook.";
    if (sentimentScore < -1)
      return "Negative news sentiment detected. Caution advised — headwinds from market or sector concerns.";
    if (sentimentScore < 0)
      return "Slightly negative news tone. Monitor developments — sentiment shift could impact short-term price.";
    return "Neutral news coverage. No significant catalysts detected in current news cycle.";
  };

  // Recommendation
  const getRecommendation = () => {
    const nextDayPred = prediction?.predictions?.[0]?.predicted ?? currentPrice;
    const expectedChange = ((nextDayPred - currentPrice) / currentPrice) * 100;
    const confidence = prediction?.confidence ?? 0.5;

    if (isBullish && confidence > 0.7) {
      return `${bullishModels}/${totalModels} AI models are bullish. Our ensemble projects +${Math.abs(expectedChange).toFixed(2)}% upside with ${(confidence * 100).toFixed(0)}% confidence. Consider accumulation near ₹${(currentPrice - atr * 0.5).toFixed(2)} support.`;
    }
    if (isBullish) {
      return `Moderate bullish bias (${bullishModels}/${totalModels} models). Expected move of ${expectedChange > 0 ? '+' : ''}${expectedChange.toFixed(2)}%. Use ATR-based stop at ₹${(currentPrice - atr * 1.5).toFixed(2)}.`;
    }
    if (isBearish && confidence > 0.7) {
      return `${totalModels - bullishModels}/${totalModels} models signal bearish. Defensive positioning recommended. Consider tightening stops to ₹${(currentPrice + atr * 0.5).toFixed(2)}.`;
    }
    if (isBearish) {
      return `Bearish tilt (${totalModels - bullishModels}/${totalModels} models). Wait for confirmed breakout above ₹${(currentPrice + atr).toFixed(2)} before entry.`;
    }
    return `Mixed signals (${bullishModels}/${totalModels} bullish). Await clearer direction. Key levels: support ₹${(currentPrice - atr).toFixed(2)}, resistance ₹${(currentPrice + atr).toFixed(2)}.`;
  };

  return (
    <Card className="border-primary/20 shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="relative">
            <Lightbulb className="w-4 h-4 text-primary" />
            <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full animate-pulse" />
          </div>
          AI INSIGHTS ENGINE
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-5 space-y-5">
          {/* Overall signal */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Overall Signal
            </span>
            <Badge
              className={`font-black text-[10px] px-3 py-1 rounded-full ${
                isBullish
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20"
                  : isBearish
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20"
              }`}
            >
              {isBullish ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : isBearish ? (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              ) : null}
              {overallSignal}
            </Badge>
          </div>

          {/* Model consensus bar */}
          {prediction && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground font-bold uppercase tracking-wider">
                  Model Consensus
                </span>
                <span className="font-bold">
                  <span className="text-emerald-400">{bullishModels} Bullish</span>
                  {" / "}
                  <span className="text-rose-400">{totalModels - bullishModels} Bearish</span>
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700"
                  style={{ width: `${(bullishModels / totalModels) * 100}%` }}
                />
                <div
                  className="bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-full transition-all duration-700"
                  style={{
                    width: `${((totalModels - bullishModels) / totalModels) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="space-y-4">
            <InsightItem
              icon={
                <Activity
                  className={`w-4 h-4 ${
                    ema9 > ema21 ? "text-emerald-500" : "text-rose-500"
                  }`}
                />
              }
              title="Technical Analysis"
              description={getTechnicalInsight()}
            />
            <InsightItem
              icon={
                <Gauge
                  className={`w-4 h-4 ${
                    rsi > 60
                      ? "text-amber-500"
                      : rsi < 40
                      ? "text-blue-500"
                      : "text-emerald-500"
                  }`}
                />
              }
              title="RSI Momentum"
              description={getRSIInsight()}
            />
            <InsightItem
              icon={<Radio className="w-4 h-4 text-blue-500" />}
              title="News Sentiment"
              description={getNewsInsight()}
            />
            <InsightItem
              icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
              title="Volatility Risk"
              description={`ATR at ₹${atr.toFixed(2)} suggests ${
                atr / currentPrice > 0.02
                  ? "high volatility — wider stops needed"
                  : "moderate volatility — standard risk parameters"
              }. ${
                adx > 40
                  ? "Trend is very strong — avoid counter-trend trades."
                  : adx > 25
                  ? "Trend is moderate — follow the dominant direction."
                  : "No clear trend — range trading strategies preferred."
              }`}
            />
          </div>

          {/* Recommendation */}
          <div className="pt-4 border-t border-muted/50">
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                isBullish
                  ? "bg-emerald-500/5 border-emerald-500/10"
                  : isBearish
                  ? "bg-rose-500/5 border-rose-500/10"
                  : "bg-primary/5 border-primary/10"
              }`}
            >
              <CheckCircle2
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isBullish
                    ? "text-emerald-400"
                    : isBearish
                    ? "text-rose-400"
                    : "text-primary"
                }`}
              />
              <div>
                <p
                  className={`text-[10px] font-black uppercase mb-1 ${
                    isBullish
                      ? "text-emerald-400"
                      : isBearish
                      ? "text-rose-400"
                      : "text-primary"
                  }`}
                >
                  AI Recommendation
                </p>
                <p className="text-xs font-medium leading-relaxed">
                  {getRecommendation()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 group">
      <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-muted/30 group-hover:bg-muted/50 transition-colors">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
