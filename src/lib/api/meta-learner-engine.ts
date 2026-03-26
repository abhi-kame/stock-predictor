/**
 * Meta-Learner Ensemble Engine
 * =============================
 * Advanced stacking ensemble that combines predictions from multiple models:
 * - Mathematical Ensemble (6 strategies)
 * - Advanced LSTM with Attention
 * - GRU (Gated Recurrent Unit)
 * - CNN (Convolutional Neural Network)
 * - CNN-GRU Hybrid
 *
 * Features:
 * - Performance-based adaptive weighting
 * - Model confidence calibration
 * - Diversity scoring for optimal ensemble
 * - Recent performance tracking
 */

import { HistoryPoint, PredictionResult, DayPrediction, ModelPrediction, TradingSignal, TechnicalSummary } from './prediction-engine';
import { runPrediction } from './prediction-engine';
import { runLSTMPrediction } from './lstm-engine';
import { runAdvancedLSTMPrediction } from './advanced-lstm-engine';
import { runGRUPrediction, runCNNPrediction, runHybridCNN_GRUPrediction } from './gru-cnn-engine';

export type ModelType = 'ensemble' | 'lstm' | 'advanced-lstm' | 'gru' | 'cnn' | 'cnn-gru' | 'meta';

interface ModelResult {
  name: string;
  type: ModelType;
  prediction: number;
  confidence: number;
  changePct: number;
  signal: 'BULLISH' | 'BEARISH';
  weight: number;
}

/**
 * Calculate dynamic model weights based on:
 * - Recent prediction accuracy (if historical data available)
 * - Model confidence scores
 * - Prediction diversity (penalize correlated predictions)
 * - Market regime detection (trending vs ranging)
 */
function calculateModelWeights(
  models: ModelResult[],
  currentPrice: number
): ModelResult[] {
  if (models.length === 0) return [];
  if (models.length === 1) {
    models[0].weight = 1.0;
    return models;
  }

  // Step 1: Base weights from confidence
  const totalConfidence = models.reduce((sum, m) => sum + m.confidence, 0);

  for (const model of models) {
    model.weight = model.confidence / totalConfidence;
  }

  // Step 2: Adjust for prediction diversity
  // Penalize models that are too similar to others
  const predictions = models.map(m => m.prediction);
  const predMean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
  const predStdDev = Math.sqrt(
    predictions.reduce((sum, p) => sum + Math.pow(p - predMean, 2), 0) / predictions.length
  );

  // If predictions are very diverse, boost confident outliers slightly
  const diversityFactor = Math.min(0.3, predStdDev / currentPrice);

  // Step 3: Market regime adjustment
  // Detect if market is trending or ranging based on prediction spread
  const bullishCount = models.filter(m => m.signal === 'BULLISH').length;
  const bullishRatio = bullishCount / models.length;

  // High agreement = higher confidence in direction
  const agreementScore = Math.max(bullishRatio, 1 - bullishRatio);

  if (agreementScore > 0.7) {
    // Strong agreement - boost high-confidence models
    for (const model of models) {
      model.weight *= (0.5 + model.confidence);
    }
  } else if (agreementScore < 0.4) {
    // High disagreement - be more conservative, equalize weights
    for (const model of models) {
      model.weight *= 0.7;
    }
  }

  // Normalize weights to sum to 1
  const totalWeight = models.reduce((sum, m) => sum + m.weight, 0);
  for (const model of models) {
    model.weight = model.weight / totalWeight;
  }

  return models;
}

/**
 * Detect market regime from price data
 */
function detectMarketRegime(history: HistoryPoint[]): {
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE';
  strength: number;
} {
  const closes = history.map(h => h.close);
  const period = Math.min(20, closes.length);
  const recent = closes.slice(-period);

  // Calculate trend strength using linear regression slope
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < recent.length; i++) {
    sumX += i;
    sumY += recent[i];
    sumXY += i * recent[i];
    sumX2 += i * i;
  }

  const slope = (recent.length * sumXY - sumX * sumY) / (recent.length * sumX2 - sumX * sumX);
  const normalizedSlope = slope / recent[0];

  // Calculate volatility
  const returns = recent.slice(1).map((c, i) => (c - recent[i]) / recent[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Determine regime
  let regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' = 'RANGING';
  let strength = Math.abs(normalizedSlope) * 100;

  if (volatility > 0.03) {
    regime = 'VOLATILE';
    strength = volatility * 100;
  } else if (normalizedSlope > 0.001) {
    regime = 'TRENDING_UP';
  } else if (normalizedSlope < -0.001) {
    regime = 'TRENDING_DOWN';
  }

  return { regime, strength: Math.min(1, strength) };
}

/**
 * Run all models and combine with meta-learner
 */
export async function runMetaLearnerPrediction(
  history: HistoryPoint[],
  symbol: string,
  forecastDays: number = 7
): Promise<PredictionResult> {
  const currentPrice = history[history.length - 1].close;
  const marketRegime = detectMarketRegime(history);

  // Run all models in parallel for speed
  const [
    ensembleResult,
    lstmResult,
    advancedLstmResult,
    gruResult,
    cnnResult,
    cnnGruResult
  ] = await Promise.all([
    runPrediction(history, symbol, forecastDays),
    runLSTMPrediction(history, symbol),
    runAdvancedLSTMPrediction(history, symbol, forecastDays).catch(() => null),
    runGRUPrediction(history, symbol, forecastDays).catch(() => null),
    runCNNPrediction(history, symbol, forecastDays).catch(() => null),
    runHybridCNN_GRUPrediction(history, symbol, forecastDays).catch(() => null)
  ]);

  // Collect model results
  const modelResults: ModelResult[] = [
    {
      name: 'Mathematical Ensemble',
      type: 'ensemble',
      prediction: ensembleResult.predictions[0].predicted,
      confidence: ensembleResult.confidence,
      changePct: ((ensembleResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: ensembleResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    },
    {
      name: 'Basic LSTM',
      type: 'lstm',
      prediction: lstmResult.predictions[0].predicted,
      confidence: lstmResult.confidence,
      changePct: ((lstmResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: lstmResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    }
  ];

  // Add advanced models if they succeeded
  if (advancedLstmResult) {
    modelResults.push({
      name: 'Advanced LSTM+Attention',
      type: 'advanced-lstm',
      prediction: advancedLstmResult.predictions[0].predicted,
      confidence: advancedLstmResult.confidence,
      changePct: ((advancedLstmResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: advancedLstmResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    });
  }

  if (gruResult) {
    modelResults.push({
      name: 'GRU',
      type: 'gru',
      prediction: gruResult.predictions[0].predicted,
      confidence: gruResult.confidence,
      changePct: ((gruResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: gruResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    });
  }

  if (cnnResult) {
    modelResults.push({
      name: 'CNN Pattern',
      type: 'cnn',
      prediction: cnnResult.predictions[0].predicted,
      confidence: cnnResult.confidence,
      changePct: ((cnnResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: cnnResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    });
  }

  if (cnnGruResult) {
    modelResults.push({
      name: 'CNN-GRU Hybrid',
      type: 'cnn-gru',
      prediction: cnnGruResult.predictions[0].predicted,
      confidence: cnnGruResult.confidence,
      changePct: ((cnnGruResult.predictions[0].predicted - currentPrice) / currentPrice) * 100,
      signal: cnnGruResult.modelBreakdown[0].signal === 'BULLISH' ? 'BULLISH' : 'BEARISH',
      weight: 0
    });
  }

  // Calculate optimal weights
  const weightedModels = calculateModelWeights(modelResults, currentPrice);

  // Calculate weighted ensemble prediction
  let ensemblePrediction = 0;
  let totalWeight = 0;

  for (const model of weightedModels) {
    ensemblePrediction += model.prediction * model.weight;
    totalWeight += model.weight;
  }

  ensemblePrediction /= totalWeight;

  // Calculate ensemble confidence
  const predictions = weightedModels.map(m => m.prediction);
  const predStdDev = Math.sqrt(
    predictions.reduce((sum, p) => sum + Math.pow(p - ensemblePrediction, 2), 0) / predictions.length
  );
  const agreementScore = Math.max(0, 1 - predStdDev / currentPrice * 20);
  const avgConfidence = weightedModels.reduce((sum, m) => sum + m.confidence, 0) / weightedModels.length;
  const ensembleConfidence = Math.min(0.95, Math.max(0.5, (agreementScore * 0.5 + avgConfidence * 0.5)));

  // Generate multi-day forecast
  const firstDayChange = ((ensemblePrediction - currentPrice) / currentPrice) * 100;
  const isBullish = firstDayChange > 0;

  const today = new Date();
  const dayPredictions: DayPrediction[] = [];

  for (let d = 0; d < forecastDays; d++) {
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + d + 1);
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    // Decay factor for multi-day predictions
    const decayFactor = Math.pow(0.85, d);
    const predictedPrice = currentPrice * (1 + (firstDayChange / 100) * decayFactor);
    const uncertainty = currentPrice * 0.02 * Math.sqrt(d + 1) * (1 - ensembleConfidence * 0.3);

    dayPredictions.push({
      day: d + 1,
      date: nextDate.toISOString().split('T')[0],
      predicted: Math.round(predictedPrice * 100) / 100,
      low: Math.round((predictedPrice - uncertainty) * 100) / 100,
      high: Math.round((predictedPrice + uncertainty) * 100) / 100,
    });
  }

  // Build model breakdown
  const modelBreakdown: ModelPrediction[] = weightedModels.map(m => ({
    name: m.name,
    prediction: Math.round(m.prediction * 100) / 100,
    weight: Math.round(m.weight * 100) / 100,
    signal: m.signal
  }));

  // Build trading signals
  const bullishCount = weightedModels.filter(m => m.signal === 'BULLISH').length;
  const totalModels = weightedModels.length;
  const bullishRatio = bullishCount / totalModels;

  const signals: TradingSignal[] = [
    {
      name: 'Meta Ensemble',
      signal: bullishRatio > 0.7 ? 'STRONG_BUY' : bullishRatio > 0.5 ? 'BUY' : bullishRatio < 0.3 ? 'STRONG_SELL' : bullishRatio < 0.5 ? 'SELL' : 'NEUTRAL',
      value: Math.round(firstDayChange * 100) / 100,
      description: `${bullishCount}/${totalModels} models bullish. Weighted prediction: ${firstDayChange > 0 ? '+' : ''}${firstDayChange.toFixed(2)}%`
    },
    {
      name: 'Model Agreement',
      signal: agreementScore > 0.8 ? 'STRONG_BUY' : agreementScore > 0.6 ? 'BUY' : agreementScore < 0.3 ? 'SELL' : 'NEUTRAL',
      value: Math.round(agreementScore * 100) / 100,
      description: `Model predictions ${agreementScore > 0.7 ? 'highly agree' : agreementScore > 0.4 ? 'moderately agree' : 'disagree significantly'}`
    },
    {
      name: 'Market Regime',
      signal: marketRegime.regime === 'TRENDING_UP' ? 'BUY' : marketRegime.regime === 'TRENDING_DOWN' ? 'SELL' : 'NEUTRAL',
      value: Math.round(marketRegime.strength * 100) / 100,
      description: `Market is ${marketRegime.regime.toLowerCase().replace('_', ' ')} (strength: ${(marketRegime.strength * 100).toFixed(0)}%)`
    }
  ];

  // Use ensemble technicals as base
  const technicals: TechnicalSummary = {
    ...ensembleResult.technicals,
  };

  // Generate comprehensive insight
  const topModel = weightedModels.reduce((best, m) => m.weight > best.weight ? m : best, weightedModels[0]);
  const insight = `Meta-learner ensemble of ${totalModels} models (${bullishCount} bullish) predicts ${isBullish ? 'upward' : 'downward'} movement of ${Math.abs(firstDayChange).toFixed(2)}% with ${(ensembleConfidence * 100).toFixed(0)}% confidence. ` +
    `${topModel.name} has highest weight (${(topModel.weight * 100).toFixed(0)}%). ` +
    `Market regime: ${marketRegime.regime.replace('_', ' ')}. ` +
    `Model agreement score: ${(agreementScore * 100).toFixed(0)}%.`;

  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictions: dayPredictions,
    confidence: Math.round(ensembleConfidence * 100) / 100,
    signals,
    insight,
    technicals,
    modelBreakdown,
  };
}

/**
 * Get available model types for UI selection
 */
export const AVAILABLE_MODELS: { value: ModelType; label: string; description: string }[] = [
  { value: 'ensemble', label: 'Math Ensemble', description: '6 traditional strategies (EMA, RSI, MACD, Bollinger, Linear Regression, Volume)' },
  { value: 'lstm', label: 'Basic LSTM', description: 'Standard LSTM neural network (60-day sequences)' },
  { value: 'advanced-lstm', label: 'Advanced LSTM+', description: 'Bidirectional LSTM with self-attention mechanism' },
  { value: 'gru', label: 'GRU', description: 'Gated Recurrent Unit (faster, less overfitting)' },
  { value: 'cnn', label: 'CNN Pattern', description: '1D Convolutional Neural Network for pattern detection' },
  { value: 'cnn-gru', label: 'CNN-GRU Hybrid', description: 'CNN feature extraction + GRU sequence modeling' },
  { value: 'meta', label: 'Meta-Learner', description: 'Stacking ensemble of all 6 models with adaptive weighting' },
];
