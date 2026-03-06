import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import aiTradingBot from './aiTradingBot';
import { updateCandleData } from '../utils/candleUtils';

// WebSocket 인스턴스를 가져오기 위한 타입
let websocketInstance: any = null;

export function setWebSocketInstance(ws: any) {
  websocketInstance = ws;
}

// 주문 매칭 엔진
export class TradingEngine {
  // 가격 제한 조회 (상한가/하한가)
  async getPriceLimit(stockId: string): Promise<{ lower: number; upper: number; prevClose: number }> {
    // 주식 정보 조회 (exchange_type, initial_price)
    const stocks = await query('SELECT exchange_type, initial_price FROM stocks WHERE id = ?', [stockId]);
    if (stocks.length === 0) throw new Error('주식을 찾을 수 없습니다');
    const stock = stocks[0];

    const exchangeType = stock.exchange_type || 'CK';
    const limitPercent = exchangeType === 'LK' ? 0.5 : 0.2;

    // 전일 종가 조회 (candles_1d에서 어제 이전 가장 최근 종가)
    const prevCandles = await query(
      `SELECT close_price FROM candles_1d
       WHERE stock_id = ? AND open_time < CURDATE()
       ORDER BY open_time DESC LIMIT 1`,
      [stockId]
    );

    const prevClose = prevCandles.length > 0
      ? parseFloat(prevCandles[0].close_price)
      : parseFloat(stock.initial_price);

    const lower = Math.max(prevClose * (1 - limitPercent), 0.01);
    const upper = prevClose * (1 + limitPercent);

    return { lower: parseFloat(lower.toFixed(3)), upper: parseFloat(upper.toFixed(3)), prevClose };
  }

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

    // 주식 정보 조회
    const stocks = await query('SELECT * FROM stocks WHERE id = ?', [coinId]);
    if (stocks.length === 0) {
      throw new Error('주식을 찾을 수 없습니다');
    }
    const stock = stocks[0];

    const totalAmount = price! * quantity;
    const fee = Math.floor(totalAmount * 0.05);
    const totalRequired = totalAmount + fee;

    // Gold 잔액 확인
    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [walletId]);
    if (wallets.length === 0) {
      throw new Error('지갑을 찾을 수 없습니다');
    }

    const goldBalance = typeof wallets[0].krw_balance === 'string'
      ? parseFloat(wallets[0].krw_balance)
      : (wallets[0].krw_balance || 0);

    if (goldBalance < totalRequired) {
      throw new Error(`Gold 잔액이 부족합니다 (필요: ${totalRequired}, 보유: ${goldBalance})`);
    }

    // Gold 잠금 (차감)
    await query('UPDATE user_wallets SET krw_balance = krw_balance - ? WHERE id = ?', [
      totalRequired,
      walletId,
    ]);

    // 지정가 매수: 주문 생성 후 매칭 시도
    await query(
      `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, fee, status)
       VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, ?, 'PENDING')`,
      [orderId, walletId, coinId, price, quantity, fee]
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
    // 주식 잔액 확인
    const balances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [walletId, coinId]
    );

    if (balances.length === 0) {
      throw new Error('보유 주식이 없습니다');
    }

    // available_amount를 숫자로 변환하여 비교
    const availableAmount = typeof balances[0].available_amount === 'string'
      ? parseFloat(balances[0].available_amount)
      : (balances[0].available_amount || 0);

    console.log(`매도 잔액 체크: 보유=${availableAmount.toFixed(8)}, 판매 시도=${quantity}`);

    if (availableAmount < quantity) {
      throw new Error(`보유 주식이 부족합니다 (보유: ${availableAmount.toFixed(8)}, 필요: ${quantity})`);
    }

    // 시장가 매도: 현재 최고가 매수 주문과 매칭
    if (orderMethod === 'MARKET') {
      return await this.matchMarketSellOrder(walletId, coinId, quantity);
    }

    // 지정가 매도: 주식 잠금
    if (!price) {
      throw new Error('지정가 주문은 가격이 필요합니다');
    }

    const totalAmount = price * quantity;
    const fee = Math.floor(totalAmount * 0.05);

    // 주식 잠금 (주문 체결될 때까지) - 음수 방지
    await query(
      `UPDATE user_stock_balances
       SET available_amount = available_amount - ?,
           locked_amount = locked_amount + ?
       WHERE wallet_id = ? AND stock_id = ? AND available_amount >= ?`,
      [quantity, quantity, walletId, coinId, quantity]
    );

    // 잠금 성공 여부 확인
    const lockedBalances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [walletId, coinId]
    );
    const newAvailable = typeof lockedBalances[0].available_amount === 'string'
      ? parseFloat(lockedBalances[0].available_amount)
      : (lockedBalances[0].available_amount || 0);

    if (newAvailable < 0) {
      // 롤백
      await query(
        'UPDATE user_stock_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND stock_id = ?',
        [quantity, quantity, walletId, coinId]
      );
      throw new Error('잔액 잠금 실패: 동시성 문제 발생');
    }

    const orderId = uuidv4();

    // 지정가 매도: 주문 생성 후 매칭 시도
    await query(
      `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, fee, status)
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

    // 주식 정보 조회 (현재가 확인) - ACTIVE 상태만
    const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [coinId]);
    if (stocks.length === 0) {
      throw new Error('주식을 찾을 수 없거나 거래가 중지되었습니다');
    }
    const stock = stocks[0];
    const currentPrice = typeof stock.current_price === 'string'
      ? parseFloat(stock.current_price)
      : (stock.current_price || 0);

    // 최저가 매도 주문들 조회 (유저 매도 주문, 자기 자신 제외)
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE stock_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
       AND is_admin_order = FALSE
       AND wallet_id != ?
       ORDER BY price ASC, created_at ASC`,
      [coinId, walletId]
    );

    let remainingQty = quantity;
    let totalCost = 0;

    // 1. 유저 매도 주문과 매칭
    const walletBalance = typeof wallet.krw_balance === 'string' 
      ? parseFloat(wallet.krw_balance) 
      : (wallet.krw_balance || 0);

    for (const sellOrder of sellOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, parseFloat(sellOrder.remaining_quantity || '0'));
      const sellPrice = parseFloat(sellOrder.price || '0');
      const matchCost = sellPrice * matchQty;
      const fee = Math.floor(matchCost * 0.05);
      const totalRequired = matchCost + fee;

      // 잔액 확인 (이미 사용한 금액 포함)
      if (walletBalance < totalCost + totalRequired) {
        break; // 잔액 부족
      }

      // executeTrade에서 잔액 차감 처리
      await this.executeTrade(walletId, sellOrder.wallet_id, coinId, sellPrice, matchQty, null, sellOrder.id);
      totalCost += totalRequired;
      remainingQty -= matchQty;
    }

    // 2. 남은 수량이 있으면 유통량 기준으로 구매 가능 여부 확인
    if (remainingQty > 0) {
      // 주식 유통량 확인
      const stockCirculatingSupply = typeof stock.circulating_supply === 'string'
        ? parseFloat(stock.circulating_supply)
        : (stock.circulating_supply || 0);

      // 현재 유저들이 보유한 총량 계산 (AI 봇 제외)
      const userHoldings = await query(
        `SELECT COALESCE(SUM(ucb.total_amount), 0) as total_held
         FROM user_stock_balances ucb
         JOIN user_wallets uw ON ucb.wallet_id = uw.id
         WHERE ucb.stock_id = ? AND uw.minecraft_username != 'AI_BOT'`,
        [coinId]
      );

      const totalHeld = parseFloat(userHoldings[0]?.total_held || '0');
      const availableSupply = stockCirculatingSupply - totalHeld; // 유통량에서 유저 보유량 제외

      // 유통량 기준으로 구매 가능한 양 계산
      const purchasableQty = Math.max(0, availableSupply);

      if (purchasableQty < remainingQty) {
        // 유통량 부족 - 예약 주문 생성 (누군가 팔 때까지 대기)
        const orderId = uuidv4();
        const totalAmount = currentPrice * remainingQty;
        const fee = Math.floor(totalAmount * 0.05);
        const totalRequired = totalAmount + fee;

        // Gold 잔액 확인 및 차감
        const walletBalanceCheck = typeof wallet.krw_balance === 'string'
          ? parseFloat(wallet.krw_balance)
          : (wallet.krw_balance || 0);

        if (walletBalanceCheck < totalCost + totalRequired) {
          throw new Error('잔액이 부족합니다');
        }

        // 예약 주문 생성
        await query(
          `INSERT INTO orders (id, wallet_id, stock_id, order_type, order_method, price, quantity, fee, status, is_admin_order)
           VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, ?, 'PENDING', FALSE)`,
          [orderId, walletId, coinId, currentPrice, remainingQty, fee]
        );

        // Gold 잠금
        await query('UPDATE user_wallets SET krw_balance = krw_balance - ? WHERE id = ?', [
          totalRequired,
          walletId,
        ]);

        return { matched: quantity - remainingQty, remaining: remainingQty };
      }

      // AI 봇 지갑 조회 (유통량이 있으면 AI 봇에서 공급)
      const aiWallets = await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"');
      if (aiWallets.length === 0) {
        throw new Error('AI 봇 지갑을 찾을 수 없습니다');
      }
      const aiWallet = aiWallets[0];

      // AI 봇의 주식 잔액 확인
      const aiBalances = await query(
        'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
        [aiWallet.id, coinId]
      );

      // 구매 가능한 양만큼만 판매 (유통량 기준, AI 봇 재고와 무관)
      const sellableQty = Math.min(remainingQty, purchasableQty);
      
      if (sellableQty <= 0) {
        throw new Error('유통량이 부족합니다');
      }

      // AI 봇 재고가 부족하면 유통량만큼 자동 보충
      const aiAvailableAmount = aiBalances.length > 0 
        ? parseFloat(aiBalances[0].available_amount || '0')
        : 0;

      if (aiAvailableAmount < sellableQty) {
        const neededAmount = sellableQty - aiAvailableAmount;
        if (aiBalances.length > 0) {
          await query(
            'UPDATE user_stock_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND stock_id = ?',
            [neededAmount, aiWallet.id, coinId]
          );
        } else {
          await query(
            `INSERT INTO user_stock_balances (id, wallet_id, stock_id, available_amount, average_buy_price)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), aiWallet.id, coinId, neededAmount, currentPrice]
          );
        }
      }

      const matchCost = currentPrice * sellableQty;
      const fee = Math.floor(matchCost * 0.05);
      const totalRequired = matchCost + fee;

      // 잔액 확인 (이미 사용한 금액 포함)
      const walletBalance = typeof wallet.krw_balance === 'string' 
        ? parseFloat(wallet.krw_balance) 
        : (wallet.krw_balance || 0);

      if (walletBalance < totalCost + totalRequired) {
        throw new Error('잔액이 부족합니다');
      }

      // AI 봇과 직접 거래 체결 (executeTrade에서 잔액 차감 처리)
      console.log(`매수 체결: ${sellableQty}개, 가격: ${currentPrice}, 총액: ${totalRequired}`);
      await this.executeTrade(walletId, aiWallet.id, coinId, currentPrice, sellableQty, null, null);
      totalCost += totalRequired;
      remainingQty -= sellableQty;
    }

    // executeTrade에서 이미 잔액 차감을 처리하므로 추가 차감 불필요

    return { matched: quantity - remainingQty, remaining: remainingQty };
  }

  // 시장가 매도 매칭
  private async matchMarketSellOrder(walletId: string, coinId: string, quantity: number) {
    // 주식 잔액 확인
    const balances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [walletId, coinId]
    );

    if (balances.length === 0) {
      throw new Error('보유 주식이 없습니다');
    }

    // available_amount를 숫자로 변환하여 비교
    const availableAmount = typeof balances[0].available_amount === 'string'
      ? parseFloat(balances[0].available_amount)
      : (balances[0].available_amount || 0);

    console.log(`시장가 매도 잔액 체크: 보유=${availableAmount.toFixed(8)}, 판매 시도=${quantity}`);

    if (availableAmount < quantity) {
      throw new Error(`보유 주식이 부족합니다 (보유: ${availableAmount.toFixed(8)}, 필요: ${quantity})`);
    }

    // 주식 잠금 (음수 방지)
    await query(
      `UPDATE user_stock_balances
       SET available_amount = available_amount - ?,
           locked_amount = locked_amount + ?
       WHERE wallet_id = ? AND stock_id = ? AND available_amount >= ?`,
      [quantity, quantity, walletId, coinId, quantity]
    );

    // 잠금 성공 여부 확인
    const lockedBalances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [walletId, coinId]
    );
    const newAvailable = typeof lockedBalances[0].available_amount === 'string'
      ? parseFloat(lockedBalances[0].available_amount)
      : (lockedBalances[0].available_amount || 0);

    if (newAvailable < 0) {
      // 롤백
      await query(
        'UPDATE user_stock_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND stock_id = ?',
        [quantity, quantity, walletId, coinId]
      );
      throw new Error('잔액 잠금 실패: 동시성 문제 발생');
    }

    // 최고가 매수 주문들 조회 (자기 자신 제외)
    const buyOrders = await query(
      `SELECT * FROM orders
       WHERE stock_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
       AND wallet_id != ?
       ORDER BY price DESC, created_at ASC`,
      [coinId, walletId]
    );

    let remainingQty = quantity;

    for (const buyOrder of buyOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, buyOrder.remaining_quantity);
      // 시장가 매도는 sellOrderId를 'MARKET_SELL'로 표시하여 locked에서 차감하도록 함
      await this.executeTrade(buyOrder.wallet_id, walletId, coinId, buyOrder.price, matchQty, buyOrder.id, 'MARKET_SELL');

      remainingQty -= matchQty;
    }

    // 남은 수량 잠금 해제
    if (remainingQty > 0) {
      await query(
        'UPDATE user_stock_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND stock_id = ?',
        [remainingQty, remainingQty, walletId, coinId]
      );
    }

    return { matched: quantity - remainingQty, remaining: remainingQty };
  }

  // 지정가 매수 매칭
  private async matchLimitBuyOrder(buyOrderId: string, coinId: string, buyPrice: number) {
    // 주문 정보 조회
    const buyOrders = await query('SELECT * FROM orders WHERE id = ?', [buyOrderId]);
    if (buyOrders.length === 0) return;
    const buyOrder = buyOrders[0];
    let remainingQty = buyOrder.remaining_quantity;

    // 지정가 이하의 유저 매도 주문 찾기 (자기 자신 제외)
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE stock_id = ? AND order_type = 'SELL' AND price <= ? AND status IN ('PENDING', 'PARTIAL')
       AND is_admin_order = FALSE
       AND wallet_id != ?
       ORDER BY price ASC, created_at ASC`,
      [coinId, buyPrice, buyOrder.wallet_id]
    );

    // 1. 유저 매도 주문과 매칭
    for (const sellOrder of sellOrders) {
      if (remainingQty <= 0) break;

      const matchQty = Math.min(remainingQty, sellOrder.remaining_quantity);
      await this.executeTrade(buyOrder.wallet_id, sellOrder.wallet_id, coinId, sellOrder.price, matchQty, buyOrderId, sellOrder.id);

      remainingQty -= matchQty;
    }

    // 2. 남은 수량이 있고 지정가가 현재가 이상이면 유통량 기준으로 판매
    if (remainingQty > 0) {
      // 주식 정보 조회 (현재가 및 유통량 확인) - ACTIVE 상태만
      const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [coinId]);
      if (stocks.length > 0) {
        const stock = stocks[0];
        const currentPrice = typeof stock.current_price === 'string'
          ? parseFloat(stock.current_price)
          : (stock.current_price || 0);

        // 지정가가 현재가 이상이면 유통량 기준으로 판매
        if (buyPrice >= currentPrice) {
          // 유통량 확인
          const stockCirculatingSupply = typeof stock.circulating_supply === 'string'
            ? parseFloat(stock.circulating_supply)
            : (stock.circulating_supply || 0);

          // 현재 유저들이 보유한 총량 계산 (AI 봇 제외)
          const userHoldings = await query(
            `SELECT COALESCE(SUM(ucb.total_amount), 0) as total_held
             FROM user_stock_balances ucb
             JOIN user_wallets uw ON ucb.wallet_id = uw.id
             WHERE ucb.stock_id = ? AND uw.minecraft_username != 'AI_BOT'`,
            [coinId]
          );

          const totalHeld = parseFloat(userHoldings[0]?.total_held || '0');
          const availableSupply = stockCirculatingSupply - totalHeld; // 유통량에서 유저 보유량 제외
          const purchasableQty = Math.max(0, availableSupply);

          if (purchasableQty > 0) {
            // AI 봇 지갑 조회
            const aiWallets = await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"');
            if (aiWallets.length > 0) {
              const aiWallet = aiWallets[0];

              // AI 봇의 주식 잔액 확인
              const aiBalances = await query(
                'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
                [aiWallet.id, coinId]
              );

              const aiAvailableAmount = aiBalances.length > 0 
                ? parseFloat(aiBalances[0].available_amount || '0')
                : 0;

              // 구매 가능한 양만큼만 판매 (유통량 기준, AI 봇 재고와 무관)
              const sellableQty = Math.min(remainingQty, purchasableQty);

              if (sellableQty > 0) {
                // AI 봇 재고가 부족하면 유통량만큼 자동 보충
                if (aiAvailableAmount < sellableQty) {
                  const neededAmount = sellableQty - aiAvailableAmount;
                  if (aiBalances.length > 0) {
                    await query(
                      'UPDATE user_stock_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND stock_id = ?',
                      [neededAmount, aiWallet.id, coinId]
                    );
                  } else {
                    await query(
                      `INSERT INTO user_stock_balances (id, wallet_id, stock_id, available_amount, average_buy_price)
                       VALUES (?, ?, ?, ?, ?)`,
                      [uuidv4(), aiWallet.id, coinId, neededAmount, currentPrice]
                    );
                  }
                }

                // AI 봇 재고에서 직접 판매 (현재가로)
                await this.executeTrade(buyOrder.wallet_id, aiWallet.id, coinId, currentPrice, sellableQty, buyOrderId, null);
                remainingQty -= sellableQty;
              }
            }
          }
        }
      }
    }
  }

  // 지정가 매도 매칭
  private async matchLimitSellOrder(sellOrderId: string, coinId: string, sellPrice: number) {
    const sellOrder = (await query('SELECT * FROM orders WHERE id = ?', [sellOrderId]))[0];
    let remainingQty = sellOrder.remaining_quantity;

    // 지정가 이상의 매수 주문 찾기 (자기 자신 제외)
    const buyOrders = await query(
      `SELECT * FROM orders
       WHERE stock_id = ? AND order_type = 'BUY' AND price >= ? AND status IN ('PENDING', 'PARTIAL')
       AND wallet_id != ?
       ORDER BY price DESC, created_at ASC`,
      [coinId, sellPrice, sellOrder.wallet_id]
    );

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

    // 주식 정보 조회
    const stocks = await query('SELECT * FROM stocks WHERE id = ?', [coinId]);
    if (stocks.length === 0) {
      throw new Error('주식을 찾을 수 없습니다');
    }
    const stock = stocks[0];

    // 거래 기록 생성 (buy_order_id, sell_order_id는 NULL 허용)
    // sellOrderId가 'MARKET_SELL' 같은 특수 값이면 NULL로 처리
    const validSellOrderId = (sellOrderId && sellOrderId !== 'MARKET_SELL') ? sellOrderId : null;
    const validBuyOrderId = buyOrderId || null;

    await query(
      `INSERT INTO trades (id, stock_id, buy_order_id, sell_order_id, buyer_wallet_id, seller_wallet_id, price, quantity, buy_fee, sell_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tradeId, coinId, validBuyOrderId, validSellOrderId, buyerWalletId, sellerWalletId, price, quantity, buyFee, sellFee]
    );

    // 모든 거래는 Gold로 결제
    // 매수자: 주식 증가 (Gold는 이미 차감됨)
    await this.updateStockBalance(buyerWalletId, coinId, quantity, price);

    // 매도자: Gold 증가 (수수료 차감)
    await this.updateWalletBalance(sellerWalletId, totalAmount - sellFee);

    // 매도자 주식 차감 - sellOrderId가 있으면 locked에서, 없으면 available에서
    if (sellOrderId) {
      // 매도 주문이 있는 경우: locked_amount에서 차감 (이미 주문 생성 시 잠김)
      await this.updateStockBalanceFromLocked(sellerWalletId, coinId, quantity);
    } else {
      // 즉시 매도 (AI 봇 등): available_amount에서 차감
      await this.updateStockBalance(sellerWalletId, coinId, -quantity);
    }

    // 주문 상태 업데이트
    if (buyOrderId) await this.updateOrderStatus(buyOrderId, quantity);
    if (sellOrderId) await this.updateOrderStatus(sellOrderId, quantity);

    // 24시간 전 가격 조회 (캔들스틱 데이터에서)
    const candles24h = await query(
      `SELECT close_price FROM candles_1h
       WHERE stock_id = ? AND open_time <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY open_time DESC LIMIT 1`,
      [coinId]
    );

    // 주식이 ACTIVE 상태인지 확인
    if (stock.status !== 'ACTIVE') {
      console.warn(`주식 ${coinId}는 ACTIVE 상태가 아니므로 가격 업데이트를 건너뜁니다`);
      return;
    }

    // 24시간 전 가격이 없으면 initial_price 사용
    const price24hAgo = candles24h.length > 0
      ? parseFloat(candles24h[0].close_price || stock.initial_price)
      : parseFloat(stock.initial_price || price);

    // 24시간 변동률 계산 (%)
    const priceChange24h = price24hAgo > 0
      ? ((price - price24hAgo) / price24hAgo) * 100
      : 0;

    // 거래량 기반 가격 변동 적용 (현실적인 시장 반응)
    const currentPrice = typeof stock.current_price === 'string'
      ? parseFloat(stock.current_price)
      : (stock.current_price || 0);

    // 거래량 대비 변동성 계산 (거래량이 클수록 가격 변동 증가)
    const minVolatility = parseFloat(stock.min_volatility) || 0.0001; // 0.01%
    const maxVolatility = parseFloat(stock.max_volatility) || 0.05; // 5%

    // 거래량에 따른 가격 변동 (거래량이 전체 유통량의 0.1% 이상이면 최대 변동성)
    const circulatingSupply = typeof stock.circulating_supply === 'string'
      ? parseFloat(stock.circulating_supply)
      : (stock.circulating_supply || 1);
    const tradeRatio = quantity / Math.max(circulatingSupply, 1);
    const volumeBasedVolatility = Math.min(minVolatility + (maxVolatility - minVolatility) * Math.min(tradeRatio * 1000, 1), maxVolatility);
    
    // 매수/매도 방향에 따른 가격 변동
    // 매수 거래가 많으면 가격 상승, 매도 거래가 많으면 가격 하락
    const recentBuyTrades = await query(
      `SELECT COUNT(*) as count FROM trades 
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
       AND buyer_wallet_id != (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT' LIMIT 1)`,
      [coinId]
    );
    const recentSellTrades = await query(
      `SELECT COUNT(*) as count FROM trades 
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
       AND seller_wallet_id != (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT' LIMIT 1)`,
      [coinId]
    );
    
    const buyCount = recentBuyTrades[0]?.count || 0;
    const sellCount = recentSellTrades[0]?.count || 0;
    const totalRecentTrades = buyCount + sellCount;
    
    // 매수/매도 비율에 따른 가격 변동 방향 결정
    let priceDirection = 0; // -1 (하락) ~ +1 (상승)
    if (totalRecentTrades > 0) {
      priceDirection = (buyCount - sellCount) / totalRecentTrades;
    }
    
    // 거래량 기반 가격 변동 적용 (최대 volumeBasedVolatility 범위 내)
    const tradeImpact = priceDirection * volumeBasedVolatility * Math.min(quantity / 1000, 1);
    const adjustedPrice = currentPrice * (1 + tradeImpact);
    
    // 최종 가격 (체결 가격과 조정된 가격의 가중 평균)
    // 거래량이 클수록 시장 반응 비중 증가
    const marketReactionWeight = Math.min(0.5, tradeRatio * 500); // 최대 50%
    const finalPrice = price * (1 - marketReactionWeight) + adjustedPrice * marketReactionWeight;
    
    // 24시간 변동률 재계산
    const finalPriceChange24h = price24hAgo > 0
      ? ((finalPrice - price24hAgo) / price24hAgo) * 100
      : 0;

    // 24시간 거래량 계산 (최근 24시간 동안의 총 거래량)
    const volume24hResult = await query(
      `SELECT COALESCE(SUM(quantity * price), 0) as total_volume
       FROM trades
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [coinId]
    );
    const volume24h = parseFloat(volume24hResult[0]?.total_volume || '0');

    // 24시간 최고가/최저가 계산 (실제 거래 데이터 기반)
    const high24hResult = await query(
      `SELECT MAX(price) as high_price FROM trades
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [coinId]
    );
    const low24hResult = await query(
      `SELECT MIN(price) as low_price FROM trades
       WHERE stock_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [coinId]
    );

    const high24h = high24hResult[0]?.high_price
      ? parseFloat(high24hResult[0].high_price.toString())
      : finalPrice;
    const low24h = low24hResult[0]?.low_price
      ? parseFloat(low24hResult[0].low_price.toString())
      : finalPrice;

    // 상한가/하한가 제한 적용
    let clampedFinalPrice = parseFloat(finalPrice.toFixed(3));
    try {
      const priceLimit = await this.getPriceLimit(coinId);
      clampedFinalPrice = Math.max(priceLimit.lower, Math.min(priceLimit.upper, clampedFinalPrice));
    } catch (e) {
      // 가격 제한 조회 실패 시 기본 하한선만 적용
      clampedFinalPrice = Math.max(clampedFinalPrice, 0.01);
    }

    // 주식 현재가, 24시간 변동률, 24시간 거래량, 최고가/최저가 업데이트
    await query(
      'UPDATE stocks SET current_price = ?, price_change_24h = ?, volume_24h = ?, high_24h = ?, low_24h = ? WHERE id = ?',
      [clampedFinalPrice, finalPriceChange24h, volume24h, high24h, low24h, coinId]
    );

    // 캔들스틱 데이터 업데이트
    await this.updateCandlestick(coinId, finalPrice, quantity);

    // 실시간 가격 조정 (거래 체결 시마다)
    try {
      await aiTradingBot.adjustPriceForStock(coinId);
      
      // WebSocket으로 가격 업데이트 브로드캐스트 - ACTIVE 상태만
      if (websocketInstance && websocketInstance.broadcastPriceUpdate) {
        const updatedStocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [coinId]);
        if (updatedStocks.length > 0) {
          const updatedStock = updatedStocks[0];
          websocketInstance.broadcastPriceUpdate(coinId, {
            stock_id: coinId,
            current_price: updatedStock.current_price,
            price_change_24h: updatedStock.price_change_24h,
            volume_24h: updatedStock.volume_24h,
            market_cap: updatedStock.market_cap,
            high_24h: updatedStock.high_24h,
            low_24h: updatedStock.low_24h,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('실시간 가격 조정 오류:', error);
    }

    // 실시간 유동성 공급 (거래 체결 시마다)
    try {
      await aiTradingBot.provideLiquidityForStock(coinId);
      
      // WebSocket으로 호가창 업데이트 브로드캐스트
      if (websocketInstance && websocketInstance.broadcastOrderbookUpdate) {
        // 호가창 데이터 조회
        const buyOrders = await query(
          `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
           FROM orders
           WHERE stock_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
           GROUP BY price
           ORDER BY price DESC
           LIMIT 20`,
          [coinId]
        );
        const sellOrders = await query(
          `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
           FROM orders
           WHERE stock_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
           GROUP BY price
           ORDER BY price ASC
           LIMIT 20`,
          [coinId]
        );
        
        websocketInstance.broadcastOrderbookUpdate(coinId, {
          buy_orders: buyOrders,
          sell_orders: sellOrders,
        });
      }
    } catch (error) {
      console.error('실시간 유동성 공급 오류:', error);
    }

    // 거래 체결 브로드캐스트
    if (websocketInstance && websocketInstance.broadcastTrade) {
      websocketInstance.broadcastTrade(coinId, {
        id: tradeId,
        price: finalPrice,
        quantity: quantity,
        created_at: new Date().toISOString(),
      });
    }

    return tradeId;
  }

  // 지갑 잔액 업데이트
  private async updateWalletBalance(walletId: string, amount: number) {
    await query(
      'UPDATE user_wallets SET krw_balance = krw_balance + ? WHERE id = ?',
      [amount, walletId]
    );
  }

  // 주식 잔액 업데이트 (소수점 지원)
  private async updateStockBalance(walletId: string, coinId: string, amount: number, buyPrice?: number) {
    // 소수점 8자리까지 정밀도 유지
    const preciseAmount = parseFloat(amount.toFixed(8));

    const existing = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [walletId, coinId]
    );

    if (existing.length > 0) {
      // 기존 잔액 업데이트
      const oldBalance = existing[0];
      const oldAvailableAmount = typeof oldBalance.available_amount === 'string'
        ? parseFloat(oldBalance.available_amount)
        : (oldBalance.available_amount || 0);
      const oldAvgBuyPrice = typeof oldBalance.average_buy_price === 'string'
        ? parseFloat(oldBalance.average_buy_price)
        : (oldBalance.average_buy_price || 0);

      // 매수 거래인 경우 (amount > 0 && buyPrice 제공)
      if (preciseAmount > 0 && buyPrice !== undefined && buyPrice > 0) {
        // 평균 매수가 계산: (기존 보유량 × 기존 평균가 + 신규 매수량 × 신규 매수가) / (기존 보유량 + 신규 매수량)
        const newAvgBuyPrice = oldAvailableAmount > 0
          ? ((oldAvailableAmount * oldAvgBuyPrice) + (preciseAmount * buyPrice)) / (oldAvailableAmount + preciseAmount)
          : buyPrice;

        await query(
          'UPDATE user_stock_balances SET available_amount = available_amount + ?, average_buy_price = ? WHERE wallet_id = ? AND stock_id = ?',
          [preciseAmount, newAvgBuyPrice, walletId, coinId]
        );

        console.log(`평균 매수가 업데이트: ${oldAvgBuyPrice.toFixed(3)} G -> ${newAvgBuyPrice.toFixed(3)} G (매수량: ${preciseAmount})`);
      } else {
        // 매도 거래인 경우 평균 매수가 유지
        await query(
          'UPDATE user_stock_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND stock_id = ?',
          [preciseAmount, walletId, coinId]
        );
      }
    } else {
      // 새 잔액 생성
      const newAvgBuyPrice = (buyPrice !== undefined && buyPrice > 0) ? buyPrice : 0;
      await query(
        'INSERT INTO user_stock_balances (id, wallet_id, stock_id, available_amount, average_buy_price) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), walletId, coinId, preciseAmount, newAvgBuyPrice]
      );
    }
  }

  // 주식 잔액 업데이트 (locked에서 차감)
  private async updateStockBalanceFromLocked(walletId: string, coinId: string, quantity: number) {
    // 소수점 8자리까지 정밀도 유지
    const preciseQuantity = parseFloat(quantity.toFixed(8));

    // locked_amount에서 차감 (체결된 매도 주문)
    await query(
      'UPDATE user_stock_balances SET locked_amount = locked_amount - ? WHERE wallet_id = ? AND stock_id = ?',
      [preciseQuantity, walletId, coinId]
    );

    console.log(`locked 해제: wallet=${walletId}, stock=${coinId}, qty=${preciseQuantity}`);
  }

  // 주문 상태 업데이트
  private async updateOrderStatus(orderId: string, filledQty: number) {
    await query(
      'UPDATE orders SET filled_quantity = filled_quantity + ? WHERE id = ?',
      [filledQty, orderId]
    );

    const order = (await query('SELECT * FROM orders WHERE id = ?', [orderId]))[0];

    // remaining_quantity로 완전 체결 여부 확인
    const remainingQty = typeof order.remaining_quantity === 'string'
      ? parseFloat(order.remaining_quantity)
      : (order.remaining_quantity || 0);

    if (remainingQty <= 0.00000001) { // 부동소수점 오차 고려
      await query('UPDATE orders SET status = "FILLED" WHERE id = ?', [orderId]);

      // WebSocket: 주문 체결 알림 전송
      if (websocketInstance && websocketInstance.broadcastOrderFilled) {
        websocketInstance.broadcastOrderFilled({
          order_id: order.id,
          wallet_address: order.wallet_address,
          stock_id: order.stock_id,
          order_type: order.order_type,
          price: order.price,
          quantity: order.quantity,
          filled_quantity: order.filled_quantity,
        });
        console.log(`📢 주문 체결 알림 전송: ${order.id}`);
      }
    } else if (order.filled_quantity > 0) {
      await query('UPDATE orders SET status = "PARTIAL" WHERE id = ?', [orderId]);
      console.log(`📊 부분 체결: ${order.id} - 체결 ${order.filled_quantity}/${order.quantity}, 남은 수량 ${remainingQty}`);
    }
  }

  // 캔들스틱 데이터 업데이트 (1분봉, 1시간봉, 1일봉)
  private async updateCandlestick(coinId: string, price: number, volume: number) {
    // 공통 유틸리티 함수 사용 (1분봉, 1시간봉, 1일봉 모두 업데이트)
    await updateCandleData(coinId, price, volume);

    if (!websocketInstance || !websocketInstance.broadcastCandleUpdate) return;

    // UTC → KST 변환 함수
    const toKST = (date: Date) => new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const toMySQLDateTime = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const now = new Date();
    const kstNow = toKST(now);

    // 1분봉 전송
    const openTime1m = new Date(kstNow);
    openTime1m.setUTCSeconds(0, 0);
    const openTime1mStr = toMySQLDateTime(openTime1m);

    const candleData1m = await query(
      'SELECT * FROM candles_1m WHERE stock_id = ? AND open_time = ?',
      [coinId, openTime1mStr]
    );
    if (candleData1m.length > 0) {
      websocketInstance.broadcastCandleUpdate(coinId, '1m', candleData1m[0]);
    }

    // 1시간봉 전송
    const openTime1h = new Date(kstNow);
    openTime1h.setUTCMinutes(0, 0, 0);
    const openTime1hStr = toMySQLDateTime(openTime1h);

    const candleData1h = await query(
      'SELECT * FROM candles_1h WHERE stock_id = ? AND open_time = ?',
      [coinId, openTime1hStr]
    );
    if (candleData1h.length > 0) {
      websocketInstance.broadcastCandleUpdate(coinId, '1h', candleData1h[0]);
    }

    // 1일봉 전송
    const openTime1d = new Date(kstNow);
    openTime1d.setUTCHours(0, 0, 0, 0);
    const openTime1dStr = toMySQLDateTime(openTime1d);

    const candleData1d = await query(
      'SELECT * FROM candles_1d WHERE stock_id = ? AND open_time = ?',
      [coinId, openTime1dStr]
    );
    if (candleData1d.length > 0) {
      websocketInstance.broadcastCandleUpdate(coinId, '1d', candleData1d[0]);
    }
  }
}

export default new TradingEngine();
