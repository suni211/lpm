import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';

export class AITradingBot {
  private isRunning = false;
  private volatilityFactor: number;

  constructor(volatilityFactor: number = 0.05) {
    this.volatilityFactor = volatilityFactor;
  }

  // AI 봇 시작
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 매 5분마다 가격 변동 체크 및 조정
    cron.schedule('*/5 * * * *', async () => {
      await this.adjustPrices();
    });

    // 매 1시간마다 유동성 공급
    cron.schedule('0 * * * *', async () => {
      await this.provideLiquidity();
    });

    console.log('✅ AI Trading Bot started');
  }

  // 가격 조정 (변동성 추가) - 0.01% ~ 5% 범위
  async adjustPrices() {
    try {
      const coins = await query('SELECT * FROM coins WHERE status = "ACTIVE"');

      for (const coin of coins) {
        // 최근 거래량 기반 변동성 계산
        const recentTrades = await query(
          `SELECT COUNT(*) as count, SUM(quantity) as volume
           FROM trades
           WHERE coin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
          [coin.id]
        );

        const tradeCount = recentTrades[0].count || 0;
        const volume = recentTrades[0].volume || 0;

        // 기본 변동성 범위: 0.01% ~ 5%
        const minVolatility = 0.0001; // 0.01%
        const maxVolatility = 0.05; // 5%
        
        // 거래가 활발하면 변동성 증가 (최대 5%까지)
        const baseVolatility = minVolatility + (maxVolatility - minVolatility) * Math.min(tradeCount / 100, 1);
        const dynamicVolatility = Math.min(baseVolatility, maxVolatility);

        // 랜덤 가격 변동 (-volatility% ~ +volatility%)
        const priceChange = (Math.random() * 2 - 1) * dynamicVolatility;
        const newPrice = coin.current_price * (1 + priceChange);

        // 가격 업데이트
        await query(
          'UPDATE coins SET current_price = ? WHERE id = ?',
          [newPrice, coin.id]
        );

        // AI 로그 기록
        await query(
          `INSERT INTO ai_trade_logs (id, coin_id, action, price_before, price_after, reason, volatility_factor)
           VALUES (?, ?, 'ADJUST_PRICE', ?, ?, ?, ?)`,
          [
            uuidv4(),
            coin.id,
            coin.current_price,
            newPrice,
            `시장 변동성 조정 (거래량: ${volume}, 변동성: ${(dynamicVolatility * 100).toFixed(2)}%)`,
            dynamicVolatility,
          ]
        );

        console.log(`📊 ${coin.symbol}: ${coin.current_price.toFixed(2)} → ${newPrice.toFixed(2)} (${(priceChange * 100).toFixed(2)}%, 변동성: ${(dynamicVolatility * 100).toFixed(2)}%)`);
      }
    } catch (error) {
      console.error('AI 가격 조정 오류:', error);
    }
  }

  // 유동성 공급 (거래 활성화)
  async provideLiquidity() {
    try {
      const coins = await query('SELECT * FROM coins WHERE status = "ACTIVE"');

      for (const coin of coins) {
        // AI 매수 주문 생성 (시장 안정화)
        const buyPrice = coin.current_price * 0.98; // 현재가 -2%
        const buyQuantity = Math.random() * 1000 + 500;

        // AI 매도 주문 생성
        const sellPrice = coin.current_price * 1.02; // 현재가 +2%
        const sellQuantity = Math.random() * 1000 + 500;

        // AI 지갑 생성 (없으면)
        let aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
        if (!aiWallet) {
          await query(
            `INSERT INTO user_wallets (id, minecraft_username, minecraft_uuid, gold_balance)
             VALUES (?, 'AI_BOT', 'AI_BOT_UUID', 999999999999)`,
            [uuidv4()]
          );
          aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
        }

        // 매수 주문
        await query(
          `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, price, quantity, status, is_admin_order)
           VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
          [uuidv4(), aiWallet.id, coin.id, buyPrice, buyQuantity]
        );

        // 매도 주문
        await query(
          `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, price, quantity, status, is_admin_order)
           VALUES (?, ?, ?, 'SELL', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
          [uuidv4(), aiWallet.id, coin.id, sellPrice, sellQuantity]
        );

        console.log(`💧 ${coin.symbol} 유동성 공급: 매수 ${buyQuantity}@${buyPrice}, 매도 ${sellQuantity}@${sellPrice}`);
      }
    } catch (error) {
      console.error('유동성 공급 오류:', error);
    }
  }

  // ADMIN 가격 수동 조정
  async adminAdjustPrice(coinId: string, newPrice: number, reason: string) {
    const coin = (await query('SELECT * FROM coins WHERE id = ?', [coinId]))[0];

    if (!coin) {
      throw new Error('코인을 찾을 수 없습니다');
    }

    await query('UPDATE coins SET current_price = ? WHERE id = ?', [newPrice, coinId]);

    await query(
      `INSERT INTO ai_trade_logs (id, coin_id, action, price_before, price_after, reason)
       VALUES (?, ?, 'ADJUST_PRICE', ?, ?, ?)`,
      [uuidv4(), coinId, coin.current_price, newPrice, `ADMIN 수동 조정: ${reason}`]
    );

    return { oldPrice: coin.current_price, newPrice };
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️  AI Trading Bot stopped');
  }
}

// AI 변동성 범위: 0.01% ~ 5% (기본값 0.05 = 5%)
export default new AITradingBot(parseFloat(process.env.AI_VOLATILITY_FACTOR || '0.05'));
