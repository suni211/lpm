/**
 * 기술적 지표 계산 유틸리티
 */

export interface PriceData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorData {
  time: number;
  value: number;
}

// SMA (Simple Moving Average)
export function calculateSMA(data: PriceData[], period: number): IndicatorData[] {
  if (data.length < period) return [];

  const result: IndicatorData[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;

    if (i >= period - 1) {
      if (i >= period) {
        sum -= data[i - period].close;
      }
      result.push({
        time: data[i].time,
        value: sum / period,
      });
    }
  }

  return result;
}

// EMA (Exponential Moving Average)
export function calculateEMA(data: PriceData[], period: number): IndicatorData[] {
  if (data.length < period) return [];

  const multiplier = 2 / (period + 1);
  const result: IndicatorData[] = [];

  // 첫 EMA는 SMA로 시작
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += data[i].close;
  }
  ema /= period;
  result.push({ time: data[period - 1].time, value: ema });

  // 이후 EMA 계산
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }

  return result;
}

// Bollinger Bands
export function calculateBollingerBands(
  data: PriceData[],
  period: number,
  stdDev: number = 2
): { upper: IndicatorData[]; middle: IndicatorData[]; lower: IndicatorData[] } {
  if (data.length < period) {
    return { upper: [], middle: [], lower: [] };
  }

  const sma = calculateSMA(data, period);
  const upper: IndicatorData[] = [];
  const middle: IndicatorData[] = [];
  const lower: IndicatorData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const smaIndex = i - (period - 1);
    if (smaIndex < 0 || smaIndex >= sma.length) continue;

    const mean = sma[smaIndex].value;
    let variance = 0;

    // 표준편차 계산
    for (let j = i - period + 1; j <= i; j++) {
      variance += Math.pow(data[j].close - mean, 2);
    }
    const stdDeviation = Math.sqrt(variance / period);

    const time = data[i].time;
    middle.push({ time, value: mean });
    upper.push({ time, value: mean + stdDeviation * stdDev });
    lower.push({ time, value: mean - stdDeviation * stdDev });
  }

  return { upper, middle, lower };
}

// RSI (Relative Strength Index)
export function calculateRSI(data: PriceData[], period: number = 14): IndicatorData[] {
  if (data.length < period + 1) return [];

  const result: IndicatorData[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // 초기 평균 계산
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  // 첫 RSI 계산
  if (avgLoss === 0) {
    result.push({ time: data[period].time, value: 100 });
  } else {
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[period].time, value: rsi });
  }

  // 이후 RSI 계산 (Wilder's Smoothing)
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push({ time: data[i].time, value: 100 });
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push({ time: data[i].time, value: rsi });
    }
  }

  return result;
}

// MACD
export function calculateMACD(
  data: PriceData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: IndicatorData[]; signal: IndicatorData[]; histogram: IndicatorData[] } {
  if (data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // MACD 라인 계산
  const macd: IndicatorData[] = [];
  const fastStartIndex = fastPeriod - 1;
  const slowStartIndex = slowPeriod - 1;

  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + (slowStartIndex - fastStartIndex);
    if (fastIndex >= 0 && fastIndex < fastEMA.length) {
      macd.push({
        time: slowEMA[i].time,
        value: fastEMA[fastIndex].value - slowEMA[i].value,
      });
    }
  }

  // Signal 라인 계산 (MACD의 EMA)
  const signal = calculateEMA(
    macd.map(m => ({ time: m.time, open: m.value, high: m.value, low: m.value, close: m.value })),
    signalPeriod
  );

  // Histogram 계산
  const histogram: IndicatorData[] = [];
  for (let i = 0; i < macd.length; i++) {
    const signalIndex = i - (macd.length - signal.length);
    if (signalIndex >= 0 && signalIndex < signal.length) {
      histogram.push({
        time: macd[i].time,
        value: macd[i].value - signal[signalIndex].value,
      });
    }
  }

  return { macd, signal, histogram };
}

