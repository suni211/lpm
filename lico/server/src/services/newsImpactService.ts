import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../database/connection';
import { v4 as uuidv4 } from 'uuid';

interface News extends RowDataPacket {
  id: string;
  impact_type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  impact_strength: number;
  affected_group_id: string | null;
  affected_industry_id: string | null;
  affected_stock_id: string | null;
  ai_trigger_duration: number;
  ai_trigger_start_time: Date;
}

interface Stock extends RowDataPacket {
  id: string;
  symbol: string;
  current_price: number;
  industry_id: string;
}

/**
 * 뉴스 영향력 AI 자동 매매 서비스
 *
 * 운영자가 뉴스 작성 시:
 * - impact_type: POSITIVE (긍정) | NEGATIVE (부정) | NEUTRAL (중립)
 * - impact_strength: 0-100 (영향력 강도)
 * - affected_industry_id: 영향받는 산업 (NULL이면 전체 시장)
 * - affected_stock_id: 영향받는 특정 주식 (NULL이면 산업 전체)
 * - ai_trigger_duration: AI 매매 지속 시간 (분)
 *
 * AI 동작:
 * - POSITIVE: 매수 주문 증가, 가격 상승 압력
 * - NEGATIVE: 매도 주문 증가, 가격 하락 압력
 * - 영향력 강도에 비례하여 주문량 결정
 */

class NewsImpactService {
  private activeNewsImpacts: Set<string> = new Set(); // 현재 활성화된 뉴스 ID

  /**
   * 뉴스 발행 시 AI 트리거 시작
   */
  async startNewsImpact(newsId: string): Promise<void> {
    const conn = await pool.getConnection();
    try {
      // 뉴스 정보 조회
      const [newsRows] = await conn.query<News[]>(
        `SELECT id, impact_type, impact_strength, affected_group_id, affected_industry_id,
                affected_stock_id, ai_trigger_duration, ai_trigger_enabled
         FROM news
         WHERE id = ? AND status = 'PUBLISHED' AND ai_trigger_enabled = TRUE`,
        [newsId]
      );

      if (newsRows.length === 0) {
        console.log(`[NewsImpact] 뉴스 ${newsId} - AI 트리거 비활성화 또는 찾을 수 없음`);
        return;
      }

      const news = newsRows[0];

      // 중립 뉴스는 영향 없음
      if (news.impact_type === 'NEUTRAL' || news.impact_strength === 0) {
        console.log(`[NewsImpact] 뉴스 ${newsId} - 중립 또는 영향력 0`);
        return;
      }

      // AI 트리거 시작 시간 기록
      await conn.query(
        `UPDATE news SET ai_trigger_started = TRUE, ai_trigger_start_time = NOW() WHERE id = ?`,
        [newsId]
      );

      this.activeNewsImpacts.add(newsId);

      // 영향받는 주식 목록 조회
      const affectedStocks = await this.getAffectedStocks(conn, news);

      console.log(`[NewsImpact] 뉴스 발행: ${newsId}`);
      console.log(`  - 영향 타입: ${news.impact_type}`);
      console.log(`  - 영향 강도: ${news.impact_strength}%`);
      console.log(`  - 영향 주식 수: ${affectedStocks.length}`);
      console.log(`  - 지속 시간: ${news.ai_trigger_duration}분`);

      // AI 매매 시작
      this.executeAITrading(news, affectedStocks);

      // 지속 시간 후 종료
      setTimeout(() => {
        this.stopNewsImpact(newsId);
      }, news.ai_trigger_duration * 60 * 1000);

    } finally {
      conn.release();
    }
  }

  /**
   * 영향받는 주식 목록 조회
   * 우선순위: 특정 주식 > 그룹 전체 > 산업 전체 > 전체 시장
   */
  private async getAffectedStocks(conn: any, news: News): Promise<Stock[]> {
    let query = 'SELECT id, symbol, current_price, industry_id FROM stocks WHERE status = "ACTIVE"';
    const params: any[] = [];

    // 1. 특정 주식 지정
    if (news.affected_stock_id) {
      query += ' AND id = ?';
      params.push(news.affected_stock_id);
    }
    // 2. 특정 그룹 지정 (그룹 내 모든 주식)
    else if (news.affected_group_id) {
      query += ' AND group_id = ?';
      params.push(news.affected_group_id);
    }
    // 3. 특정 산업 지정
    else if (news.affected_industry_id) {
      query += ' AND industry_id = ?';
      params.push(news.affected_industry_id);
    }
    // 4. 전체 시장 (조건 없음)

    const [stocks] = await conn.query<Stock[]>(query, params);
    return stocks;
  }

  /**
   * AI 자동 매매 실행
   */
  private async executeAITrading(news: News, stocks: Stock[]): Promise<void> {
    const interval = 30000; // 30초마다 실행
    const duration = news.ai_trigger_duration * 60 * 1000;
    const endTime = Date.now() + duration;

    const tradingInterval = setInterval(async () => {
      if (Date.now() >= endTime || !this.activeNewsImpacts.has(news.id)) {
        clearInterval(tradingInterval);
        return;
      }

      for (const stock of stocks) {
        await this.createAIOrder(news, stock);
      }
    }, interval);
  }

  /**
   * AI 주문 생성
   */
  private async createAIOrder(news: News, stock: Stock): Promise<void> {
    const conn = await pool.getConnection();
    try {
      // AI 전용 지갑 조회 (없으면 생성)
      const aiWallet = await this.getOrCreateAIWallet(conn);

      // 영향력 강도에 따라 주문량 결정 (1% ~ 100%)
      const baseQuantity = 100; // 기본 100주
      const quantity = Math.floor(baseQuantity * (news.impact_strength / 100));

      // POSITIVE: 매수, NEGATIVE: 매도
      const orderType = news.impact_type === 'POSITIVE' ? 'BUY' : 'SELL';

      // 가격 변동 (영향력 강도에 비례)
      const priceChange = (news.impact_strength / 100) * 0.02; // 최대 ±2%
      const price = news.impact_type === 'POSITIVE'
        ? stock.current_price * (1 + priceChange)
        : stock.current_price * (1 - priceChange);

      // AI 주문 생성
      const orderId = uuidv4();
      await conn.query(
        `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, is_ai_order, status)
         VALUES (?, ?, ?, ?, 'LIMIT', ?, ?, TRUE, 'PENDING')`,
        [orderId, aiWallet.id, stock.id, orderType, price, quantity]
      );

      // AI 거래 로그
      await conn.query(
        `INSERT INTO ai_trade_logs (stock_id, action, price_before, price_after, quantity, reason, news_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          stock.id,
          orderType,
          stock.current_price,
          price,
          quantity,
          `뉴스 영향: ${news.impact_type} ${news.impact_strength}%`,
          news.id
        ]
      );

      console.log(`[NewsImpact] AI 주문 생성: ${stock.symbol} ${orderType} ${quantity}주 @ ₩${price.toFixed(2)}`);

    } finally {
      conn.release();
    }
  }

  /**
   * AI 전용 지갑 조회 또는 생성
   */
  private async getOrCreateAIWallet(conn: any): Promise<any> {
    const [wallets] = await conn.query(
      `SELECT * FROM user_wallets WHERE minecraft_username = 'AI_TRADER'`
    );

    if (wallets.length > 0) {
      return wallets[0];
    }

    // AI 지갑 생성
    const walletId = uuidv4();
    const walletAddress = 'AI' + Math.random().toString(36).substring(2, 32).toUpperCase();

    await conn.query(
      `INSERT INTO user_wallets (id, wallet_address, minecraft_username, krw_balance, status)
       VALUES (?, ?, 'AI_TRADER', 999999999999, 'ACTIVE')`,
      [walletId, walletAddress]
    );

    return { id: walletId, wallet_address: walletAddress };
  }

  /**
   * 뉴스 영향 종료
   */
  async stopNewsImpact(newsId: string): Promise<void> {
    this.activeNewsImpacts.delete(newsId);
    console.log(`[NewsImpact] 뉴스 ${newsId} 영향 종료`);

    const conn = await pool.getConnection();
    try {
      await conn.query(
        `UPDATE news SET ai_trigger_started = FALSE WHERE id = ?`,
        [newsId]
      );
    } finally {
      conn.release();
    }
  }

  /**
   * 서버 시작 시 활성화된 뉴스 영향 재개
   */
  async resumeActiveNewsImpacts(): Promise<void> {
    const conn = await pool.getConnection();
    try {
      const [activeNews] = await conn.query<News[]>(
        `SELECT * FROM news
         WHERE ai_trigger_started = TRUE
           AND status = 'PUBLISHED'
           AND ai_trigger_enabled = TRUE
           AND TIMESTAMPDIFF(MINUTE, ai_trigger_start_time, NOW()) < ai_trigger_duration`
      );

      for (const news of activeNews) {
        const remainingMinutes = news.ai_trigger_duration -
          Math.floor((Date.now() - new Date(news.ai_trigger_start_time).getTime()) / 60000);

        if (remainingMinutes > 0) {
          console.log(`[NewsImpact] 뉴스 ${news.id} 영향 재개 (남은 시간: ${remainingMinutes}분)`);

          // 남은 시간만큼 다시 시작
          const affectedStocks = await this.getAffectedStocks(conn, news);
          this.activeNewsImpacts.add(news.id);
          this.executeAITrading(news, affectedStocks);

          setTimeout(() => {
            this.stopNewsImpact(news.id);
          }, remainingMinutes * 60 * 1000);
        }
      }
    } finally {
      conn.release();
    }
  }
}

export default new NewsImpactService();
