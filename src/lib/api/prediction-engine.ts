/**
 * StockAI Ensemble Prediction Engine
 * ===================================
 * Multi-strategy prediction engine running entirely in Node.js.
 * No Python backend needed. Uses the same Alpha Vantage API.
 *
 * Strategies:
 * 1. EMA Crossover (9/21 EMA trend detection)
 * 2. Linear Regression (least-squares projection)
 * 3. RSI Mean Reversion (oversold/overbought signals)
 * 4. Bollinger Band Squeeze (volatility breakout)
 * 5. MACD Momentum (trend strength)
 * 6. Volume-Weighted Trend (VWAP + volume confirmation)
 *
 * Ensemble: Weighted average with dynamic confidence scoring.
 */

export interface HistoryPoint {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
}

export interface PredictionResult {
  symbol: string;
  currentPrice: number;
  predictions: DayPrediction[];
  confidence: number;
  signals: TradingSignal[];
  insight: string;
  technicals: TechnicalSummary;
  modelBreakdown: ModelPrediction[];
}

export interface DayPrediction {
  day: number;
  date: string;
  predicted: number;
  low: number;
  high: number;
}

export interface TradingSignal {
  name: string;
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  value: number;
  description: string;
}

export interface TechnicalSummary {
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
  obvTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface ModelPrediction {
  name: string;
  prediction: number;
  weight: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// ============== MATH HELPERS ==============

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(mean(slice));
    }
  }
  return result;
}

// ============== TECHNICAL INDICATORS ==============

function computeRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain / period;
      avgLoss += loss / period;
      if (i === period) {
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      } else {
        rsi.push(50);
      }
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}

function computeMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

function computeBollingerBands(closes: number[], period: number = 20, multiplier: number = 2) {
  const middle = sma(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const sd = stddev(slice);
      upper.push(middle[i] + multiplier * sd);
      lower.push(middle[i] - multiplier * sd);
    }
  }

  return { upper, middle, lower };
}

function computeATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const atr: number[] = [highs[0] - lows[0]];

  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );

    if (i < period) {
      atr.push(tr);
    } else if (i === period) {
      const avg = atr.reduce((a, b) => a + b, tr) / (period + 1);
      atr.push(avg);
    } else {
      atr.push((atr[atr.length - 1] * (period - 1) + tr) / period);
    }
  }

  return atr;
}

function computeADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (closes.length < period * 2) return 25; // default neutral

  let prevDMPlus = 0, prevDMMinus = 0, prevTR = 0;
  const dx: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    const dmPlus = upMove > downMove && upMove > 0 ? upMove : 0;
    const dmMinus = downMove > upMove && downMove > 0 ? downMove : 0;
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );

    if (i <= period) {
      prevDMPlus += dmPlus;
      prevDMMinus += dmMinus;
      prevTR += tr;
    } else {
      prevDMPlus = prevDMPlus - prevDMPlus / period + dmPlus;
      prevDMMinus = prevDMMinus - prevDMMinus / period + dmMinus;
      prevTR = prevTR - prevTR / period + tr;
    }

    if (i >= period) {
      const diPlus = prevTR !== 0 ? (prevDMPlus / prevTR) * 100 : 0;
      const diMinus = prevTR !== 0 ? (prevDMMinus / prevTR) * 100 : 0;
      const diSum = diPlus + diMinus;
      dx.push(diSum !== 0 ? (Math.abs(diPlus - diMinus) / diSum) * 100 : 0);
    }
  }

  if (dx.length === 0) return 25;
  const adxPeriod = Math.min(period, dx.length);
  return mean(dx.slice(-adxPeriod));
}

function computeOBV(closes: number[], volumes: number[]): number[] {
  const obv: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv.push(obv[i - 1] + volumes[i]);
    } else if (closes[i] < closes[i - 1]) {
      obv.push(obv[i - 1] - volumes[i]);
    } else {
      obv.push(obv[i - 1]);
    }
  }
  return obv;
}

// ============== PREDICTION STRATEGIES ==============

function linearRegressionPredict(closes: number[], daysAhead: number = 1): number {
  const n = closes.length;
  const period = Math.min(30, n);
  const recent = closes.slice(-period);

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < recent.length; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }

  const denominator = recent.length * sumX2 - sumX * sumX;
  if (denominator === 0) return recent[recent.length - 1];

  const slope = (recent.length * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / recent.length;

  return intercept + slope * (recent.length - 1 + daysAhead);
}

function emaCrossoverPredict(closes: number[]): number {
  const ema9 = ema(closes, 9);
  const ema21 = ema(closes, 21);

  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const prevEma9 = ema9[ema9.length - 2];
  const prevEma21 = ema21[ema21.length - 2];

  const currentPrice = closes[closes.length - 1];

  // Trend momentum
  const ema9Momentum = (lastEma9 - prevEma9) / prevEma9;
  const ema21Momentum = (lastEma21 - prevEma21) / prevEma21;

  // EMA crossover strength
  const crossoverGap = (lastEma9 - lastEma21) / lastEma21;
  const crossoverMomentum = crossoverGap > 0 ? 1 : -1;

  const projectedChange = (ema9Momentum * 0.6 + ema21Momentum * 0.4) + crossoverGap * 0.3;
  return currentPrice * (1 + projectedChange);
}

function rsiMeanReversionPredict(closes: number[], rsiValues: number[]): number {
  const currentPrice = closes[closes.length - 1];
  const currentRSI = rsiValues[rsiValues.length - 1];

  // RSI-based mean reversion
  let reversionFactor = 0;
  if (currentRSI > 80) reversionFactor = -0.02; // Strongly overbought
  else if (currentRSI > 70) reversionFactor = -0.01; // Overbought
  else if (currentRSI < 20) reversionFactor = 0.02; // Strongly oversold
  else if (currentRSI < 30) reversionFactor = 0.01; // Oversold
  else reversionFactor = (50 - currentRSI) / 5000; // Slight pull towards midline

  return currentPrice * (1 + reversionFactor);
}

function bollingerBandPredict(
  closes: number[],
  bbUpper: number[],
  bbLower: number[],
  bbMiddle: number[]
): number {
  const currentPrice = closes[closes.length - 1];
  const upper = bbUpper[bbUpper.length - 1];
  const lower = bbLower[bbLower.length - 1];
  const middle = bbMiddle[bbMiddle.length - 1];

  if (isNaN(upper) || isNaN(lower)) return currentPrice;

  const bandwidth = (upper - lower) / middle;
  const percentB = (currentPrice - lower) / (upper - lower);

  // Price near upper band → likely to revert down
  // Price near lower band → likely to revert up
  // Tight bandwidth → breakout expected in trend direction
  let target: number;
  if (percentB > 0.95) {
    target = middle + (upper - middle) * 0.3; // Slight pullback from upper
  } else if (percentB < 0.05) {
    target = middle - (middle - lower) * 0.3; // Slight bounce from lower
  } else if (bandwidth < 0.03) {
    // Squeeze - predict breakout in direction of trend
    const trend = closes[closes.length - 1] > closes[closes.length - 5] ? 1 : -1;
    target = currentPrice * (1 + trend * bandwidth);
  } else {
    target = middle; // Revert to mean
  }

  // Blend with current price (don't predict too extreme a move)
  return currentPrice * 0.4 + target * 0.6;
}

function macdMomentumPredict(
  closes: number[],
  macdValues: number[],
  macdHistogram: number[]
): number {
  const currentPrice = closes[closes.length - 1];
  const lastMACD = macdValues[macdValues.length - 1];
  const prevMACD = macdValues[macdValues.length - 2];
  const lastHist = macdHistogram[macdHistogram.length - 1];
  const prevHist = macdHistogram[macdHistogram.length - 2];

  // MACD momentum
  const macdMomentum = lastMACD - prevMACD;
  // Histogram acceleration
  const histAcceleration = lastHist - prevHist;

  // Normalize relative to price
  const momentumPct = (macdMomentum / currentPrice) * 5;
  const accelPct = (histAcceleration / currentPrice) * 3;

  return currentPrice * (1 + momentumPct + accelPct);
}

function volumeWeightedPredict(
  closes: number[],
  volumes: number[],
  obvValues: number[]
): number {
  const currentPrice = closes[closes.length - 1];
  const period = Math.min(10, closes.length);

  // VWAP-like calculation
  let vwSum = 0, volSum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    vwSum += closes[i] * volumes[i];
    volSum += volumes[i];
  }
  const vwap = volSum > 0 ? vwSum / volSum : currentPrice;

  // OBV trend
  const obvRecent = obvValues.slice(-10);
  const obvSlope = (obvRecent[obvRecent.length - 1] - obvRecent[0]) / obvRecent.length;
  const obvSignal = obvSlope > 0 ? 1 : -1;

  // Price relative to VWAP
  const vwapDiff = (currentPrice - vwap) / vwap;

  // Volume confirms direction
  const volumeTrend = volumes.slice(-5).reduce((a, b) => a + b, 0) /
    volumes.slice(-10, -5).reduce((a, b) => a + b, 1);

  const volumeConfirmation = volumeTrend > 1.2 ? 1.5 : volumeTrend < 0.8 ? 0.5 : 1.0;

  const predictedChange = vwapDiff * 0.3 * obvSignal * volumeConfirmation;
  return currentPrice * (1 + predictedChange);
}

// ============== ENSEMBLE PREDICTION ==============

export function runPrediction(
  history: HistoryPoint[],
  symbol: string,
  forecastDays: number = 5
): PredictionResult {
  if (!history || history.length < 30) {
    throw new Error(`Need at least 30 days of data, got ${history?.length || 0}`);
  }

  const closes = history.map(h => h.close);
  const volumes = history.map(h => h.volume);
  const highs = history.map(h => h.high || h.close * 1.01);
  const lows = history.map(h => h.low || h.close * 0.99);
  const currentPrice = closes[closes.length - 1];

  // ---- Compute all technicals ----
  const rsiValues = computeRSI(closes);
  const { macd: macdValues, signal: macdSignalValues, histogram: macdHistogram } = computeMACD(closes);
  const bb = computeBollingerBands(closes);
  const atrValues = computeATR(highs, lows, closes);
  const adx = computeADX(highs, lows, closes);
  const obvValues = computeOBV(closes, volumes);
  const ema9Values = ema(closes, 9);
  const ema21Values = ema(closes, 21);
  const sma20Values = sma(closes, 20);
  const sma50Values = sma(closes, 50);

  // VWAP
  let vwSum = 0, volSum = 0;
  const period = Math.min(20, closes.length);
  for (let i = closes.length - period; i < closes.length; i++) {
    vwSum += closes[i] * volumes[i];
    volSum += volumes[i];
  }
  const vwap = volSum > 0 ? vwSum / volSum : currentPrice;

  // OBV trend
  const recentObv = obvValues.slice(-20);
  const obvSlopeVal = recentObv.length > 1 ? recentObv[recentObv.length - 1] - recentObv[0] : 0;

  // ---- Run each model for 1-day ahead ----
  const linRegPred = linearRegressionPredict(closes, 1);
  const emaPred = emaCrossoverPredict(closes);
  const rsiPred = rsiMeanReversionPredict(closes, rsiValues);
  const bbPred = bollingerBandPredict(closes, bb.upper, bb.lower, bb.middle);
  const macdPred = macdMomentumPredict(closes, macdValues, macdHistogram);
  const volPred = volumeWeightedPredict(closes, volumes, obvValues);

  // ---- Dynamic weighting based on ADX (trend strength) ----
  // High ADX = trending → weight trend-following models more
  // Low ADX = ranging → weight mean-reversion models more
  const isTrending = adx > 25;

  const weights = {
    linReg: isTrending ? 0.25 : 0.15,
    ema: isTrending ? 0.25 : 0.10,
    rsi: isTrending ? 0.05 : 0.25,
    bb: isTrending ? 0.10 : 0.25,
    macd: isTrending ? 0.25 : 0.15,
    volume: 0.10,
  };

  const ensemblePrediction =
    linRegPred * weights.linReg +
    emaPred * weights.ema +
    rsiPred * weights.rsi +
    bbPred * weights.bb +
    macdPred * weights.macd +
    volPred * weights.volume;

  // ---- Calculate real confidence ----
  const predictions = [linRegPred, emaPred, rsiPred, bbPred, macdPred, volPred];
  const predStdDev = stddev(predictions);
  const predSpread = predStdDev / currentPrice;

  // Agreement score: how much do models agree?
  const allBullish = predictions.filter(p => p > currentPrice).length;
  const agreementRatio = Math.max(allBullish, predictions.length - allBullish) / predictions.length;

  // Confidence: high agreement + low spread = high confidence
  const baseConfidence = agreementRatio * 0.6 + Math.max(0, 1 - predSpread * 50) * 0.4;
  const confidence = Math.max(0.35, Math.min(0.95, baseConfidence));

  // ---- Multi-day forecast (with decay) ----
  const atr = atrValues[atrValues.length - 1];
  const dailyChange = (ensemblePrediction - currentPrice) / currentPrice;
  const dayPredictions: DayPrediction[] = [];

  for (let d = 1; d <= forecastDays; d++) {
    const decayFactor = Math.pow(0.85, d - 1); // Confidence decays over time
    const predictedPrice = currentPrice * (1 + dailyChange * d * decayFactor);
    const uncertainty = atr * Math.sqrt(d); // Uncertainty grows with √time

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + d);
    // Skip weekends
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    dayPredictions.push({
      day: d,
      date: nextDate.toISOString().split('T')[0],
      predicted: Math.round(predictedPrice * 100) / 100,
      low: Math.round((predictedPrice - uncertainty) * 100) / 100,
      high: Math.round((predictedPrice + uncertainty) * 100) / 100,
    });
  }

  // ---- Trading Signals ----
  const currentRSI = rsiValues[rsiValues.length - 1];
  const lastMACD = macdValues[macdValues.length - 1];
  const lastSignal = macdSignalValues[macdSignalValues.length - 1];
  const lastEma9 = ema9Values[ema9Values.length - 1];
  const lastEma21 = ema21Values[ema21Values.length - 1];
  const lastBBUpper = bb.upper[bb.upper.length - 1];
  const lastBBLower = bb.lower[bb.lower.length - 1];

  const getSignalLevel = (val: number): 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' => {
    if (val > 0.6) return 'STRONG_BUY';
    if (val > 0.2) return 'BUY';
    if (val > -0.2) return 'NEUTRAL';
    if (val > -0.6) return 'SELL';
    return 'STRONG_SELL';
  };

  const signals: TradingSignal[] = [
    {
      name: 'RSI (14)',
      signal: currentRSI < 30 ? 'STRONG_BUY' : currentRSI < 40 ? 'BUY' : currentRSI > 70 ? 'STRONG_SELL' : currentRSI > 60 ? 'SELL' : 'NEUTRAL',
      value: Math.round(currentRSI * 100) / 100,
      description: currentRSI < 30 ? 'Oversold — bounce expected' : currentRSI > 70 ? 'Overbought — pullback likely' : 'Neutral momentum'
    },
    {
      name: 'MACD',
      signal: getSignalLevel((lastMACD - lastSignal) / Math.abs(lastSignal || 1)),
      value: Math.round(lastMACD * 100) / 100,
      description: lastMACD > lastSignal ? 'Bullish crossover active' : 'Bearish crossover active'
    },
    {
      name: 'EMA Cross (9/21)',
      signal: lastEma9 > lastEma21 ? (lastEma9 > lastEma21 * 1.01 ? 'STRONG_BUY' : 'BUY') : (lastEma9 < lastEma21 * 0.99 ? 'STRONG_SELL' : 'SELL'),
      value: Math.round(((lastEma9 - lastEma21) / lastEma21) * 10000) / 100,
      description: lastEma9 > lastEma21 ? 'Short-term trend is bullish' : 'Short-term trend is bearish'
    },
    {
      name: 'Bollinger Bands',
      signal: currentPrice > lastBBUpper ? 'STRONG_SELL' : currentPrice < lastBBLower ? 'STRONG_BUY' : 'NEUTRAL',
      value: Math.round(((currentPrice - lastBBLower) / (lastBBUpper - lastBBLower)) * 100) / 100,
      description: currentPrice > lastBBUpper ? 'Price above upper band — overbought' : currentPrice < lastBBLower ? 'Price below lower band — oversold' : 'Price within bands'
    },
    {
      name: 'Volume Trend',
      signal: getSignalLevel(obvSlopeVal > 0 ? 0.3 : -0.3),
      value: Math.round(volumes[volumes.length - 1]),
      description: obvSlopeVal > 0 ? 'Accumulation detected — bullish volume' : 'Distribution detected — bearish volume'
    },
    {
      name: 'ADX Trend Strength',
      signal: adx > 25 ? (ensemblePrediction > currentPrice ? 'BUY' : 'SELL') : 'NEUTRAL',
      value: Math.round(adx * 100) / 100,
      description: adx > 40 ? 'Very strong trend' : adx > 25 ? 'Moderate trend' : 'Weak/no trend — range-bound'
    },
  ];

  // ---- Model breakdown ----
  const modelBreakdown: ModelPrediction[] = [
    { name: 'Linear Regression', prediction: Math.round(linRegPred * 100) / 100, weight: weights.linReg, signal: linRegPred > currentPrice ? 'BULLISH' : 'BEARISH' },
    { name: 'EMA Crossover', prediction: Math.round(emaPred * 100) / 100, weight: weights.ema, signal: emaPred > currentPrice ? 'BULLISH' : 'BEARISH' },
    { name: 'RSI Reversion', prediction: Math.round(rsiPred * 100) / 100, weight: weights.rsi, signal: rsiPred > currentPrice ? 'BULLISH' : 'BEARISH' },
    { name: 'Bollinger Band', prediction: Math.round(bbPred * 100) / 100, weight: weights.bb, signal: bbPred > currentPrice ? 'BULLISH' : 'BEARISH' },
    { name: 'MACD Momentum', prediction: Math.round(macdPred * 100) / 100, weight: weights.macd, signal: macdPred > currentPrice ? 'BULLISH' : 'BEARISH' },
    { name: 'Volume-Weighted', prediction: Math.round(volPred * 100) / 100, weight: weights.volume, signal: volPred > currentPrice ? 'BULLISH' : 'BEARISH' },
  ];

  const bullishCount = modelBreakdown.filter(m => m.signal === 'BULLISH').length;
  const overallDirection = bullishCount >= 4 ? 'upward' : bullishCount <= 2 ? 'downward' : 'sideways';
  const changePct = ((ensemblePrediction - currentPrice) / currentPrice) * 100;

  const insight = `Ensemble of 6 models (${bullishCount}/6 bullish) predicts ${overallDirection} movement of ${Math.abs(changePct).toFixed(2)}% ` +
    `with ${(confidence * 100).toFixed(0)}% confidence. ` +
    `${adx > 25 ? 'Strong trend detected — momentum models weighted higher.' : 'Range-bound market — mean-reversion models weighted higher.'} ` +
    `RSI at ${currentRSI.toFixed(0)}${currentRSI > 70 ? ' (overbought)' : currentRSI < 30 ? ' (oversold)' : ''}. ` +
    `ATR suggests daily volatility of $${atr.toFixed(2)}.`;

  // ---- Technical Summary ----
  const technicals: TechnicalSummary = {
    rsi: Math.round(currentRSI * 100) / 100,
    macd: Math.round(lastMACD * 100) / 100,
    macdSignal: Math.round(lastSignal * 100) / 100,
    macdHistogram: Math.round(macdHistogram[macdHistogram.length - 1] * 100) / 100,
    sma20: Math.round((sma20Values[sma20Values.length - 1] || currentPrice) * 100) / 100,
    sma50: Math.round((sma50Values[sma50Values.length - 1] || currentPrice) * 100) / 100,
    ema9: Math.round(lastEma9 * 100) / 100,
    ema21: Math.round(lastEma21 * 100) / 100,
    bollingerUpper: Math.round((lastBBUpper || currentPrice) * 100) / 100,
    bollingerLower: Math.round((lastBBLower || currentPrice) * 100) / 100,
    bollingerMiddle: Math.round((bb.middle[bb.middle.length - 1] || currentPrice) * 100) / 100,
    atr: Math.round(atr * 100) / 100,
    vwap: Math.round(vwap * 100) / 100,
    adx: Math.round(adx * 100) / 100,
    obvTrend: obvSlopeVal > 0 ? 'BULLISH' : obvSlopeVal < 0 ? 'BEARISH' : 'NEUTRAL',
  };

  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictions: dayPredictions,
    confidence: Math.round(confidence * 100) / 100,
    signals,
    insight,
    technicals,
    modelBreakdown,
  };
}
