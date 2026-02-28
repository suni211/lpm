import { RowDataPacket } from 'mysql2/promise';
import pool from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

interface Stock extends RowDataPacket {
  id: string;
  symbol: string;
  current_price: number;
  circulating_supply: number;
  market_cap: number;
}

interface CKIndex extends RowDataPacket {
  index_value: number;
  timestamp: Date;
}

/**
 * CK 지수 계산 서비스
 *
 * CK (시케이) 지수:
 * - 모든 상장 주식의 시가총액 가중 평균 지수
 * - 기준 지수: 1000.00
 * - 실시간 업데이트
 */

class CKIndexService {
  private readonly BASE_INDEX = 1000.00;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * CK 지수 계산
   */
  async calculateCKIndex(): Promise<number> {
    const conn = await pool.getConnection();
    try {
      // 모든 활성 주식 조회
      const [stocks] = await conn.query<Stock[]>(
        `SELECT id, symbol, current_price, circulating_supply, market_cap
         FROM stocks
         WHERE status = 'ACTIVE'`
      );

      if (stocks.length === 0) {
        return this.BASE_INDEX;
      }

      // 총 시가총액 계산
      const totalMarketCap = stocks.reduce((sum, stock) => sum + Number(stock.market_cap), 0);

      if (totalMarketCap === 0) {
        return this.BASE_INDEX;
      }

      // 최초 기준 시가총액 조회 (또는 설정)
      const baseMarketCap = await this.getOrSetBaseMarketCap(conn, totalMarketCap);

      // CK 지수 = (현재 총 시가총액 / 기준 총 시가총액) × 1000
      const ckIndex = (totalMarketCap / baseMarketCap) * this.BASE_INDEX;

      return Math.round(ckIndex * 100) / 100; // 소수점 2자리

    } finally {
      conn.release();
    }
  }

  /**
   * 기준 시가총액 조회 또는 설정
   */
  private async getOrSetBaseMarketCap(conn: any, currentMarketCap: number): Promise<number> {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT config_value FROM system_config WHERE config_key = 'ck_base_market_cap'`
    );

    if (rows.length > 0) {
      return parseFloat(rows[0].config_value);
    }

    // 최초 설정: 현재 시가총액을 기준으로
    await conn.query(
      `INSERT INTO system_config (config_key, config_value) VALUES ('ck_base_market_cap', ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
      [currentMarketCap.toString()]
    );

    return currentMarketCap;
  }

  /**
   * CK 지수 저장
   */
  async saveCKIndex(indexValue: number): Promise<void> {
    const conn = await pool.getConnection();
    try {
      // 이전 지수 조회
      const [prevRows] = await conn.query<CKIndex[]>(
        `SELECT index_value FROM ck_index ORDER BY timestamp DESC LIMIT 1`
      );

      const prevIndex = prevRows.length > 0 ? prevRows[0].index_value : this.BASE_INDEX;

      // 변동률 계산
      const changePercent = ((indexValue - prevIndex) / prevIndex) * 100;

      // 새 지수 저장
      await conn.query(
        `INSERT INTO ck_index (id, index_value, change_percent) VALUES (?, ?, ?)`,
        [uuidv4(), indexValue, changePercent]
      );

      console.log(`[CK Index] ${indexValue.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);

    } finally {
      conn.release();
    }
  }

  /**
   * 최신 CK 지수 조회
   */
  async getLatestCKIndex(): Promise<{ value: number; change: number }> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query<CKIndex[]>(
        `SELECT index_value, change_percent FROM ck_index ORDER BY timestamp DESC LIMIT 1`
      );

      if (rows.length === 0) {
        return { value: this.BASE_INDEX, change: 0 };
      }

      return {
        value: rows[0].index_value,
        change: rows[0].change_percent
      };

    } finally {
      conn.release();
    }
  }

  /**
   * CK 지수 자동 업데이트 시작 (1분마다)
   */
  startAutoUpdate(): void {
    if (this.updateInterval) {
      console.log('[CK Index] 이미 자동 업데이트가 실행 중입니다.');
      return;
    }

    console.log('[CK Index] 자동 업데이트 시작 (1분마다)');

    // 즉시 1회 실행
    this.updateCKIndex();

    // 1분마다 실행
    this.updateInterval = setInterval(() => {
      this.updateCKIndex();
    }, 60 * 1000);
  }

  /**
   * CK 지수 자동 업데이트 중지
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[CK Index] 자동 업데이트 중지');
    }
  }

  /**
   * CK 지수 업데이트 (계산 + 저장)
   */
  private async updateCKIndex(): Promise<void> {
    try {
      const indexValue = await this.calculateCKIndex();
      await this.saveCKIndex(indexValue);
    } catch (error) {
      console.error('[CK Index] 업데이트 오류:', error);
    }
  }

  /**
   * CK 지수 히스토리 조회 (차트용)
   */
  async getCKIndexHistory(hours: number = 24): Promise<any[]> {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query<CKIndex[]>(
        `SELECT index_value, change_percent, timestamp
         FROM ck_index
         WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         ORDER BY timestamp ASC`,
        [hours]
      );

      return rows.map(row => ({
        value: row.index_value,
        change: row.change_percent,
        time: row.timestamp
      }));

    } finally {
      conn.release();
    }
  }
}

export default new CKIndexService();
