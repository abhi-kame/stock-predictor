/**
 * GRU and CNN Engine for Stock Prediction
 * ========================================
 * Alternative deep learning architectures for diverse predictions.
 *
 * GRU (Gated Recurrent Unit):
 * - Simpler than LSTM, faster training
 * - Often performs equally well on financial time series
 * - Less prone to overfitting on shorter sequences
 *
 * 1D CNN (Convolutional Neural Network):
 * - Excellent at detecting local patterns and trends
 * - Parallel computation (faster than RNNs)
 * - Captures short-term price patterns effectively
 */

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

/**
 * Build GRU model - simpler alternative to LSTM
 */
function buildGRUModel(sequenceLength: number, inputDim: number = 1): tf.LayersModel {
  const inputs = tf.input({shape: [sequenceLength, inputDim]});

  // First GRU layer with dropout
  const gru1 = tf.layers.gru({
    units: 64,
    returnSequences: true,
    dropout: 0.2,
    recurrentDropout: 0.2
  }).apply(inputs) as tf.SymbolicTensor;

  // Batch normalization
  const bn1 = tf.layers.batchNormalization().apply(gru1) as tf.SymbolicTensor;

  // Second GRU layer
  const gru2 = tf.layers.gru({
    units: 32,
    returnSequences: false,
    dropout: 0.2,
    recurrentDropout: 0.2
  }).apply(bn1) as tf.SymbolicTensor;

  // Dense layers
  const dense1 = tf.layers.dense({
    units: 32,
    activation: 'relu',
    kernelRegularizer: 'l2'
  }).apply(gru2) as tf.SymbolicTensor;

  const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1) as tf.SymbolicTensor;

  const dense2 = tf.layers.dense({
    units: 16,
    activation: 'relu'
  }).apply(dropout) as tf.SymbolicTensor;

  const output = tf.layers.dense({ units: 1 }).apply(dense2) as tf.SymbolicTensor;

  return tf.model({inputs, outputs: output});
}

/**
 * Build 1D CNN model for pattern detection
 */
function buildCNNModel(sequenceLength: number, inputDim: number = 1): tf.LayersModel {
  const inputs = tf.input({shape: [sequenceLength, inputDim]});

  // First convolutional block
  const conv1 = tf.layers.conv1d({
    filters: 64,
    kernelSize: 5,
    activation: 'relu',
    padding: 'same',
    kernelRegularizer: 'l2'
  }).apply(inputs) as tf.SymbolicTensor;

  const bn1 = tf.layers.batchNormalization().apply(conv1) as tf.SymbolicTensor;
  const pool1 = tf.layers.maxPooling1d({
    poolSize: 2,
    strides: 2
  }).apply(bn1) as tf.SymbolicTensor;
  const dropout1 = tf.layers.dropout({ rate: 0.25 }).apply(pool1) as tf.SymbolicTensor;

  // Second convolutional block
  const conv2 = tf.layers.conv1d({
    filters: 128,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same',
    kernelRegularizer: 'l2'
  }).apply(dropout1) as tf.SymbolicTensor;

  const bn2 = tf.layers.batchNormalization().apply(conv2) as tf.SymbolicTensor;
  const pool2 = tf.layers.maxPooling1d({
    poolSize: 2,
    strides: 2
  }).apply(bn2) as tf.SymbolicTensor;
  const dropout2 = tf.layers.dropout({ rate: 0.25 }).apply(pool2) as tf.SymbolicTensor;

  // Third convolutional block (smaller kernel for fine patterns)
  const conv3 = tf.layers.conv1d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
  }).apply(dropout2) as tf.SymbolicTensor;

  const bn3 = tf.layers.batchNormalization().apply(conv3) as tf.SymbolicTensor;
  const flatten = tf.layers.flatten().apply(bn3) as tf.SymbolicTensor;

  // Dense layers
  const dense1 = tf.layers.dense({
    units: 64,
    activation: 'relu',
    kernelRegularizer: 'l2'
  }).apply(flatten) as tf.SymbolicTensor;

  const dropout3 = tf.layers.dropout({ rate: 0.3 }).apply(dense1) as tf.SymbolicTensor;

  const dense2 = tf.layers.dense({
    units: 32,
    activation: 'relu'
  }).apply(dropout3) as tf.SymbolicTensor;

  const output = tf.layers.dense({ units: 1 }).apply(dense2) as tf.SymbolicTensor;

  return tf.model({inputs, outputs: output});
}

/**
 * Build hybrid CNN-GRU model
 */
function buildHybridCNN_GRUModel(sequenceLength: number, inputDim: number = 1): tf.LayersModel {
  const inputs = tf.input({shape: [sequenceLength, inputDim]});

  // CNN feature extraction
  const conv1 = tf.layers.conv1d({
    filters: 64,
    kernelSize: 7,
    activation: 'relu',
    padding: 'same'
  }).apply(inputs) as tf.SymbolicTensor;

  const pool1 = tf.layers.maxPooling1d({
    poolSize: 2,
    strides: 2
  }).apply(conv1) as tf.SymbolicTensor;

  const conv2 = tf.layers.conv1d({
    filters: 32,
    kernelSize: 3,
    activation: 'relu',
    padding: 'same'
  }).apply(pool1) as tf.SymbolicTensor;

  // GRU sequence processing
  const gru1 = tf.layers.gru({
    units: 32,
    returnSequences: true,
    dropout: 0.2
  }).apply(conv2) as tf.SymbolicTensor;

  const gru2 = tf.layers.gru({
    units: 16,
    returnSequences: false,
    dropout: 0.2
  }).apply(gru1) as tf.SymbolicTensor;

  // Dense output
  const dense1 = tf.layers.dense({
    units: 32,
    activation: 'relu'
  }).apply(gru2) as tf.SymbolicTensor;

  const dropout = tf.layers.dropout({ rate: 0.3 }).apply(dense1) as tf.SymbolicTensor;

  const output = tf.layers.dense({ units: 1 }).apply(dropout) as tf.SymbolicTensor;

  return tf.model({inputs, outputs: output});
}

/**
 * Train model with adaptive learning rate
 */
async function trainModel(
  model: tf.LayersModel,
  xs: tf.Tensor3D,
  ys: tf.Tensor2D,
  epochs: number = 25
): Promise<number> {
  let learningRate = 0.001;
  let bestLoss = Infinity;
  let patienceCounter = 0;
  let finalLoss = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const history_result = await model.fit(xs, ys, {
      epochs: 1,
      batchSize: 32,
      shuffle: true,
      verbose: 0
    });

    const currentLoss = history_result.history.loss[0] as number;
    finalLoss = currentLoss;

    // Learning rate decay on plateau
    if (epoch > 0 && epoch % 8 === 0) {
      learningRate *= 0.5;
      model.compile({
        optimizer: tf.train.adam(learningRate),
        loss: 'meanSquaredError'
      });
    }

    // Early stopping
    if (currentLoss < bestLoss - 0.0001) {
      bestLoss = currentLoss;
      patienceCounter = 0;
    } else {
      patienceCounter++;
      if (patienceCounter >= 5) break;
    }
  }

  return finalLoss;
}

/**
 * Calculate confidence based on prediction stability
 */
function calculateConfidence(
  predictions: number[],
  currentPrice: number,
  trainingLoss: number
): number {
  const predMean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
  const predStdDev = Math.sqrt(
    predictions.reduce((sum, p) => sum + Math.pow(p - predMean, 2), 0) / predictions.length
  );
  const agreementScore = Math.max(0, 1 - predStdDev / currentPrice * 10);
  const trainingScore = Math.max(0, 1 - trainingLoss * 10);
  return Math.min(0.95, Math.max(0.4, (agreementScore * 0.6 + trainingScore * 0.4)));
}

export async function runGRUPrediction(
  history: HistoryPoint[],
  symbol: string,
  forecastDays: number = 7
): Promise<PredictionResult> {
  const predictionDays = 45; // GRU works well with slightly shorter sequences

  if (!history || history.length <= predictionDays) {
    throw new Error(`Need at least ${predictionDays + 1} days of data for GRU, got ${history?.length || 0}`);
  }

  const closes = history.map(h => h.close);
  const currentPrice = closes[closes.length - 1];

  // Normalize
  const scaler = new MinMaxScaler();
  const scaledData = scaler.fit_transform(closes);

  // Prepare sequences
  const xTrain: number[][][] = [];
  const yTrain: number[] = [];

  for (let i = predictionDays; i < scaledData.length; i++) {
    const sequence = scaledData.slice(i - predictionDays, i).map(v => [v]);
    xTrain.push(sequence);
    yTrain.push(scaledData[i]);
  }

  const xs = tf.tensor3d(xTrain, [xTrain.length, predictionDays, 1]);
  const ys = tf.tensor2d(yTrain.map(v => [v]), [yTrain.length, 1]);

  // Build and train
  const model = buildGRUModel(predictionDays, 1);
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  const finalLoss = await trainModel(model, xs, ys, 25);

  // Predict
  const predictions: number[] = [];
  let lastSequence = xTrain[xTrain.length - 1];

  for (let day = 0; day < forecastDays; day++) {
    const inputTensor = tf.tensor3d([lastSequence], [1, predictionDays, 1]);
    const rawPrediction = model.predict(inputTensor) as tf.Tensor2D;
    const scaledPred = (await rawPrediction.data())[0];
    const predictedPrice = scaler.inverse_transform(scaledPred);
    predictions.push(predictedPrice);

    // Update sequence
    lastSequence = lastSequence.slice(1);
    lastSequence.push([scaledPred]);

    inputTensor.dispose();
    rawPrediction.dispose();
  }

  // Cleanup
  xs.dispose();
  ys.dispose();
  model.dispose();

  return formatPrediction(symbol, currentPrice, predictions, forecastDays, 'GRU', finalLoss);
}

export async function runCNNPrediction(
  history: HistoryPoint[],
  symbol: string,
  forecastDays: number = 7
): Promise<PredictionResult> {
  const predictionDays = 30; // CNN works well with shorter sequences for pattern detection

  if (!history || history.length <= predictionDays) {
    throw new Error(`Need at least ${predictionDays + 1} days of data for CNN, got ${history?.length || 0}`);
  }

  const closes = history.map(h => h.close);
  const currentPrice = closes[closes.length - 1];

  // Normalize
  const scaler = new MinMaxScaler();
  const scaledData = scaler.fit_transform(closes);

  // Prepare sequences
  const xTrain: number[][][] = [];
  const yTrain: number[] = [];

  for (let i = predictionDays; i < scaledData.length; i++) {
    const sequence = scaledData.slice(i - predictionDays, i).map(v => [v]);
    xTrain.push(sequence);
    yTrain.push(scaledData[i]);
  }

  const xs = tf.tensor3d(xTrain, [xTrain.length, predictionDays, 1]);
  const ys = tf.tensor2d(yTrain.map(v => [v]), [yTrain.length, 1]);

  // Build and train
  const model = buildCNNModel(predictionDays, 1);
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  const finalLoss = await trainModel(model, xs, ys, 30);

  // Predict
  const predictions: number[] = [];
  let lastSequence = xTrain[xTrain.length - 1];

  for (let day = 0; day < forecastDays; day++) {
    const inputTensor = tf.tensor3d([lastSequence], [1, predictionDays, 1]);
    const rawPrediction = model.predict(inputTensor) as tf.Tensor2D;
    const scaledPred = (await rawPrediction.data())[0];
    const predictedPrice = scaler.inverse_transform(scaledPred);
    predictions.push(predictedPrice);

    lastSequence = lastSequence.slice(1);
    lastSequence.push([scaledPred]);

    inputTensor.dispose();
    rawPrediction.dispose();
  }

  // Cleanup
  xs.dispose();
  ys.dispose();
  model.dispose();

  return formatPrediction(symbol, currentPrice, predictions, forecastDays, 'CNN Pattern Detection', finalLoss);
}

export async function runHybridCNN_GRUPrediction(
  history: HistoryPoint[],
  symbol: string,
  forecastDays: number = 7
): Promise<PredictionResult> {
  const predictionDays = 40;

  if (!history || history.length <= predictionDays) {
    throw new Error(`Need at least ${predictionDays + 1} days of data for CNN-GRU, got ${history?.length || 0}`);
  }

  const closes = history.map(h => h.close);
  const currentPrice = closes[closes.length - 1];

  // Normalize
  const scaler = new MinMaxScaler();
  const scaledData = scaler.fit_transform(closes);

  // Prepare sequences
  const xTrain: number[][][] = [];
  const yTrain: number[] = [];

  for (let i = predictionDays; i < scaledData.length; i++) {
    const sequence = scaledData.slice(i - predictionDays, i).map(v => [v]);
    xTrain.push(sequence);
    yTrain.push(scaledData[i]);
  }

  const xs = tf.tensor3d(xTrain, [xTrain.length, predictionDays, 1]);
  const ys = tf.tensor2d(yTrain.map(v => [v]), [yTrain.length, 1]);

  // Build and train
  const model = buildHybridCNN_GRUModel(predictionDays, 1);
  model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  const finalLoss = await trainModel(model, xs, ys, 25);

  // Predict
  const predictions: number[] = [];
  let lastSequence = xTrain[xTrain.length - 1];

  for (let day = 0; day < forecastDays; day++) {
    const inputTensor = tf.tensor3d([lastSequence], [1, predictionDays, 1]);
    const rawPrediction = model.predict(inputTensor) as tf.Tensor2D;
    const scaledPred = (await rawPrediction.data())[0];
    const predictedPrice = scaler.inverse_transform(scaledPred);
    predictions.push(predictedPrice);

    lastSequence = lastSequence.slice(1);
    lastSequence.push([scaledPred]);

    inputTensor.dispose();
    rawPrediction.dispose();
  }

  // Cleanup
  xs.dispose();
  ys.dispose();
  model.dispose();

  return formatPrediction(symbol, currentPrice, predictions, forecastDays, 'CNN-GRU Hybrid', finalLoss);
}

/**
 * Format prediction result to match PredictionResult interface
 */
function formatPrediction(
  symbol: string,
  currentPrice: number,
  predictions: number[],
  forecastDays: number,
  modelName: string,
  trainingLoss: number
): PredictionResult {
  const confidence = calculateConfidence(predictions, currentPrice, trainingLoss);
  const firstDayChange = ((predictions[0] - currentPrice) / currentPrice) * 100;
  const isBullish = firstDayChange > 0;

  const today = new Date();
  const dayPredictions: DayPrediction[] = [];

  for (let d = 0; d < forecastDays; d++) {
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + d + 1);
    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + 1);
    }

    const pred = predictions[d];
    const uncertainty = currentPrice * 0.02 * Math.sqrt(d + 1);

    dayPredictions.push({
      day: d + 1,
      date: nextDate.toISOString().split('T')[0],
      predicted: Math.round(pred * 100) / 100,
      low: Math.round((pred - uncertainty) * 100) / 100,
      high: Math.round((pred + uncertainty) * 100) / 100,
    });
  }

  const modelBreakdown: ModelPrediction[] = [
    {
      name: modelName,
      prediction: Math.round(predictions[0] * 100) / 100,
      weight: 1.0,
      signal: isBullish ? 'BULLISH' : 'BEARISH'
    },
  ];

  const signals: TradingSignal[] = [
    {
      name: modelName,
      signal: firstDayChange > 2 ? 'STRONG_BUY' : firstDayChange > 0 ? 'BUY' : firstDayChange > -2 ? 'SELL' : 'STRONG_SELL',
      value: Math.round(firstDayChange * 100) / 100,
      description: `${modelName} predicts ${firstDayChange > 0 ? 'upward' : 'downward'} move of ${Math.abs(firstDayChange).toFixed(2)}%`
    },
  ];

  const technicals: TechnicalSummary = {
    rsi: 50, macd: 0, macdSignal: 0, macdHistogram: 0,
    sma20: currentPrice, sma50: currentPrice, ema9: currentPrice, ema21: currentPrice,
    bollingerUpper: currentPrice * 1.05, bollingerLower: currentPrice * 0.95,
    bollingerMiddle: currentPrice, atr: currentPrice * 0.02, vwap: currentPrice,
    adx: 25, obvTrend: 'NEUTRAL' as const
  };

  return {
    symbol,
    currentPrice: Math.round(currentPrice * 100) / 100,
    predictions: dayPredictions,
    confidence: Math.round(confidence * 100) / 100,
    signals,
    insight: `${modelName} predicts ${isBullish ? 'upward' : 'downward'} movement of ${Math.abs(firstDayChange).toFixed(2)}% with ${(confidence * 100).toFixed(0)}% confidence. Training loss: ${trainingLoss.toFixed(6)}.`,
    technicals,
    modelBreakdown,
  };
}
