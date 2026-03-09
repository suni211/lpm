import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import tradingEngine from '../services/tradingEngine';
import stopOrderMonitor from '../services/stopOrderMonitor';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 장 시간 체크 (KST 15:00 ~ 01:00)
function isMarketOpen(): boolean {
  const now = new Date();
  // KST = UTC + 9
  const kstHour = (now.getUTCHours() + 9) % 24;
  // 15:00 ~ 23:59 또는 00:00 ~ 00:59
  return kstHour >= 15 || kstHour < 1;
}

// 주문 생성 (매수/매도) - 로그인 필요
router.post('/order', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, stock_id, order_type, order_method, price, quantity, amount } = req.body;

    // 장 시간 체크
    if (!isMarketOpen()) {
      return res.status(400).json({ error: '장 시간이 아닙니다 (15:00~01:00 KST)' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    // 주식 조회
    const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stock_id]);

    if (stocks.length === 0) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    const stock = stocks[0];

    // 시장가 주문은 현재가로 설정
    const orderPrice = order_method === 'MARKET' ? stock.current_price : price;

    if (!orderPrice || orderPrice <= 0) {
      return res.status(400).json({ error: '유효하지 않은 가격입니다' });
    }

    // 지정가 주문: 상한가/하한가 검증
    if (order_method === 'LIMIT' && price) {
      try {
        const priceLimit = await tradingEngine.getPriceLimit(stock_id);
        if (price < priceLimit.lower || price > priceLimit.upper) {
          return res.status(400).json({
            error: `가격이 허용 범위를 벗어났습니다 (하한가: ${priceLimit.lower.toLocaleString()} G, 상한가: ${priceLimit.upper.toLocaleString()} G)`
          });
        }
      } catch (e) {
        console.error('가격 제한 조회 오류:', e);
      }
    }

    // 금액 기반 주문 지원: amount가 있으면 quantity 계산
    let finalQuantity = quantity;
    if (amount && amount > 0) {
      // 금액으로 수량 계산 (정수로 내림)
      finalQuantity = Math.floor(amount / orderPrice);
      if (finalQuantity <= 0) {
        return res.status(400).json({ error: '입력한 금액으로는 구매할 수 있는 수량이 없습니다' });
      }
    }

    // 소수점 제거 (정수 단위만 거래 가능)
    finalQuantity = Math.floor(finalQuantity);

    if (!finalQuantity || finalQuantity <= 0) {
      return res.status(400).json({ error: '최소 1주 이상 주문해야 합니다' });
    }

    // 매수 주문: 한 종목 최대 10% 보유 제한
    if (order_type === 'BUY') {
      const circulatingSupply = typeof stock.circulating_supply === 'string'
        ? parseFloat(stock.circulating_supply)
        : (stock.circulating_supply || 0);
      const maxHoldable = Math.floor(circulatingSupply * 0.1); // 유통량의 10%

      // 현재 보유량 조회
      const currentHoldings = await query(
        'SELECT COALESCE(total_amount, 0) as total_amount FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
        [wallet.id, stock_id]
      );
      const currentlyHeld = currentHoldings.length > 0
        ? parseFloat(currentHoldings[0].total_amount || '0')
        : 0;

      if (currentlyHeld + finalQuantity > maxHoldable) {
        const canBuyMore = Math.floor(maxHoldable - currentlyHeld);
        if (canBuyMore <= 0) {
          return res.status(400).json({
            error: `이미 최대 보유 한도(유통량의 10%, ${maxHoldable}주)에 도달했습니다`
          });
        }
        return res.status(400).json({
          error: `한 종목당 최대 유통량의 10%(${maxHoldable}주)까지 보유 가능합니다. 현재 ${currentlyHeld}주 보유 중이므로 최대 ${canBuyMore}주 추가 구매 가능합니다.`
        });
      }
    }

    // 창업자 매도 제한 체크
    if (order_type === 'SELL' && stock.founder_uuid) {
      if (wallet.minecraft_uuid === stock.founder_uuid) {
        // 창업자는 자사 주식 매도 불가 - 관리자 승인 요청 생성
        const requestId = uuidv4();
        await query(
          `INSERT INTO founder_sell_requests (id, stock_id, wallet_id, founder_uuid, order_method, price, quantity, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
          [requestId, stock_id, wallet.id, stock.founder_uuid, order_method, order_method === 'LIMIT' ? orderPrice : null, finalQuantity]
        );

        return res.json({
          success: true,
          founder_sell_request: true,
          request_id: requestId,
          message: '창업자 매도 요청이 등록되었습니다. 관리자 승인 후 매도됩니다.',
        });
      }
    }

    // 주문 생성 및 매칭 (tradingEngine 사용)
    let orderId: string;
    let matchResult: { matched: number; remaining: number };

    try {
      if (order_method === 'MARKET') {
        // 시장가 주문: 즉시 매칭
        if (order_type === 'BUY') {
          matchResult = await tradingEngine.processBuyOrder(wallet.id, stock_id, 'MARKET', finalQuantity) as { matched: number; remaining: number };
        } else {
          matchResult = await tradingEngine.processSellOrder(wallet.id, stock_id, 'MARKET', finalQuantity) as { matched: number; remaining: number };
        }

        // 시장가 주문 결과 처리
        return res.json({
          success: true,
          message: `${order_type === 'BUY' ? '매수' : '매도'} 주문이 체결되었습니다`,
          matched: matchResult.matched,
          remaining: matchResult.remaining,
        });
      } else {
        // 지정가 주문: tradingEngine 사용
        if (order_type === 'BUY') {
          orderId = await tradingEngine.processBuyOrder(wallet.id, stock_id, 'LIMIT', finalQuantity, orderPrice) as string;
        } else {
          orderId = await tradingEngine.processSellOrder(wallet.id, stock_id, 'LIMIT', finalQuantity, orderPrice) as string;
        }

        const orders = await query(
          `SELECT o.*, s.symbol, s.name
           FROM orders o
           JOIN stocks s ON o.stock_id = s.id
           WHERE o.id = ?`,
          [orderId]
        );

        return res.json({
          success: true,
          order: orders[0],
          message: `${order_type === 'BUY' ? '매수' : '매도'} 주문이 등록되었습니다`,
        });
      }
    } catch (error: any) {
      console.error('주문 처리 오류:', error);
      return res.status(400).json({ error: error.message || '주문 처리 실패' });
    }
  } catch (error) {
    console.error('주문 생성 오류:', error);
    res.status(500).json({ error: '주문 생성 실패' });
  }
});

// 내 주문 목록 - 로그인 필요
router.get('/orders/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;
    const { status, stock_id } = req.query;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    let sql = `
      SELECT o.*, s.symbol, s.name, s.logo_url
      FROM orders o
      JOIN stocks s ON o.stock_id = s.id
      WHERE o.wallet_id = ?
    `;
    const params: any[] = [wallet.id];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (stock_id) {
      sql += ' AND o.stock_id = ?';
      params.push(stock_id);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await query(sql, params);

    res.json({ orders });
  } catch (error) {
    console.error('주문 조회 오류:', error);
    res.status(500).json({ error: '주문 조회 실패' });
  }
});

// 주문 취소 - 로그인 필요
router.post('/orders/:order_id/cancel', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { order_id } = req.params;
    const { wallet_address } = req.body;

    // 주문 조회 (PENDING 또는 PARTIAL 상태만 취소 가능)
    const orders = await query(
      `SELECT o.*, w.wallet_address
       FROM orders o
       JOIN user_wallets w ON o.wallet_id = w.id
       WHERE o.id = ? AND o.status IN ('PENDING', 'PARTIAL')`,
      [order_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: '주문을 찾을 수 없거나 이미 처리되었습니다' });
    }

    const order = orders[0];

    // 권한 확인
    if (order.wallet_address !== wallet_address) {
      return res.status(403).json({ error: '권한이 없습니다' });
    }

    // 남은 수량 계산 (부분 체결 고려)
    const remainingQty = typeof order.remaining_quantity === 'string' 
      ? parseFloat(order.remaining_quantity) 
      : (typeof order.remaining_quantity === 'number' ? order.remaining_quantity : 0);

    if (isNaN(remainingQty) || remainingQty <= 0) {
      return res.status(400).json({ error: '취소할 수량이 없습니다' });
    }

    // 주문 취소 처리
    if (order.order_type === 'BUY') {
      // 매수 취소: 환불 (남은 수량 기준)
      const orderPrice = typeof order.price === 'string' ? parseFloat(order.price) : (typeof order.price === 'number' ? order.price : 0);
      if (isNaN(orderPrice) || orderPrice <= 0) {
        return res.status(400).json({ error: '유효하지 않은 주문 가격입니다' });
      }

      const totalQuantity = typeof order.quantity === 'string' ? parseFloat(order.quantity) : (typeof order.quantity === 'number' ? order.quantity : 0);
      const orderFee = typeof order.fee === 'string' ? parseFloat(order.fee) : (typeof order.fee === 'number' ? order.fee : 0);

      // 남은 수량에 대한 금액 계산
      const refundAmount = orderPrice * remainingQty;

      // 남은 수량 비율로 수수료 비례 배분
      const remainingRatio = totalQuantity > 0 ? remainingQty / totalQuantity : 0;
      const refundFee = Math.floor(orderFee * remainingRatio);

      const totalRefund = refundAmount + refundFee;

      console.log(`📝 주문 취소 환불 계산: 가격=${orderPrice}, 남은수량=${remainingQty}, 전체수량=${totalQuantity}, 주문수수료=${orderFee}, 환불수수료=${refundFee}, 총환불=${totalRefund}`);

      await query('UPDATE user_wallets SET krw_balance = krw_balance + ? WHERE id = ?', [Number(totalRefund), order.wallet_id]);
    } else if (order.order_type === 'SELL') {
      // 매도 취소: 주식 잠금 해제 (남은 수량 기준)
      const remainingQtyNum = Number(remainingQty);
      await query(
        'UPDATE user_stock_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND stock_id = ?',
        [remainingQtyNum, remainingQtyNum, order.wallet_id, order.stock_id]
      );
    }

    // 주문 상태 변경
    await query('UPDATE orders SET status = "CANCELLED" WHERE id = ?', [order_id]);

    // WebSocket: 주문 취소 알림 전송
    try {
      const { getWebSocketInstance } = await import('../index');
      const websocket = getWebSocketInstance();
      if (websocket && websocket.broadcastOrderCancelled) {
        websocket.broadcastOrderCancelled({
          order_id: order.id,
          wallet_address: order.wallet_address,
          stock_id: order.stock_id,
          order_type: order.order_type,
          price: order.price,
          quantity: order.quantity,
          filled_quantity: order.filled_quantity,
        });
        console.log(`📢 주문 취소 알림 전송: ${order.id}`);
      }
    } catch (wsError) {
      console.error('WebSocket 알림 전송 실패:', wsError);
      // WebSocket 실패해도 주문 취소는 성공
    }

    res.json({
      success: true,
      message: '주문이 취소되었습니다',
    });
  } catch (error) {
    console.error('주문 취소 오류:', error);
    res.status(500).json({ error: '주문 취소 실패' });
  }
});

// 호가창 (매수/매도 주문 목록)
router.get('/orderbook/:stock_id', async (req: Request, res: Response) => {
  try {
    const { stock_id } = req.params;
    const { limit = 20 } = req.query;

    // 매수 호가 (높은 가격 순) - AI 봇 주문 제외
    const buyOrders = await query(
      `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
       FROM orders
       WHERE stock_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
         AND wallet_id NOT IN (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT')
       GROUP BY price
       ORDER BY price DESC
       LIMIT ?`,
      [stock_id, Number(limit)]
    );

    // 매도 호가 (낮은 가격 순) - AI 봇 주문 제외
    const sellOrders = await query(
      `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
       FROM orders
       WHERE stock_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
         AND wallet_id NOT IN (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT')
       GROUP BY price
       ORDER BY price ASC
       LIMIT ?`,
      [stock_id, Number(limit)]
    );

    res.json({
      buy_orders: buyOrders,
      sell_orders: sellOrders,
    });
  } catch (error) {
    console.error('호가창 조회 오류:', error);
    res.status(500).json({ error: '호가창 조회 실패' });
  }
});

// 내 거래 체결 내역 - 로그인 필요
router.get('/trades/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;
    const { stock_id, limit = 50 } = req.query;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    let sql = `
      SELECT t.*, s.symbol, s.name,
             CASE
               WHEN t.buyer_wallet_id = ? THEN 'BUY'
               WHEN t.seller_wallet_id = ? THEN 'SELL'
             END as trade_type,
             CASE
               WHEN t.buyer_wallet_id = ? THEN t.buy_fee
               WHEN t.seller_wallet_id = ? THEN t.sell_fee
             END as my_fee
      FROM trades t
      JOIN stocks s ON t.stock_id = s.id
      WHERE (t.buyer_wallet_id = ? OR t.seller_wallet_id = ?)
    `;
    const params: any[] = [wallet.id, wallet.id, wallet.id, wallet.id, wallet.id, wallet.id];

    if (stock_id) {
      sql += ' AND t.stock_id = ?';
      params.push(stock_id);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const trades = await query(sql, params);

    res.json({ trades });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
});

// 스탑 주문 생성 (손절/익절) - 로그인 필요
router.post('/stop-order', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, stock_id, stop_type, quantity, stop_price, trailing_percent } = req.body;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    // 주식 보유 확인
    const balances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [wallet.id, stock_id]
    );

    if (balances.length === 0) {
      return res.status(400).json({ error: '해당 주식을 보유하고 있지 않습니다' });
    }

    const availableAmount = typeof balances[0].available_amount === 'string'
      ? parseFloat(balances[0].available_amount)
      : (balances[0].available_amount || 0);

    if (availableAmount < quantity) {
      return res.status(400).json({
        error: `보유 수량이 부족합니다 (보유: ${availableAmount}, 요청: ${quantity})`
      });
    }

    // 스탑 주문 생성
    const orderId = await stopOrderMonitor.createStopOrder(
      wallet.id,
      stock_id,
      stop_type,
      quantity,
      stop_price,
      trailing_percent
    );

    // 주식 잠금 (스탑 주문이 트리거될 때까지)
    await query(
      'UPDATE user_stock_balances SET available_amount = available_amount - ?, locked_amount = locked_amount + ? WHERE wallet_id = ? AND stock_id = ?',
      [quantity, quantity, wallet.id, stock_id]
    );

    res.json({
      success: true,
      order_id: orderId,
      message: '스탑 주문이 등록되었습니다',
    });
  } catch (error: any) {
    console.error('스탑 주문 생성 오류:', error);
    res.status(500).json({ error: error.message || '스탑 주문 생성 실패' });
  }
});

// 내 스탑 주문 목록 - 로그인 필요
router.get('/stop-orders/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    const stopOrders = await query(
      `SELECT o.*, s.symbol, s.name, s.current_price
       FROM orders o
       JOIN stocks s ON o.stock_id = s.id
       WHERE o.wallet_id = ?
       AND o.is_stop_order = TRUE
       ORDER BY o.created_at DESC`,
      [wallet.id]
    );

    res.json({ stop_orders: stopOrders });
  } catch (error) {
    console.error('스탑 주문 조회 오류:', error);
    res.status(500).json({ error: '스탑 주문 조회 실패' });
  }
});

export default router;
