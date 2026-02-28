/**
 * 기술적 지표 계산 유틸리티
 * RSI, MACD, 볼린저 밴드
 */

interface CandleData {
  close_price: number | string;
  high_price?: number | string;
  low_price?: number | string;
  volume?: number | string;
}

/**
 * RSI (Relative Strength Index) 계산
 * 과매수/과매도 지표 (0~100)
 * - 70 이상: 과매수 (매도 신호)
 * - 30 이하: 과매도 (매수 신호)
 */
export function calculateRSI(candles: CandleData[], period: number = 14): number[] {
  if (candles.length < period + 1) {
    return [];
  }

  const prices = candles.map(c =>
    typeof c.close_price === 'string' ? parseFloat(c.close_price) : c.close_price
  );

  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // 가격 변화 계산
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // 첫 번째 RSI 계산 (단순 평균)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    rsi.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  // 나머지 RSI 계산 (EMA 방식)
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

/**
 * MACD (Moving Average Convergence Divergence) 계산
 * 추세 추종 모멘텀 지표
 * - MACD 선: 12일 EMA - 26일 EMA
 * - Signal 선: MACD의 9일 EMA
 * - Histogram: MACD - Signal
 */
export function calculateMACD(
  candles: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const prices = candles.map(c =>
    typeof c.close_price === 'string' ? parseFloat(c.close_price) : c.close_price
  );

  // EMA 계산
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);

  // MACD 선 계산
  const macdLine: number[] = [];
  const startIndex = Math.max(0, slowPeriod - 1);

  for (let i = startIndex; i < prices.length; i++) {
    const fastIdx = i - (slowPeriod - fastPeriod);
    if (fastIdx >= 0 && i - startIndex < emaSlow.length) {
      macdLine.push(emaFast[fastIdx] - emaSlow[i - startIndex]);
    }
  }

  // Signal 선 계산 (MACD의 EMA)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Histogram 계산
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const macdIdx = i + (signalPeriod - 1);
    if (macdIdx < macdLine.length) {
      histogram.push(macdLine[macdIdx] - signalLine[i]);
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram,
  };
}

/**
 * 볼린저 밴드 (Bollinger Bands) 계산
 * 변동성 기반 지표
 * - 중심선: 20일 이동평균
 * - 상단: 중심선 + (2 * 표준편차)
 * - 하단: 중심선 - (2 * 표준편차)
 */
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const prices = candles.map(c =>
    typeof c.close_price === 'string' ? parseFloat(c.close_price) : c.close_price
  );

  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);

    // 이동평균 (중심선)
    const sma = slice.reduce((a, b) => a + b, 0) / period;

    // 표준편차
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    middle.push(sma);
    upper.push(sma + (stdDev * std));
    lower.push(sma - (stdDev * std));
  }

  return { upper, middle, lower };
}

/**
 * EMA (Exponential Moving Average) 계산
 * 지수 이동평균
 */
function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    return [];
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // 첫 번째 EMA는 SMA
  const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(sma);

  // 나머지 EMA 계산
  for (let i = period; i < prices.length; i++) {
    const value = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  return ema;
}

/**
 * SMA (Simple Moving Average) 계산
 * 단순 이동평균
 */
export function calculateSMA(candles: CandleData[], period: number): number[] {
  const prices = candles.map(c =>
    typeof c.close_price === 'string' ? parseFloat(c.close_price) : c.close_price
  );

  const sma: number[] = [];

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const average = slice.reduce((a, b) => a + b, 0) / period;
    sma.push(average);
  }

  return sma;
}

/**
 * 거래량 이동평균 계산
 */
export function calculateVolumeMA(candles: CandleData[], period: number): number[] {
  const volumes = candles.map(c =>
    typeof c.volume === 'string' ? parseFloat(c.volume) : (c.volume || 0)
  );

  const vma: number[] = [];

  for (let i = period - 1; i < volumes.length; i++) {
    const slice = volumes.slice(i - period + 1, i + 1);
    const average = slice.reduce((a, b) => a + b, 0) / period;
    vma.push(average);
  }

  return vma;
}
