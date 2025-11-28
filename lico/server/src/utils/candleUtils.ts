import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 캔들 데이터 저장/업데이트 유틸리티
 * AI 봇 가격 변동 및 실제 거래 모두에서 사용
 */

// 1분봉 캔들 데이터 저장/업데이트
export async function updateCandleData(
  coinId: string,
  price: number,
  volume: number = 0
): Promise<void> {
  try {
    const now = new Date();

    // 1분 단위로 내림 (초/밀리초를 0으로)
    const openTime = new Date(now);
    openTime.setSeconds(0, 0);

    const closeTime = new Date(openTime);
    closeTime.setMinutes(closeTime.getMinutes() + 1);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1m WHERE coin_id = ? AND open_time = ?',
      [coinId, openTime]
    );

    if (existing.length > 0) {
      // 기존 캔들 업데이트
      await query(
        `UPDATE candles_1m
         SET high_price = GREATEST(high_price, ?),
             low_price = LEAST(low_price, ?),
             close_price = ?,
             volume = volume + ?,
             trade_count = trade_count + 1
         WHERE coin_id = ? AND open_time = ?`,
        [price, price, price, volume, coinId, openTime]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1m (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTime, closeTime, price, price, price, price, volume]
      );
    }

    // 1시간봉도 업데이트
    await updateHourlyCandleData(coinId, price, volume);

    // 1일봉도 업데이트
    await updateDailyCandleData(coinId, price, volume);
  } catch (error) {
    console.error('캔들 데이터 업데이트 오류:', error);
  }
}

// 1시간봉 캔들 데이터 저장/업데이트
async function updateHourlyCandleData(
  coinId: string,
  price: number,
  volume: number = 0
): Promise<void> {
  try {
    const now = new Date();

    // 1시간 단위로 내림 (분/초/밀리초를 0으로)
    const openTime = new Date(now);
    openTime.setMinutes(0, 0, 0);

    const closeTime = new Date(openTime);
    closeTime.setHours(closeTime.getHours() + 1);

    console.log(`[1시간봉] 현재시간: ${now.toLocaleString('ko-KR')}, open_time: ${openTime.toLocaleString('ko-KR')}`);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1h WHERE coin_id = ? AND open_time = ?',
      [coinId, openTime]
    );

    if (existing.length > 0) {
      // 기존 캔들 업데이트
      await query(
        `UPDATE candles_1h
         SET high_price = GREATEST(high_price, ?),
             low_price = LEAST(low_price, ?),
             close_price = ?,
             volume = volume + ?,
             trade_count = trade_count + 1
         WHERE coin_id = ? AND open_time = ?`,
        [price, price, price, volume, coinId, openTime]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1h (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTime, closeTime, price, price, price, price, volume]
      );
    }
  } catch (error) {
    console.error('1시간봉 캔들 데이터 업데이트 오류:', error);
  }
}

// 1일봉 캔들 데이터 저장/업데이트
async function updateDailyCandleData(
  coinId: string,
  price: number,
  volume: number = 0
): Promise<void> {
  try {
    const now = new Date();

    // 1일 단위로 내림 (시/분/초/밀리초를 0으로)
    const openTime = new Date(now);
    openTime.setHours(0, 0, 0, 0);

    const closeTime = new Date(openTime);
    closeTime.setDate(closeTime.getDate() + 1);

    console.log(`[1일봉] 현재시간: ${now.toLocaleString('ko-KR')}, open_time: ${openTime.toLocaleString('ko-KR')}`);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1d WHERE coin_id = ? AND open_time = ?',
      [coinId, openTime]
    );

    if (existing.length > 0) {
      // 기존 캔들 업데이트
      await query(
        `UPDATE candles_1d
         SET high_price = GREATEST(high_price, ?),
             low_price = LEAST(low_price, ?),
             close_price = ?,
             volume = volume + ?,
             trade_count = trade_count + 1
         WHERE coin_id = ? AND open_time = ?`,
        [price, price, price, volume, coinId, openTime]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1d (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTime, closeTime, price, price, price, price, volume]
      );
    }
  } catch (error) {
    console.error('1일봉 캔들 데이터 업데이트 오류:', error);
  }
}
