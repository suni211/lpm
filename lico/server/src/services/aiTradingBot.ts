import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { updateCandleData } from '../utils/candleUtils';

// WebSocket 인스턴스를 가져오기 위한 타입
let websocketInstance: any = null;

export function setWebSocketInstance(ws: any) {
  websocketInstance = ws;
}

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

    // 자동 가격 변동 활성화 - 10초마다 실행
    setInterval(async () => {
      await this.adjustPrices();
    }, 10000);

    // 백업: 매 1분마다 유동성 공급 (실시간 업데이트가 주이지만 백업으로 유지)
    cron.schedule('* * * * *', async () => {
      await this.provideLiquidity();
    });

    console.log('✅ AI Trading Bot started (가격 변동 활성화, 유동성 공급 활성화)');
  }

  // 특정 주식 가격 조정 (실시간)
  async adjustPriceForStock(stockId: string) {
    try {
      const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stockId]);
      if (stocks.length === 0) return;

      const stock = stocks[0];
      await this.adjustSingleStockPrice(stock);
    } catch (error) {
      console.error(`가격 조정 오류 (${stockId}):`, error);
    }
  }

  // 단일 주식 가격 조정
  private async adjustSingleStockPrice(stock: any) {
    // current_price를 숫자로 변환 (DECIMAL 타입이 문자열로 올 수 있음)
    const currentPrice = typeof stock.current_price === 'string'
      ? parseFloat(stock.current_price)
      : (stock.current_price || 0);

    if (isNaN(currentPrice) || currentPrice <= 0) {
      return;
    }

    // 최근 거래량 기반 변동성 계산
    const recentTrades = await query(
      `SELECT COUNT(*) as count, SUM(quantity) as volume
       FROM trades
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [stock.id]
    );

    const tradeCount = recentTrades[0]?.count || 0;
    const volume = parseFloat(recentTrades[0]?.volume || 0) || 0;

    // 각 주식별 변동성 범위 사용 (설정되지 않으면 기본값: 0.01% ~ 5%)
    const minVolatility = parseFloat(stock.min_volatility) || 0.0001; // 0.01%
    const maxVolatility = parseFloat(stock.max_volatility) || 0.05; // 5%

    // 거래가 활발하면 변동성 증가 (최대 maxVolatility까지)
    // 거래량이 많을수록 변동성 증가
    const volumeFactor = Math.min(volume / 10000, 1); // 거래량 10000 이상이면 최대
    const tradeFactor = Math.min(tradeCount / 50, 1); // 거래 50회 이상이면 최대
    const activityFactor = Math.max(volumeFactor, tradeFactor);

    const baseVolatility = minVolatility + (maxVolatility - minVolatility) * activityFactor;
    const dynamicVolatility = Math.min(baseVolatility, maxVolatility);

    // 랜덤 가격 변동 (-volatility% ~ +volatility%)
    // 거래가 없으면 작은 변동, 거래가 있으면 큰 변동
    const priceChange = (Math.random() * 2 - 1) * dynamicVolatility;
    const newPrice = Math.max(currentPrice * (1 + priceChange), currentPrice * 0.5); // 최대 50% 하락 방지

    // 24시간 전 가격 조회 (캔들스틱 데이터에서)
    const candles24h = await query(
      `SELECT close_price FROM candles_1h
       WHERE stock_id = ? AND open_time <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY open_time DESC LIMIT 1`,
      [stock.id]
    );

    // 24시간 전 가격이 없으면 initial_price 사용
    const price24hAgo = candles24h.length > 0
      ? parseFloat(candles24h[0].close_price || stock.initial_price)
      : parseFloat(stock.initial_price || currentPrice);

    // 24시간 변동률 계산 (%)
    const priceChange24h = price24hAgo > 0
      ? ((newPrice - price24hAgo) / price24hAgo) * 100
      : 0;

    // 24시간 거래량 계산 (최근 24시간 동안의 총 거래량)
    const volume24hResult = await query(
      `SELECT COALESCE(SUM(quantity * price), 0) as total_volume
       FROM trades
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [stock.id]
    );
    const volume24h = parseFloat(volume24hResult[0]?.total_volume || '0');

    // 가격, 24시간 변동률, 24시간 거래량 업데이트
    await query(
      'UPDATE stocks SET current_price = ?, price_change_24h = ?, volume_24h = ? WHERE id = ?',
      [newPrice, priceChange24h, volume24h, stock.id]
    );

    // 캔들 데이터 저장 (차트에 표시)
    await updateCandleData(stock.id, newPrice, 0);

    // WebSocket으로 가격 업데이트 브로드캐스트 - ACTIVE 상태만
    if (websocketInstance && websocketInstance.broadcastPriceUpdate) {
      const updatedStocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stock.id]);
      if (updatedStocks.length > 0) {
        const updatedStock = updatedStocks[0];
        const priceUpdateData = {
          stock_id: stock.id,
          symbol: updatedStock.symbol,
          name: updatedStock.name,
          current_price: updatedStock.current_price,
          price_change_24h: updatedStock.price_change_24h,
          volume_24h: updatedStock.volume_24h,
          market_cap: updatedStock.market_cap,
          updated_at: new Date().toISOString(),
        };
        websocketInstance.broadcastPriceUpdate(stock.id, priceUpdateData);
      }
    }

    // AI 로그 기록
    await query(
      `INSERT INTO ai_trade_logs (id, stock_id, action, price_before, price_after, reason, volatility_factor)
       VALUES (?, ?, 'ADJUST_PRICE', ?, ?, ?, ?)`,
      [
        uuidv4(),
        stock.id,
        currentPrice,
        newPrice,
        `실시간 시장 변동성 조정 (거래량: ${volume}, 변동성: ${(dynamicVolatility * 100).toFixed(2)}%)`,
        dynamicVolatility,
      ]
    );

    console.log(`📊 [실시간] ${stock.symbol}: ${currentPrice.toFixed(2)} → ${newPrice.toFixed(2)} (${(priceChange * 100).toFixed(2)}%, 변동성: ${(dynamicVolatility * 100).toFixed(2)}%)`);
  }

  // 가격 조정 (변동성 추가) - 0.01% ~ 5% 범위
  async adjustPrices() {
    try {
      const stocks = await query('SELECT * FROM stocks WHERE status = "ACTIVE"');

      for (const stock of stocks) {
        await this.adjustSingleStockPrice(stock);
      }
    } catch (error) {
      console.error('AI 가격 조정 오류:', error);
    }
  }

  // 특정 주식 유동성 공급 (실시간)
  async provideLiquidityForStock(stockId: string) {
    try {
      const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stockId]);
      if (stocks.length === 0) return;

      const stock = stocks[0];
      await this.provideLiquidityForSingleStock(stock);
    } catch (error) {
      console.error(`유동성 공급 오류 (${stockId}):`, error);
    }
  }

  // 단일 주식 유동성 공급
  private async provideLiquidityForSingleStock(stock: any) {
    // current_price를 숫자로 변환
    const currentPrice = typeof stock.current_price === 'string'
      ? parseFloat(stock.current_price)
      : (stock.current_price || 0);

    if (isNaN(currentPrice) || currentPrice <= 0) {
      return;
    }

    // 기존 AI 주문 확인 (너무 많으면 생성 안 함)
    const existingOrders = await query(
      `SELECT COUNT(*) as count FROM orders
       WHERE stock_id = ? AND is_admin_order = TRUE AND status IN ('PENDING', 'PARTIAL')`,
      [stock.id]
    );
    const orderCount = existingOrders[0]?.count || 0;

    // 이미 충분한 주문이 있으면 스킵 (최대 10개)
    if (orderCount >= 10) {
      return;
    }

    // AI 매수 주문 생성 (시장 안정화)
    // 가격 범위를 넓혀서 더 많은 거래 기회 제공
    const buyPrice = currentPrice * (0.95 + Math.random() * 0.03); // 현재가 -5% ~ -2%
    const buyQuantity = Math.random() * 2000 + 1000; // 1000 ~ 3000

    // AI 매도 주문 생성
    const sellPrice = currentPrice * (1.02 + Math.random() * 0.03); // 현재가 +2% ~ +5%
    const sellQuantity = Math.random() * 2000 + 1000; // 1000 ~ 3000

    // AI 지갑 생성 (없으면)
    let aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
    if (!aiWallet) {
      const aiWalletId = uuidv4();
      await query(
        `INSERT INTO user_wallets (id, wallet_address, minecraft_username, minecraft_uuid, questionnaire_completed)
         VALUES (?, ?, 'AI_BOT', 'AI_BOT_UUID', TRUE)`,
        [aiWalletId, 'AI_BOT_WALLET_' + aiWalletId.substring(0, 18)]
      );
      aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
    }

    // 매수 주문
    await query(
      `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, status, is_admin_order)
       VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
      [uuidv4(), aiWallet.id, stock.id, buyPrice, buyQuantity]
    );

    // 매도 주문
    await query(
      `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, status, is_admin_order)
       VALUES (?, ?, ?, 'SELL', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
      [uuidv4(), aiWallet.id, stock.id, sellPrice, sellQuantity]
    );

    console.log(`💧 [실시간] ${stock.symbol} 유동성 공급: 매수 ${buyQuantity.toFixed(2)}@${buyPrice.toFixed(2)}, 매도 ${sellQuantity.toFixed(2)}@${sellPrice.toFixed(2)}`);
  }

  // 유동성 공급 (거래 활성화)
  async provideLiquidity() {
    try {
      const stocks = await query('SELECT * FROM stocks WHERE status = "ACTIVE"');

      for (const stock of stocks) {
        // current_price를 숫자로 변환
        const currentPrice = typeof stock.current_price === 'string'
          ? parseFloat(stock.current_price)
          : (stock.current_price || 0);

        if (isNaN(currentPrice) || currentPrice <= 0) {
          console.warn(`⚠️ ${stock.symbol}: 유효하지 않은 가격 (${stock.current_price}), 건너뜀`);
          continue;
        }

        // AI 매수 주문 생성 (시장 안정화)
        // 가격 범위를 넓혀서 더 많은 거래 기회 제공
        const buyPrice = currentPrice * (0.95 + Math.random() * 0.03); // 현재가 -5% ~ -2%
        const buyQuantity = Math.random() * 2000 + 1000; // 1000 ~ 3000

        // AI 매도 주문 생성
        const sellPrice = currentPrice * (1.02 + Math.random() * 0.03); // 현재가 +2% ~ +5%
        const sellQuantity = Math.random() * 2000 + 1000; // 1000 ~ 3000

        // AI 지갑 생성 (없으면)
        let aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
        if (!aiWallet) {
          const aiWalletId = uuidv4();
          await query(
            `INSERT INTO user_wallets (id, wallet_address, minecraft_username, minecraft_uuid, questionnaire_completed)
             VALUES (?, ?, 'AI_BOT', 'AI_BOT_UUID', TRUE)`,
            [aiWalletId, 'AI_BOT_WALLET_' + aiWalletId.substring(0, 18)]
          );
          aiWallet = (await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"'))[0];
        }

        // 매수 주문
        await query(
          `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, status, is_admin_order)
           VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
          [uuidv4(), aiWallet.id, stock.id, buyPrice, buyQuantity]
        );

        // 매도 주문
        await query(
          `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, status, is_admin_order)
           VALUES (?, ?, ?, 'SELL', 'LIMIT', ?, ?, 'PENDING', TRUE)`,
          [uuidv4(), aiWallet.id, stock.id, sellPrice, sellQuantity]
        );

        console.log(`💧 ${stock.symbol} 유동성 공급: 매수 ${buyQuantity}@${buyPrice}, 매도 ${sellQuantity}@${sellPrice}`);
      }
    } catch (error) {
      console.error('유동성 공급 오류:', error);
    }
  }

  // ADMIN 가격 수동 조정
  async adminAdjustPrice(stockId: string, newPrice: number, reason: string) {
    const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stockId]);

    if (stocks.length === 0) {
      throw new Error('주식을 찾을 수 없거나 거래가 중지되었습니다');
    }

    const stock = stocks[0];

    // current_price를 숫자로 변환
    const oldPrice = typeof stock.current_price === 'string'
      ? parseFloat(stock.current_price)
      : (stock.current_price || 0);

    if (isNaN(oldPrice)) {
      throw new Error('유효하지 않은 현재 가격입니다');
    }

    await query('UPDATE stocks SET current_price = ? WHERE id = ?', [newPrice, stockId]);

    await query(
      `INSERT INTO ai_trade_logs (id, stock_id, action, price_before, price_after, reason)
       VALUES (?, ?, 'ADJUST_PRICE', ?, ?, ?)`,
      [uuidv4(), stockId, oldPrice, newPrice, `ADMIN 수동 조정: ${reason}`]
    );

    return { oldPrice, newPrice };
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️  AI Trading Bot stopped');
  }
}

// AI 변동성 범위: 0.01% ~ 5% (기본값 0.05 = 5%)
export default new AITradingBot(parseFloat(process.env.AI_VOLATILITY_FACTOR || '0.05'));
