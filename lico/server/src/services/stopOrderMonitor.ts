import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import tradingEngine from './tradingEngine';

/**
 * 스탑 주문 모니터링 서비스
 * - 스탑 로스 (Stop Loss): 손실 제한
 * - 테이크 프로핏 (Take Profit): 이익 실현
 * - 트레일링 스탑 (Trailing Stop): 가격 추종 손절
 */
class StopOrderMonitor {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  // 모니터링 시작
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1초마다 스탑 주문 체크
    this.interval = setInterval(async () => {
      await this.checkStopOrders();
    }, 1000);

    console.log('✅ Stop Order Monitor started');
  }

  // 모니터링 중지
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('⏹️  Stop Order Monitor stopped');
  }

  // 스탑 주문 체크
  private async checkStopOrders() {
    try {
      // 활성화된 스탑 주문 조회
      const stopOrders = await query(
        `SELECT o.*, c.current_price, c.symbol
         FROM orders o
         JOIN coins c ON o.coin_id = c.id
         WHERE o.is_stop_order = TRUE
         AND o.stop_triggered = FALSE
         AND o.status = 'PENDING'`,
        []
      );

      for (const order of stopOrders) {
        await this.processStopOrder(order);
      }
    } catch (error) {
      console.error('스탑 주문 체크 오류:', error);
    }
  }

  // 개별 스탑 주문 처리
  private async processStopOrder(order: any) {
    const currentPrice = typeof order.current_price === 'string'
      ? parseFloat(order.current_price)
      : (order.current_price || 0);

    const stopPrice = typeof order.stop_price === 'string'
      ? parseFloat(order.stop_price)
      : (order.stop_price || 0);

    const orderPrice = typeof order.price === 'string'
      ? parseFloat(order.price)
      : (order.price || 0);

    let shouldTrigger = false;

    // 스탑 타입별 트리거 조건
    if (order.stop_type === 'STOP_LOSS') {
      // 손절: 현재가가 스탑 가격 이하로 떨어지면 매도
      if (order.order_type === 'SELL' && currentPrice <= stopPrice) {
        shouldTrigger = true;
      }
    } else if (order.stop_type === 'TAKE_PROFIT') {
      // 익절: 현재가가 목표가 이상으로 올라가면 매도
      if (order.order_type === 'SELL' && currentPrice >= stopPrice) {
        shouldTrigger = true;
      }
    } else if (order.stop_type === 'TRAILING_STOP') {
      // 트레일링 스탑
      await this.processTrailingStop(order, currentPrice);
      return;
    }

    if (shouldTrigger) {
      await this.triggerStopOrder(order, currentPrice);
    }
  }

  // 트레일링 스탑 처리
  private async processTrailingStop(order: any, currentPrice: number) {
    const trailingPercent = typeof order.trailing_percent === 'string'
      ? parseFloat(order.trailing_percent)
      : (order.trailing_percent || 0);

    let trailingPrice = typeof order.trailing_price === 'string'
      ? parseFloat(order.trailing_price)
      : (order.trailing_price || 0);

    // 최초 설정: 현재가를 추적 가격으로
    if (!trailingPrice || trailingPrice === 0) {
      trailingPrice = currentPrice;
      await query(
        'UPDATE orders SET trailing_price = ? WHERE id = ?',
        [currentPrice, order.id]
      );
      return;
    }

    // 가격이 상승하면 추적 가격 업데이트
    if (currentPrice > trailingPrice) {
      await query(
        'UPDATE orders SET trailing_price = ? WHERE id = ?',
        [currentPrice, order.id]
      );
      console.log(`📈 트레일링 스탑 업데이트: ${order.symbol} ${trailingPrice.toFixed(2)} → ${currentPrice.toFixed(2)}`);
      return;
    }

    // 가격이 추적 가격에서 설정한 비율만큼 하락하면 트리거
    const dropPercent = ((trailingPrice - currentPrice) / trailingPrice) * 100;
    if (dropPercent >= trailingPercent) {
      await this.triggerStopOrder(order, currentPrice);
    }
  }

  // 스탑 주문 트리거 (실제 주문 활성화)
  private async triggerStopOrder(order: any, triggerPrice: number) {
    try {
      console.log(`🔔 스탑 주문 트리거: ${order.symbol} ${order.stop_type} @ ${triggerPrice.toFixed(2)}`);

      // 1. 스탑 주문 상태 변경
      await query(
        'UPDATE orders SET stop_triggered = TRUE WHERE id = ?',
        [order.id]
      );

      // 2. 스탑 로그 기록
      await query(
        `INSERT INTO stop_order_logs (id, order_id, coin_id, trigger_price, stop_price, stop_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), order.id, order.coin_id, triggerPrice, order.stop_price, order.stop_type]
      );

      // 3. 시장가 주문으로 즉시 매도 (스탑은 항상 매도)
      if (order.order_type === 'SELL') {
        const quantity = typeof order.quantity === 'string'
          ? parseFloat(order.quantity)
          : (order.quantity || 0);

        // 기존 스탑 주문 취소
        await query('UPDATE orders SET status = "CANCELLED" WHERE id = ?', [order.id]);

        // 시장가 매도 주문 생성 (즉시 체결)
        try {
          await tradingEngine.processSellOrder(
            order.wallet_id,
            order.coin_id,
            'MARKET',
            quantity
          );

          console.log(`✅ 스탑 주문 체결: ${order.symbol} ${quantity} 매도 @ ${triggerPrice.toFixed(2)}`);
        } catch (error: any) {
          console.error('스탑 주문 체결 실패:', error.message);
          // 실패 시 주문 상태 복구
          await query('UPDATE orders SET status = "PENDING", stop_triggered = FALSE WHERE id = ?', [order.id]);
        }
      }
    } catch (error) {
      console.error('스탑 주문 트리거 오류:', error);
    }
  }

  // 스탑 주문 생성 헬퍼
  async createStopOrder(
    walletId: string,
    coinId: string,
    stopType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP',
    quantity: number,
    stopPrice?: number,
    trailingPercent?: number
  ) {
    const orderId = uuidv4();

    // 트레일링 스탑은 비율만 필요
    if (stopType === 'TRAILING_STOP') {
      if (!trailingPercent) {
        throw new Error('트레일링 스탑은 비율이 필요합니다');
      }

      await query(
        `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, quantity, is_stop_order, stop_type, trailing_percent, status)
         VALUES (?, ?, ?, 'SELL', 'MARKET', ?, TRUE, ?, ?, 'PENDING')`,
        [orderId, walletId, coinId, quantity, stopType, trailingPercent]
      );
    } else {
      // 스탑 로스 / 테이크 프로핏
      if (!stopPrice) {
        throw new Error('스탑 가격이 필요합니다');
      }

      await query(
        `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, quantity, stop_price, is_stop_order, stop_type, status)
         VALUES (?, ?, ?, 'SELL', 'MARKET', ?, ?, TRUE, ?, 'PENDING')`,
        [orderId, walletId, coinId, quantity, stopPrice, stopType]
      );
    }

    console.log(`📝 스탑 주문 생성: ${stopType} ${quantity} @ ${stopPrice || trailingPercent + '%'}`);
    return orderId;
  }
}

export default new StopOrderMonitor();
