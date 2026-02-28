import express, { Request, Response } from 'express';
import { query } from '../database/db';
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateSMA,
  calculateVolumeMA,
} from '../utils/technicalIndicators';

const router = express.Router();

// 기술적 지표 계산 (공개 API)
router.get('/indicators/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { interval = '1h', limit = 100 } = req.query;

    // 캔들 데이터 조회
    const candles = await query(
      `SELECT open_time, open_price, high_price, low_price, close_price, volume
       FROM candles_${interval}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    if (candles.length === 0) {
      return res.json({
        rsi: [],
        macd: { macd: [], signal: [], histogram: [] },
        bollingerBands: { upper: [], middle: [], lower: [] },
        sma20: [],
        sma50: [],
        volumeMA: [],
      });
    }

    // 시간순 정렬 (오래된 것부터)
    candles.reverse();

    // 지표 계산
    const rsi = calculateRSI(candles, 14);
    const macd = calculateMACD(candles, 12, 26, 9);
    const bollingerBands = calculateBollingerBands(candles, 20, 2);
    const sma20 = calculateSMA(candles, 20);
    const sma50 = calculateSMA(candles, 50);
    const volumeMA = calculateVolumeMA(candles, 20);

    res.json({
      rsi,
      macd,
      bollingerBands,
      sma20,
      sma50,
      volumeMA,
      candleCount: candles.length,
    });
  } catch (error) {
    console.error('지표 계산 오류:', error);
    res.status(500).json({ error: '지표 계산 실패' });
  }
});

// RSI만 계산
router.get('/rsi/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { interval = '1h', period = 14, limit = 100 } = req.query;

    const candles = await query(
      `SELECT close_price
       FROM candles_${interval}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    candles.reverse();
    const rsi = calculateRSI(candles, Number(period));

    res.json({ rsi, current: rsi[rsi.length - 1] || null });
  } catch (error) {
    console.error('RSI 계산 오류:', error);
    res.status(500).json({ error: 'RSI 계산 실패' });
  }
});

// MACD만 계산
router.get('/macd/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { interval = '1h', limit = 100 } = req.query;

    const candles = await query(
      `SELECT close_price
       FROM candles_${interval}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    candles.reverse();
    const macd = calculateMACD(candles, 12, 26, 9);

    res.json({
      macd: macd.macd,
      signal: macd.signal,
      histogram: macd.histogram,
      current: {
        macd: macd.macd[macd.macd.length - 1] || null,
        signal: macd.signal[macd.signal.length - 1] || null,
        histogram: macd.histogram[macd.histogram.length - 1] || null,
      },
    });
  } catch (error) {
    console.error('MACD 계산 오류:', error);
    res.status(500).json({ error: 'MACD 계산 실패' });
  }
});

// 볼린저 밴드만 계산
router.get('/bollinger/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { interval = '1h', period = 20, stdDev = 2, limit = 100 } = req.query;

    const candles = await query(
      `SELECT close_price
       FROM candles_${interval}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    candles.reverse();
    const bb = calculateBollingerBands(candles, Number(period), Number(stdDev));

    res.json({
      upper: bb.upper,
      middle: bb.middle,
      lower: bb.lower,
      current: {
        upper: bb.upper[bb.upper.length - 1] || null,
        middle: bb.middle[bb.middle.length - 1] || null,
        lower: bb.lower[bb.lower.length - 1] || null,
      },
    });
  } catch (error) {
    console.error('볼린저 밴드 계산 오류:', error);
    res.status(500).json({ error: '볼린저 밴드 계산 실패' });
  }
});

export default router;
