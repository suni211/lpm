import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import aiTradingBot from './aiTradingBot';

// WebSocket 인스턴스를 가져오기 위한 타입
let websocketInstance: any = null;

export function setWebSocketInstance(ws: any) {
  websocketInstance = ws;
}

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

    // 코인 정보 조회 (현재가 확인)
    const coins = await query('SELECT * FROM coins WHERE id = ?', [coinId]);
    if (coins.length === 0) {
      throw new Error('코인을 찾을 수 없습니다');
    }
    const coin = coins[0];
    const currentPrice = typeof coin.current_price === 'string' 
      ? parseFloat(coin.current_price) 
      : (coin.current_price || 0);

    // 최저가 매도 주문들 조회 (유저 매도 주문)
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
       AND is_admin_order = FALSE
       ORDER BY price ASC, created_at ASC`,
      [coinId]
    );

    let remainingQty = quantity;
    let totalCost = 0;

    // 1. 유저 매도 주문과 매칭
    const walletBalance = typeof wallet.gold_balance === 'string' 
      ? parseFloat(wallet.gold_balance) 
      : (wallet.gold_balance || 0);

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
      // 코인 유통량 확인
      const coinCirculatingSupply = typeof coin.circulating_supply === 'string' 
        ? parseFloat(coin.circulating_supply) 
        : (coin.circulating_supply || 0);

      // 현재 유저들이 보유한 총량 계산 (AI 봇 제외)
      const userHoldings = await query(
        `SELECT COALESCE(SUM(ucb.total_amount), 0) as total_held
         FROM user_coin_balances ucb
         JOIN user_wallets uw ON ucb.wallet_id = uw.id
         WHERE ucb.coin_id = ? AND uw.minecraft_username != 'AI_BOT'`,
        [coinId]
      );

      const totalHeld = parseFloat(userHoldings[0]?.total_held || '0');
      const availableSupply = coinCirculatingSupply - totalHeld; // 유통량에서 유저 보유량 제외

      // 유통량 기준으로 구매 가능한 양 계산
      const purchasableQty = Math.max(0, availableSupply);

      if (purchasableQty < remainingQty) {
        // 유통량 부족 - 예약 주문 생성 (누군가 팔 때까지 대기)
        const orderId = uuidv4();
        const totalAmount = currentPrice * remainingQty;
        const fee = Math.floor(totalAmount * 0.05);
        const totalRequired = totalAmount + fee;

        // 잔액 확인
        const walletBalanceCheck = typeof wallet.gold_balance === 'string' 
          ? parseFloat(wallet.gold_balance) 
          : (wallet.gold_balance || 0);
        
        if (walletBalanceCheck < totalCost + totalRequired) {
          throw new Error('잔액이 부족합니다');
        }

        // 예약 주문 생성 (유통량이 부족한 경우)
        await query(
          `INSERT INTO orders (id, wallet_id, coin_id, order_type, order_method, price, quantity, status, is_admin_order)
           VALUES (?, ?, ?, 'BUY', 'LIMIT', ?, ?, 'PENDING', FALSE)`,
          [orderId, walletId, coinId, currentPrice, remainingQty]
        );

        // 잔액 잠금
        await query('UPDATE user_wallets SET gold_balance = gold_balance - ? WHERE id = ?', [
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

      // AI 봇의 코인 잔액 확인
      const aiBalances = await query(
        'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
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
            'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
            [neededAmount, aiWallet.id, coinId]
          );
        } else {
          await query(
            `INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, average_buy_price)
             VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), aiWallet.id, coinId, neededAmount, currentPrice]
          );
        }
      }

      const matchCost = currentPrice * sellableQty;
      const fee = Math.floor(matchCost * 0.05);
      const totalRequired = matchCost + fee;

      // 잔액 확인 (이미 사용한 금액 포함)
      const walletBalance = typeof wallet.gold_balance === 'string' 
        ? parseFloat(wallet.gold_balance) 
        : (wallet.gold_balance || 0);

      if (walletBalance < totalCost + totalRequired) {
        throw new Error('잔액이 부족합니다');
      }

      // AI 봇과 직접 거래 체결 (executeTrade에서 잔액 차감 처리)
      console.log(`💰 매수 체결: ${sellableQty}개, 가격: ${currentPrice}, 총액: ${totalRequired}`);
      await this.executeTrade(walletId, aiWallet.id, coinId, currentPrice, sellableQty, null, null);
      totalCost += totalRequired;
      remainingQty -= sellableQty;
    }

    // executeTrade에서 이미 잔액 차감을 처리하므로 추가 차감 불필요

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
    // 주문 정보 조회
    const buyOrders = await query('SELECT * FROM orders WHERE id = ?', [buyOrderId]);
    if (buyOrders.length === 0) return;
    const buyOrder = buyOrders[0];
    let remainingQty = buyOrder.remaining_quantity;

    // 지정가 이하의 유저 매도 주문 찾기
    const sellOrders = await query(
      `SELECT * FROM orders
       WHERE coin_id = ? AND order_type = 'SELL' AND price <= ? AND status IN ('PENDING', 'PARTIAL')
       AND is_admin_order = FALSE
       ORDER BY price ASC, created_at ASC`,
      [coinId, buyPrice]
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
      // 코인 정보 조회 (현재가 및 유통량 확인)
      const coins = await query('SELECT * FROM coins WHERE id = ?', [coinId]);
      if (coins.length > 0) {
        const coin = coins[0];
        const currentPrice = typeof coin.current_price === 'string' 
          ? parseFloat(coin.current_price) 
          : (coin.current_price || 0);

        // 지정가가 현재가 이상이면 유통량 기준으로 판매
        if (buyPrice >= currentPrice) {
          // 유통량 확인
          const coinCirculatingSupply = typeof coin.circulating_supply === 'string' 
            ? parseFloat(coin.circulating_supply) 
            : (coin.circulating_supply || 0);

          // 현재 유저들이 보유한 총량 계산 (AI 봇 제외)
          const userHoldings = await query(
            `SELECT COALESCE(SUM(ucb.total_amount), 0) as total_held
             FROM user_coin_balances ucb
             JOIN user_wallets uw ON ucb.wallet_id = uw.id
             WHERE ucb.coin_id = ? AND uw.minecraft_username != 'AI_BOT'`,
            [coinId]
          );

          const totalHeld = parseFloat(userHoldings[0]?.total_held || '0');
          const availableSupply = coinCirculatingSupply - totalHeld; // 유통량에서 유저 보유량 제외
          const purchasableQty = Math.max(0, availableSupply);

          if (purchasableQty > 0) {
            // AI 봇 지갑 조회
            const aiWallets = await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"');
            if (aiWallets.length > 0) {
              const aiWallet = aiWallets[0];

              // AI 봇의 코인 잔액 확인
              const aiBalances = await query(
                'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
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
                      'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
                      [neededAmount, aiWallet.id, coinId]
                    );
                  } else {
                    await query(
                      `INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, average_buy_price)
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

    // 거래 기록 생성 (buy_order_id, sell_order_id는 NULL 허용)
    await query(
      `INSERT INTO trades (id, coin_id, buy_order_id, sell_order_id, buyer_wallet_id, seller_wallet_id, price, quantity, buy_fee, sell_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tradeId, coinId, buyOrderId || null, sellOrderId || null, buyerWalletId, sellerWalletId, price, quantity, buyFee, sellFee]
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

    // 24시간 전 가격 조회 (캔들스틱 데이터에서)
    const candles24h = await query(
      `SELECT close_price FROM candles_1h
       WHERE coin_id = ? AND open_time <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY open_time DESC LIMIT 1`,
      [coinId]
    );
    
    // 코인 정보 조회
    const coins = await query('SELECT * FROM coins WHERE id = ?', [coinId]);
    const coin = coins[0];
    
    // 24시간 전 가격이 없으면 initial_price 사용
    const price24hAgo = candles24h.length > 0 
      ? parseFloat(candles24h[0].close_price || coin.initial_price)
      : parseFloat(coin.initial_price || price);
    
    // 24시간 변동률 계산 (%)
    const priceChange24h = price24hAgo > 0 
      ? ((price - price24hAgo) / price24hAgo) * 100 
      : 0;

    // 거래량 기반 가격 변동 적용 (현실적인 시장 반응)
    const currentPrice = typeof coin.current_price === 'string' 
      ? parseFloat(coin.current_price) 
      : (coin.current_price || 0);
    
    // 거래량 대비 변동성 계산 (거래량이 클수록 가격 변동 증가)
    const minVolatility = parseFloat(coin.min_volatility) || 0.0001; // 0.01%
    const maxVolatility = parseFloat(coin.max_volatility) || 0.05; // 5%
    
    // 거래량에 따른 가격 변동 (거래량이 전체 유통량의 0.1% 이상이면 최대 변동성)
    const circulatingSupply = typeof coin.circulating_supply === 'string' 
      ? parseFloat(coin.circulating_supply) 
      : (coin.circulating_supply || 1);
    const tradeRatio = quantity / Math.max(circulatingSupply, 1);
    const volumeBasedVolatility = Math.min(minVolatility + (maxVolatility - minVolatility) * Math.min(tradeRatio * 1000, 1), maxVolatility);
    
    // 매수/매도 방향에 따른 가격 변동
    // 매수 거래가 많으면 가격 상승, 매도 거래가 많으면 가격 하락
    const recentBuyTrades = await query(
      `SELECT COUNT(*) as count FROM trades 
       WHERE coin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
       AND buyer_wallet_id != (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT' LIMIT 1)`,
      [coinId]
    );
    const recentSellTrades = await query(
      `SELECT COUNT(*) as count FROM trades 
       WHERE coin_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) 
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

    // 코인 현재가 및 24시간 변동률 업데이트
    await query('UPDATE coins SET current_price = ?, price_change_24h = ? WHERE id = ?', [finalPrice, finalPriceChange24h, coinId]);

    // 캔들스틱 데이터 업데이트
    await this.updateCandlestick(coinId, finalPrice, quantity);

    // 실시간 가격 조정 (거래 체결 시마다)
    try {
      await aiTradingBot.adjustPriceForCoin(coinId);
      
      // WebSocket으로 가격 업데이트 브로드캐스트
      if (websocketInstance && websocketInstance.broadcastPriceUpdate) {
        const updatedCoin = (await query('SELECT * FROM coins WHERE id = ?', [coinId]))[0];
        websocketInstance.broadcastPriceUpdate(coinId, {
          coin_id: coinId,
          current_price: updatedCoin.current_price,
          price_change_24h: updatedCoin.price_change_24h,
          volume_24h: updatedCoin.volume_24h,
          market_cap: updatedCoin.market_cap,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('실시간 가격 조정 오류:', error);
    }

    // 실시간 유동성 공급 (거래 체결 시마다)
    try {
      await aiTradingBot.provideLiquidityForCoin(coinId);
      
      // WebSocket으로 호가창 업데이트 브로드캐스트
      if (websocketInstance && websocketInstance.broadcastOrderbookUpdate) {
        // 호가창 데이터 조회
        const buyOrders = await query(
          `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
           FROM orders
           WHERE coin_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
           GROUP BY price
           ORDER BY price DESC
           LIMIT 20`,
          [coinId]
        );
        const sellOrders = await query(
          `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
           FROM orders
           WHERE coin_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
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
      'UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE id = ?',
      [amount, walletId]
    );
  }

  // 코인 잔액 업데이트 (소수점 지원)
  private async updateCoinBalance(walletId: string, coinId: string, amount: number) {
    // 소수점 8자리까지 정밀도 유지
    const preciseAmount = parseFloat(amount.toFixed(8));
    
    const existing = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, coinId]
    );

    if (existing.length > 0) {
      // 기존 잔액 업데이트 (소수점 정밀도 유지)
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
        [preciseAmount, walletId, coinId]
      );
    } else {
      // 새 잔액 생성
      await query(
        'INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), walletId, coinId, preciseAmount]
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

    let candleData: any;

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
      
      // 업데이트된 캔들 데이터 조회
      const updated = await query(
        'SELECT * FROM candles_1m WHERE coin_id = ? AND open_time = ?',
        [coinId, openTime]
      );
      candleData = updated[0];
    } else {
      const candleId = uuidv4();
      await query(
        `INSERT INTO candles_1m (id, coin_id, open_time, close_time, open_price, high_price, low_price, close_price, volume, trade_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [candleId, coinId, openTime, closeTime, price, price, price, price, volume]
      );
      
      // 새로 생성된 캔들 데이터 조회
      const newCandle = await query(
        'SELECT * FROM candles_1m WHERE id = ?',
        [candleId]
      );
      candleData = newCandle[0];
    }

    // WebSocket으로 캔들 업데이트 브로드캐스트
    if (websocketInstance && websocketInstance.broadcastCandleUpdate && candleData) {
      websocketInstance.broadcastCandleUpdate(coinId, '1m', {
        coin_id: coinId,
        id: candleData.id,
        open_time: candleData.open_time,
        close_time: candleData.close_time,
        open_price: candleData.open_price,
        high_price: candleData.high_price,
        low_price: candleData.low_price,
        close_price: candleData.close_price,
        volume: candleData.volume,
        trade_count: candleData.trade_count,
      });
    }
  }
}

export default new TradingEngine();
