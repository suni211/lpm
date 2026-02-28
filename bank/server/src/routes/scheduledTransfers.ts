import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 예약 이체 목록
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let sql = `SELECT st.*, a.account_number as from_account_number
               FROM scheduled_transfers st
               JOIN accounts a ON st.from_account_id = a.id
               WHERE st.user_id = ?`;
    const params: any[] = [req.session.userId];

    if (status) {
      sql += ' AND st.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY st.scheduled_date ASC';

    const transfers = await query(sql, params);

    res.json({ transfers });
  } catch (error) {
    console.error('예약 이체 조회 오류:', error);
    res.status(500).json({ error: '예약 이체 조회 실패' });
  }
});

// 예약 이체 생성
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { from_account_id, to_account_number, amount, scheduled_date, notes } = req.body;

    if (!from_account_id || !to_account_number || !amount || !scheduled_date) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 계좌 소유권 확인
    const accounts = await query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [
      from_account_id,
      req.session.userId,
    ]);

    if (accounts.length === 0) {
      return res.status(403).json({ error: '계좌 소유권이 없습니다' });
    }

    // 예약 날짜가 미래인지 확인
    const scheduled = new Date(scheduled_date);
    if (scheduled <= new Date()) {
      return res.status(400).json({ error: '예약 날짜는 미래여야 합니다' });
    }

    const transferId = uuidv4();
    await query(
      `INSERT INTO scheduled_transfers
       (id, user_id, from_account_id, to_account_number, amount, scheduled_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transferId, req.session.userId, from_account_id, to_account_number, amount, scheduled_date, notes || null]
    );

    const transfers = await query('SELECT * FROM scheduled_transfers WHERE id = ?', [transferId]);

    res.status(201).json({ success: true, transfer: transfers[0] });
  } catch (error) {
    console.error('예약 이체 생성 오류:', error);
    res.status(500).json({ error: '예약 이체 생성 실패' });
  }
});

// 예약 이체 취소
router.post('/:id/cancel', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 소유권 확인
    const transfers = await query('SELECT * FROM scheduled_transfers WHERE id = ? AND user_id = ?', [
      id,
      req.session.userId,
    ]);

    if (transfers.length === 0) {
      return res.status(404).json({ error: '예약 이체를 찾을 수 없습니다' });
    }

    if (transfers[0].status !== 'PENDING') {
      return res.status(400).json({ error: '이미 처리된 예약 이체는 취소할 수 없습니다' });
    }

    await query('UPDATE scheduled_transfers SET status = "CANCELLED" WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('예약 이체 취소 오류:', error);
    res.status(500).json({ error: '예약 이체 취소 실패' });
  }
});

export default router;

