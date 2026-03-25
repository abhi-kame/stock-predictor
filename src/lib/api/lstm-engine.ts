import * as tf from '@tensorflow/tfjs';
import { HistoryPoint, PredictionResult, DayPrediction, ModelPrediction, TradingSignal, TechnicalSummary } from './prediction-engine';

class MinMaxScaler {
  min: number = 0;
  max: number = 1;

  fit_transform(data: number[]): number[] {
    this.min = Math.min(...data);
    this.max = Math.max(...data);
    
    if (this.max === this.min) return data.map(() => 0.5);
    
    return data.map(val => (val - this.min) / (this.max - this.min));
  }

  inverse_transform(val: number): number {
    return val * (this.max - this.min) + this.min;
  }
}

export async function runLSTMPrediction(
  history: HistoryPoint[],
  symbol: string
): Promise<PredictionResult> {
  const predictionDays = 60;
  
  if (!history || history.length <= predictionDays) {
    throw new Error(`Need at least ${predictionDays + 1} days of data for LSTM, got ${history?.length || 0}`);
  }

  const closes = history.map(h => h.close);
  const currentPrice = closes[closes.length - 1];

  // 1. MinMax Scaler
  const scaler = new MinMaxScaler();
  const scaledData = scaler.fit_transform(closes);

  // 2. Prepare sequences
  const xTrain: number[][] = [];
  const yTrain: number[] = [];

  for (let i = predictionDays; i < scaledData.length; i++) {
    xTrain.push(scaledData.slice(i - predictionDays, i));
    yTrain.push(scaledData[i]);
  }

  // Convert to tensors
  const xs = tf.tensor3d(xTrain.map(seq => seq.map(val => [val])), [xTrain.length, predictionDays, 1]);
  const ys = tf.tensor2d(yTrain, [yTrain.length, 1]);

  // 3. Build Model (Identical to Python)
  const model = tf.sequential();
  
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: true,
    inputShape: [predictionDays, 1]
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.lstm({
    units: 50,
    returnSequences: false
  }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError'
  });

  // 4. Train Model
  await model.fit(xs, ys, {
    epochs: 5,
    batchSize: 32,
    shuffle: false, // Match Python sequential expectation
    verbose: 0
  });

  // 5. Predict Next Day
  const lastSequence = scaledData.slice(scaledData.length - predictionDays);
  const inputTensor = tf.tensor3d([lastSequence.map(val => [val])], [1, predictionDays, 1]);
  
  const rawPrediction = model.predict(inputTensor) as tf.Tensor;
  const scaledPredictionInfo = await rawPrediction.data();
  const scaledPredictedPrice = scaledPredictionInfo[0];
  
  const predictedPrice = scaler.inverse_transform(scaledPredictedPrice);

  // Cleanup tensors to prevent memory leaks in Node
  xs.dispose();
  ys.dispose();
  inputTensor.dispose();
  rawPrediction.dispose();
  model.dispose();

  const changePct = ((predictedPrice - currentPrice) / currentPrice) * 100;
  const isBullish = changePct > 0;

  // 6. Format identical output structure as Ensemble model so frontend doesn't crash
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
    nextDate.setDate(nextDate.getDate() + 1);
  }

  const dayPredictions: DayPrediction[] = [{
    day: 1,
    date: nextDate.toISOString().split('T')[0],
    predicted: Math.round(predictedPrice * 100) / 100,
    low: Math.round((predictedPrice * 0.98) * 100) / 100,
    high: Math.round((predictedPrice * 1.02) * 100) / 100,
  }];

  const modelBreakdown: ModelPrediction[] = [
    { name: 'LSTM Deep Learning', prediction: Math.round(predictedPrice * 100) / 100, weight: 1.0, signal: isBullish ? 'BULLISH' : 'BEARISH' },
  ];

  const signals: TradingSignal[] = [
    {
      name: 'LSTM Neural Model',
      signal: changePct > 2 ? 'STRONG_BUY' : changePct > 0 ? 'BUY' : changePct > -2 ? 'SELL' : 'STRONG_SELL',
      value: Math.round(changePct * 100) / 100,
      description: `Deep learning sequence model predicts ${changePct > 0 ? 'upward' : 'downward'} move`
    }
  ];

  // Dummy technicals just to satisfy frontend interface without recalculating
  const technicals: TechnicalSummary = {
    rsi: 50, macd: 0, macdSignal: 0, macdHistogram: 0, sma20: 0, sma50: 0, ema9: 0, ema21: 0,
    bollingerUpper: 0, bollingerLower: 0, bollingerMiddle: 0, atr: 0, vwap: 0, adx: 0, obvTrend: 'NEUTRAL'
  };

  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictions: dayPredictions,
    confidence: 0.88, // hardcoded match python code
    signals,
    insight: `TensorFlow.js LSTM model predicts ${isBullish ? 'upward' : 'downward'} movement of ${Math.abs(changePct).toFixed(2)}% based on 5 training epochs of ${history.length} days of data.`,
    technicals,
    modelBreakdown,
  };
}
