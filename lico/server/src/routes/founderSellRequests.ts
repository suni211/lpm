import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import tradingEngine from '../services/tradingEngine';

const router = express.Router();

// 내 창업자 매도 요청 목록 조회
router.get('/my/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    const requests = await query(
      `SELECT fsr.*, s.symbol, s.name as stock_name
       FROM founder_sell_requests fsr
       JOIN stocks s ON fsr.stock_id = s.id
       WHERE fsr.wallet_id = ?
       ORDER BY fsr.created_at DESC`,
      [wallet.id]
    );

    res.json({ requests });
  } catch (error) {
    console.error('창업자 매도 요청 조회 오류:', error);
    res.status(500).json({ error: '창업자 매도 요청 조회 실패' });
  }
});

// 전체 창업자 매도 요청 목록 (관리자)
router.get('/all', isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT fsr.*, s.symbol, s.name as stock_name,
             w.minecraft_username as founder_username
      FROM founder_sell_requests fsr
      JOIN stocks s ON fsr.stock_id = s.id
      JOIN user_wallets w ON fsr.wallet_id = w.id
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ' WHERE fsr.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY fsr.created_at DESC';

    const requests = await query(sql, params);

    res.json({ requests });
  } catch (error) {
    console.error('창업자 매도 요청 목록 조회 오류:', error);
    res.status(500).json({ error: '창업자 매도 요청 목록 조회 실패' });
  }
});

// 창업자 매도 요청 승인 (관리자)
router.post('/:id/approve', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_comment } = req.body;
    const adminId = (req.session as any).adminId;

    // 요청 조회
    const requests = await query(
      'SELECT * FROM founder_sell_requests WHERE id = ? AND status = "PENDING"',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: '대기 중인 매도 요청을 찾을 수 없습니다' });
    }

    const sellRequest = requests[0];

    // 요청 상태 업데이트
    await query(
      `UPDATE founder_sell_requests
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW(), admin_comment = ?
       WHERE id = ?`,
      [adminId, admin_comment || null, id]
    );

    // 실제 매도 주문 실행 (tradingEngine 사용)
    try {
      const quantity = typeof sellRequest.quantity === 'string'
        ? parseFloat(sellRequest.quantity)
        : sellRequest.quantity;

      if (sellRequest.order_method === 'MARKET') {
        await tradingEngine.processSellOrder(
          sellRequest.wallet_id,
          sellRequest.stock_id,
          'MARKET',
          quantity
        );
      } else {
        const price = typeof sellRequest.price === 'string'
          ? parseFloat(sellRequest.price)
          : sellRequest.price;

        await tradingEngine.processSellOrder(
          sellRequest.wallet_id,
          sellRequest.stock_id,
          'LIMIT',
          quantity,
          price
        );
      }

      res.json({
        success: true,
        message: '창업자 매도 요청이 승인되어 매도 주문이 실행되었습니다',
      });
    } catch (tradeError: any) {
      // 매도 실행 실패 시 상태를 다시 PENDING으로 되돌림
      await query(
        `UPDATE founder_sell_requests
         SET status = 'PENDING', reviewed_by = NULL, reviewed_at = NULL, admin_comment = NULL
         WHERE id = ?`,
        [id]
      );

      return res.status(400).json({
        error: '매도 주문 실행 실패',
        message: tradeError.message,
      });
    }
  } catch (error) {
    console.error('창업자 매도 요청 승인 오류:', error);
    res.status(500).json({ error: '창업자 매도 요청 승인 실패' });
  }
});

// 창업자 매도 요청 거부 (관리자)
router.post('/:id/reject', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_comment } = req.body;
    const adminId = (req.session as any).adminId;

    if (!admin_comment) {
      return res.status(400).json({ error: '거부 사유를 입력해주세요' });
    }

    // 요청 조회
    const requests = await query(
      'SELECT * FROM founder_sell_requests WHERE id = ? AND status = "PENDING"',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: '대기 중인 매도 요청을 찾을 수 없습니다' });
    }

    // 요청 상태 업데이트
    await query(
      `UPDATE founder_sell_requests
       SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW(), admin_comment = ?
       WHERE id = ?`,
      [adminId, admin_comment, id]
    );

    res.json({
      success: true,
      message: '창업자 매도 요청이 거부되었습니다',
    });
  } catch (error) {
    console.error('창업자 매도 요청 거부 오류:', error);
    res.status(500).json({ error: '창업자 매도 요청 거부 실패' });
  }
});

export default router;
