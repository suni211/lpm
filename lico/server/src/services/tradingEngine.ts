import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

// 주문 매칭 엔진
export class TradingEngine {
  // 매수 주문 처리
  async processBuyOrder(
    walletId: string,
    coinId: string,
    orderMethod: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number
  ) {
    const orderId = uuidv4();

    // 시장가 매수: 현재 최저가 매도 주문과 매칭
    if (orderMethod === 'MARKET') {
      return await this.matchMarketBuyOrder(walletId, coinId, quantity);
    }

    // 지정가 매수: 주문 생성 후 매칭 시도
    await query(
      `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, price, quantity, status)
       VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, 'PENDING')`,
      [orderId, walletId, coinId, price, quantity]
    );

    // 즉시 매칭 가능한 매도 주문 찾기
    await this.matchLimitBuyOrder(orderId, coinId, price!);

    return orderId;
  }

  // 매도 주문 처리
  async processSellOrder(
    walletId: string,
    coinId: string,
    orderMethod: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number
  ) {
    // 코인 잔액 확인
    const balances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, coinId]
    );

    if (balances.length === 0 || balances[0].available_amount < quantity) {
      throw new Error('보유 코인이 부족합니다');
    }

    // 시장가 매도: 현재 최고가 매수 주문과 매칭
    if (orderMethod === 'MARKET') {
      return await this.matchMarketSellOrder(walletId, coinId, quantity);
    }

    // 지정가 매도: 코인 잠금
    if (!price) {
      throw new Error('지정가 주문은 가격이 필요합니다');
    }

    const totalAmount = price * quantity;
    const fee = Math.floor(totalAmount * 0.05);

    // 코인 잠금 (주문 체결될 때까지)
    await query(
      'UPDATE user_coin_balances SET available_amount = available_amount - ?, locked_amount = locked_amount + ? WHERE wallet_id = ? AND coin_id = ?',
      [quantity, quantity, walletId, coinId]
    );

    const orderId = uuidv4();

    // 지정가 매도: 주문 생성 후 매칭 시도
    await query(
      `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, price, quantity, fee, status)
       VALUES (?, ?, ?, 'SELL', 'LIMIT', ?, ?, ?, 'PENDING')`,
      [orderId, walletId, coinId, price, quantity, fee]
    );

    // 즉시 매칭 가능한 매수 주문 찾기
    await this.matchLimitSellOrder(orderId, coinId, price);

    return orderId;
  }

  // 시장가 매수 매칭
  private async matchMarketBuyOrder(walletId: string, coinId: string, quantity: number) {
    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [walletId]);
    if (wallets.length === 0) {
      throw new Error('지갑을 찾을 수 없습니다');
    }
    const wallet = wallets[0];

    // 최저가 매도 주문들 조회
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
       ORDER BY price ASC, created_at ASC`,
      [coinId]
    );

    let remainingQty = quantity;
    let totalCost = 0;

    for (const sellOrder of sellOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, sellOrder.remaining_quantity);
      const matchCost = sellOrder.price * matchQty;
      const fee = Math.floor(matchCost * 0.05);
      const totalRequired = matchCost + fee;

      // 잔액 확인
      if (wallet.gold_balance < totalCost + totalRequired) {
        break; // 잔액 부족
      }

      await this.executeTrade(walletId, sellOrder.wallet_id, coinId, sellOrder.price, matchQty, null, sellOrder.id);
      totalCost += totalRequired;
      remainingQty -= matchQty;
    }

    // 잔액 차감 (이미 executeTrade에서 처리되지만, 수수료를 위해 추가 차감)
    if (totalCost > 0) {
      await query('UPDATE user_wallets SET gold_balance = gold_balance - ? WHERE id = ?', [
        totalCost,
        walletId,
      ]);
    }

    return { matched: quantity - remainingQty, remaining: remainingQty };
  }

  // 시장가 매도 매칭
  private async matchMarketSellOrder(walletId: string, coinId: string, quantity: number) {
    // 코인 잔액 확인
    const balances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, coinId]
    );

    if (balances.length === 0 || balances[0].available_amount < quantity) {
      throw new Error('보유 코인이 부족합니다');
    }

    // 코인 잠금
    await query(
      'UPDATE user_coin_balances SET available_amount = available_amount - ?, locked_amount = locked_amount + ? WHERE wallet_id = ? AND coin_id = ?',
      [quantity, quantity, walletId, coinId]
    );

    // 최고가 매수 주문들 조회
    const buyOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
       ORDER BY price DESC, created_at ASC`,
      [coinId]
    );

    let remainingQty = quantity;

    for (const buyOrder of buyOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, buyOrder.remaining_quantity);
      await this.executeTrade(buyOrder.wallet_id, walletId, coinId, buyOrder.price, matchQty, buyOrder.id, null);

      remainingQty -= matchQty;
    }

    // 남은 수량 잠금 해제
    if (remainingQty > 0) {
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND coin_id = ?',
        [remainingQty, remainingQty, walletId, coinId]
      );
    }

    return { matched: quantity - remainingQty, remaining: remainingQty };
  }

  // 지정가 매수 매칭
  private async matchLimitBuyOrder(buyOrderId: string, coinId: string, buyPrice: number) {
    // 지정가 이하의 매도 주문 찾기
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'SELL' AND price <= ? AND status IN ('PENDING', 'PARTIAL')
       ORDER BY price ASC, created_at ASC`,
      [coinId, buyPrice]
    );

    const buyOrder = (await query('SELECT * FROM orders WHERE id = ?', [buyOrderId]))[0];
    let remainingQty = buyOrder.remaining_quantity;

    for (const sellOrder of sellOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, sellOrder.remaining_quantity);
      await this.executeTrade(buyOrder.wallet_id, sellOrder.wallet_id, coinId, sellOrder.price, matchQty, buyOrderId, sellOrder.id);

      remainingQty -= matchQty;
    }
  }

  // 지정가 매도 매칭
  private async matchLimitSellOrder(sellOrderId: string, coinId: string, sellPrice: number) {
    // 지정가 이상의 매수 주문 찾기
    const buyOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'BUY' AND price >= ? AND status IN ('PENDING', 'PARTIAL')
       ORDER BY price DESC, created_at ASC`,
      [coinId, sellPrice]
    );

    const sellOrder = (await query('SELECT * FROM orders WHERE id = ?', [sellOrderId]))[0];
    let remainingQty = sellOrder.remaining_quantity;

    for (const buyOrder of buyOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, buyOrder.remaining_quantity);
      await this.executeTrade(buyOrder.wallet_id, sellOrder.wallet_id, coinId, buyOrder.price, matchQty, buyOrder.id, sellOrderId);

      remainingQty -= matchQty;
    }
  }

  // 거래 체결 실행
  private async executeTrade(
    buyerWalletId: string,
    sellerWalletId: string,
    coinId: string,
    price: number,
    quantity: number,
    buyOrderId: string | null,
    sellOrderId: string | null
  ) {
    const tradeId = uuidv4();
    const totalAmount = price * quantity;
    const buyFee = Math.floor(totalAmount * 0.05);
    const sellFee = Math.floor(totalAmount * 0.05);

    // 거래 기록 생성
    await query(
      `INSERT INTO trades (id, coin_id, buy_order_id, sell_order_id, buyer_wallet_id, seller_wallet_id, price, quantity, buy_fee, sell_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tradeId, coinId, buyOrderId, sellOrderId, buyerWalletId, sellerWalletId, price, quantity, buyFee, sellFee]
    );

    // 매수자: Gold 차감 (수수료 포함), 코인 증가
    await this.updateWalletBalance(buyerWalletId, -(totalAmount + buyFee));
    await this.updateCoinBalance(buyerWalletId, coinId, quantity);

    // 매도자: Gold 증가 (수수료 차감), 코인 차감
    await this.updateWalletBalance(sellerWalletId, totalAmount - sellFee);
    await this.updateCoinBalance(sellerWalletId, coinId, -quantity);

    // 주문 상태 업데이트
    if (buyOrderId) await this.updateOrderStatus(buyOrderId, quantity);
    if (sellOrderId) await this.updateOrderStatus(sellOrderId, quantity);

    // 코인 현재가 업데이트
    await query('UPDATE coins SET current_price = ? WHERE id = ?', [price, coinId]);

    // 캔들스틱 데이터 업데이트
    await this.updateCandlestick(coinId, price, quantity);

    return tradeId;
  }

  // 지갑 잔액 업데이트
  private async updateWalletBalance(walletId: string, amount: number) {
    await query(
      'UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE id = ?',
      [amount, walletId]
    );
  }

  // 코인 잔액 업데이트
  private async updateCoinBalance(walletId: string, coinId: string, amount: number) {
    const existing = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, coinId]
    );

    if (existing.length > 0) {
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
        [amount, walletId, coinId]
      );
    } else {
      await query(
        'INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), walletId, coinId, amount]
      );
    }
  }

  // 주문 상태 업데이트
  private async updateOrderStatus(orderId: string, filledQty: number) {
    await query(
      'UPDATE orders SET filled_quantity = filled_quantity + ? WHERE id = ?',
      [filledQty, orderId]
    );

    const order = (await query('SELECT * FROM orders WHERE id = ?', [orderId]))[0];

    if (order.filled_quantity >= order.quantity) {
      await query('UPDATE orders SET status = "FILLED" WHERE id = ?', [orderId]);
    } else if (order.filled_quantity > 0) {
      await query('UPDATE orders SET status = "PARTIAL" WHERE id = ?', [orderId]);
    }
  }

  // 캔들스틱 데이터 업데이트 (1분봉)
  private async updateCandlestick(coinId: string, price: number, volume: number) {
    const now = new Date();
    const openTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
    const closeTime = new Date(openTime.getTime() + 60000);

    const existing = await query(
      'SELECT * FROM candles_1m WHERE coin_id = ? AND open_time = ?',
      [coinId, openTime]
    );

    if (existing.length > 0) {
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
      await query(
        `INSERT INTO candles_1m (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), coinId, openTime, closeTime, price, price, price, price, volume]
      );
    }
  }
}

export default new TradingEngine();
