import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 캔들 데이터 저장/업데이트 유틸리티
 * AI 봇 가격 변동 및 실제 거래 모두에서 사용
 */

// Date를 MySQL DATETIME 포맷으로 변환 (YYYY-MM-DD HH:MM:SS)
// UTC 시간을 그대로 사용
function toMySQLDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 1분봉 캔들 데이터 저장/업데이트
export async function updateCandleData(
  coinId: string,
  price: number,
  volume: number = 0
): Promise<void> {
  try {
    const now = new Date();

    // 1분 단위로 내림 (초/밀리초를 0으로)
    const openTimeMinute = Math.floor(now.getTime() / 60000) * 60000;
    const openTime = new Date(openTimeMinute);

    const closeTime = new Date(openTime);
    closeTime.setUTCMinutes(closeTime.getUTCMinutes() + 1);

    // MySQL DATETIME 포맷으로 변환
    const openTimeStr = toMySQLDateTime(openTime);
    const closeTimeStr = toMySQLDateTime(closeTime);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1m WHERE coin_id = ? AND open_time = ?',
      [coinId, openTimeStr]
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
        [price, price, price, volume, coinId, openTimeStr]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1m (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTimeStr, closeTimeStr, price, price, price, price, volume]
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
    const openTimeHour = Math.floor(now.getTime() / 3600000) * 3600000;
    const openTime = new Date(openTimeHour);

    const closeTime = new Date(openTime);
    closeTime.setUTCHours(closeTime.getUTCHours() + 1);

    // MySQL DATETIME 포맷으로 변환
    const openTimeStr = toMySQLDateTime(openTime);
    const closeTimeStr = toMySQLDateTime(closeTime);

    console.log(`[1시간봉] UTC: ${now.toISOString()}, open_time: ${openTimeStr}`);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1h WHERE coin_id = ? AND open_time = ?',
      [coinId, openTimeStr]
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
        [price, price, price, volume, coinId, openTimeStr]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1h (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTimeStr, closeTimeStr, price, price, price, price, volume]
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
    const openTimeDay = Math.floor(now.getTime() / 86400000) * 86400000;
    const openTime = new Date(openTimeDay);

    const closeTime = new Date(openTime);
    closeTime.setUTCDate(closeTime.getUTCDate() + 1);

    // MySQL DATETIME 포맷으로 변환
    const openTimeStr = toMySQLDateTime(openTime);
    const closeTimeStr = toMySQLDateTime(closeTime);

    console.log(`[1일봉] UTC: ${now.toISOString()}, open_time: ${openTimeStr}`);

    // 기존 캔들 확인
    const existing = await query(
      'SELECT * FROM candles_1d WHERE coin_id = ? AND open_time = ?',
      [coinId, openTimeStr]
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
        [price, price, price, volume, coinId, openTimeStr]
      );
    } else {
      // 새 캔들 생성
      await query(
        `INSERT INTO candles_1d (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTimeStr, closeTimeStr, price, price, price, price, volume]
      );
    }
  } catch (error) {
    console.error('1일봉 캔들 데이터 업데이트 오류:', error);
  }
}
