import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import blockchainService from '../services/blockchainService';
import tradingEngine from '../services/tradingEngine';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 주문 생성 (매수/매도) - 로그인 필요
router.post('/order', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, coin_id, order_type, order_method, price, quantity, amount } = req.body;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    // 코인 조회
    const coins = await query('SELECT * FROM coins WHERE id = ? AND status = "ACTIVE"', [coin_id]);

    if (coins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }

    const coin = coins[0];

    // 시장가 주문은 현재가로 설정
    const orderPrice = order_method === 'MARKET' ? coin.current_price : price;

    if (!orderPrice || orderPrice <= 0) {
      return res.status(400).json({ error: '유효하지 않은 가격입니다' });
    }

    // 금액 기반 주문 지원: amount가 있으면 quantity 계산
    let finalQuantity = quantity;
    if (amount && amount > 0) {
      // 금액으로 수량 계산 (소수점 8자리까지)
      finalQuantity = parseFloat((amount / orderPrice).toFixed(8));
      if (finalQuantity <= 0) {
        return res.status(400).json({ error: '입력한 금액으로는 구매할 수 있는 수량이 없습니다' });
      }
    }

    if (!finalQuantity || finalQuantity <= 0) {
      return res.status(400).json({ error: '유효하지 않은 수량입니다' });
    }

    // 주문 생성 및 매칭 (tradingEngine 사용)
    let orderId: string;
    let matchResult: { matched: number; remaining: number };

    try {
      if (order_method === 'MARKET') {
        // 시장가 주문: 즉시 매칭
        if (order_type === 'BUY') {
          matchResult = await tradingEngine.processBuyOrder(wallet.id, coin_id, 'MARKET', finalQuantity) as { matched: number; remaining: number };
        } else {
          matchResult = await tradingEngine.processSellOrder(wallet.id, coin_id, 'MARKET', finalQuantity) as { matched: number; remaining: number };
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
          orderId = await tradingEngine.processBuyOrder(wallet.id, coin_id, 'LIMIT', finalQuantity, orderPrice) as string;
        } else {
          orderId = await tradingEngine.processSellOrder(wallet.id, coin_id, 'LIMIT', finalQuantity, orderPrice) as string;
        }

        // 블록체인 거래 기록 생성
        const totalAmount = orderPrice * finalQuantity;
        const fee = Math.floor(totalAmount * 0.05);
        await blockchainService.createTransaction(
          wallet.wallet_address,
          order_type === 'BUY' ? coin.symbol : 'SYSTEM',
          totalAmount,
          fee,
          'TRADE',
          orderId
        );

        const orders = await query(
          `SELECT o.*, c.symbol, c.name
           FROM orders o
           JOIN coins c ON o.coin_id = c.id
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
    const { status, coin_id } = req.query;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    let sql = `
      SELECT o.*, c.symbol, c.name, c.logo_url
      FROM orders o
      JOIN coins c ON o.coin_id = c.id
      WHERE o.wallet_id = ?
    `;
    const params: any[] = [wallet.id];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (coin_id) {
      sql += ' AND o.coin_id = ?';
      params.push(coin_id);
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
      // 매수 취소: Gold 환불 (남은 수량 기준)
      const orderPrice = typeof order.price === 'string' ? parseFloat(order.price) : (typeof order.price === 'number' ? order.price : 0);
      if (isNaN(orderPrice) || orderPrice <= 0) {
        return res.status(400).json({ error: '유효하지 않은 주문 가격입니다' });
      }
      
      const refundAmount = parseFloat((orderPrice * remainingQty).toFixed(2));
      const refundFee = Math.floor(refundAmount * 0.05); // 수수료도 환불
      const totalRefund = refundAmount + refundFee;
      
      // 숫자로 명시적 변환
      await query('UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE id = ?', [
        Number(totalRefund),
        order.wallet_id,
      ]);
    } else if (order.order_type === 'SELL') {
      // 매도 취소: 코인 잠금 해제 (남은 수량 기준)
      const remainingQtyNum = Number(remainingQty);
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount + ?, locked_amount = locked_amount - ? WHERE wallet_id = ? AND coin_id = ?',
        [remainingQtyNum, remainingQtyNum, order.wallet_id, order.coin_id]
      );
    }

    // 주문 상태 변경
    await query('UPDATE orders SET status = "CANCELLED" WHERE id = ?', [order_id]);

    // WebSocket: 주문 취소 알림 전송
    try {
      const { getWebSocketInstance } = await import('../index');
      const io = getWebSocketInstance();
      if (io) {
        io.emit('order:cancelled', {
          order_id: order.id,
          wallet_address: order.wallet_address,
          coin_id: order.coin_id,
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
router.get('/orderbook/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { limit = 20 } = req.query;

    // 매수 호가 (높은 가격 순)
    const buyOrders = await query(
      `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
       FROM orders
       WHERE coin_id = ? AND order_type = 'BUY' AND status IN ('PENDING', 'PARTIAL')
       GROUP BY price
       ORDER BY price DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    // 매도 호가 (낮은 가격 순)
    const sellOrders = await query(
      `SELECT price, SUM(remaining_quantity) as total_quantity, COUNT(*) as order_count
       FROM orders
       WHERE coin_id = ? AND order_type = 'SELL' AND status IN ('PENDING', 'PARTIAL')
       GROUP BY price
       ORDER BY price ASC
       LIMIT ?`,
      [coin_id, Number(limit)]
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
    const { coin_id, limit = 50 } = req.query;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    let sql = `
      SELECT t.*, c.symbol, c.name,
             CASE
               WHEN t.buyer_wallet_id = ? THEN 'BUY'
               WHEN t.seller_wallet_id = ? THEN 'SELL'
             END as trade_type,
             CASE
               WHEN t.buyer_wallet_id = ? THEN t.buy_fee
               WHEN t.seller_wallet_id = ? THEN t.sell_fee
             END as my_fee
      FROM trades t
      JOIN coins c ON t.coin_id = c.id
      WHERE (t.buyer_wallet_id = ? OR t.seller_wallet_id = ?)
    `;
    const params: any[] = [wallet.id, wallet.id, wallet.id, wallet.id, wallet.id, wallet.id];

    if (coin_id) {
      sql += ' AND t.coin_id = ?';
      params.push(coin_id);
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

export default router;
