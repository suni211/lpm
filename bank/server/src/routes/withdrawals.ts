import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import { createNotification } from './notifications';

const router = express.Router();

// 출금 신청 (간단한 버전 - account_id 사용)
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { account_id, amount } = req.body;

    if (!account_id || !amount) {
      return res.status(400).json({ error: '계좌 ID와 금액을 입력해주세요' });
    }

    // 계좌 조회 및 소유자 확인
    const accounts = await query(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND status = "ACTIVE"',
      [account_id, req.session.userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    const account = accounts[0];

    // 잔액 확인
    if (account.balance < amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 출금 신청 생성
    const requestId = uuidv4();
    await query(
      `INSERT INTO withdrawal_requests (id, account_id, amount, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [requestId, account.id, amount]
    );

    const requests = await query('SELECT * FROM withdrawal_requests WHERE id = ?', [requestId]);

    res.json({
      success: true,
      request: requests[0],
    });
  } catch (error) {
    console.error('출금 신청 오류:', error);
    res.status(500).json({ error: '출금 신청 실패' });
  }
});

// 출금 신청 (상세 버전 - account_number 사용)
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { account_number, amount } = req.body;

    // 계좌 조회
    const accounts = await query(
      'SELECT * FROM accounts WHERE account_number = ? AND status = "ACTIVE"',
      [account_number]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    const account = accounts[0];

    // 잔액 확인
    if (account.balance < amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 출금 신청 생성
    const requestId = uuidv4();
    await query(
      `INSERT INTO withdrawal_requests (id, account_id, amount, status)
       VALUES (?, ?, ?, 'PENDING')`,
      [requestId, account.id, amount]
    );

    const requests = await query('SELECT * FROM withdrawal_requests WHERE id = ?', [requestId]);

    res.json({
      success: true,
      request: requests[0],
    });
  } catch (error) {
    console.error('출금 신청 오류:', error);
    res.status(500).json({ error: '출금 신청 실패' });
  }
});

// 내 출금 신청 목록
router.get('/my/:account_number', async (req: Request, res: Response) => {
  try {
    const { account_number } = req.params;

    const accounts = await query(
      'SELECT id FROM accounts WHERE account_number = ?',
      [account_number]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    const requests = await query(
      `SELECT wr.*, u.minecraft_username, a.account_number
       FROM withdrawal_requests wr
       JOIN accounts a ON wr.account_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE wr.account_id = ?
       ORDER BY wr.requested_at DESC`,
      [accounts[0].id]
    );

    res.json({ requests, withdrawals: requests }); // 호환성을 위해 둘 다 반환
  } catch (error) {
    console.error('출금 신청 조회 오류:', error);
    res.status(500).json({ error: '출금 신청 조회 실패' });
  }
});

// 대기 중인 출금 신청 목록 (관리자)
router.get('/pending', isAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await query(
      `SELECT wr.*, u.minecraft_username, a.account_number, a.balance
       FROM withdrawal_requests wr
       JOIN accounts a ON wr.account_id = a.id
       JOIN users u ON a.user_id = u.id
       WHERE wr.status = 'PENDING'
       ORDER BY wr.requested_at ASC`
    );

    res.json({ requests, withdrawals: requests }); // 호환성을 위해 둘 다 반환
  } catch (error) {
    console.error('대기 출금 조회 오류:', error);
    res.status(500).json({ error: '대기 출금 조회 실패' });
  }
});

// 출금 승인 (관리자)
router.post('/:id/approve', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // 출금 신청 조회
    const requests = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? AND status = "PENDING"',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: '출금 신청을 찾을 수 없습니다' });
    }

    const request = requests[0];

    // 계좌 조회 및 잔액 확인
    const accounts = await query('SELECT * FROM accounts WHERE id = ?', [request.account_id]);
    const account = accounts[0];

    if (account.balance < request.amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 계좌 잔액 차감
    await query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [request.amount, request.account_id]
    );

    // 출금 신청 상태 업데이트
    await query(
      `UPDATE withdrawal_requests
       SET status = 'COMPLETED', processed_at = NOW(), processed_by = ?, notes = ?
       WHERE id = ?`,
      [req.session.adminId, notes || null, id]
    );

    // 거래 기록 생성
    const transactionId = uuidv4();
    await query(
      `INSERT INTO transactions
       (id, transaction_type, account_id, amount, balance_before, balance_after, reference_id, reference_type, processed_by, notes)
       VALUES (?, 'WITHDRAWAL', ?, ?, ?, ?, ?, 'WITHDRAWAL', ?, ?)`,
      [
        transactionId,
        request.account_id,
        request.amount,
        account.balance,
        account.balance - request.amount,
        id,
        req.session.adminId,
        notes || null,
      ]
    );

    // 사용자에게 알림 전송
    const user = await query('SELECT user_id FROM accounts WHERE id = ?', [request.account_id]);
    if (user[0]) {
      await createNotification(
        user[0].user_id,
        'TRANSACTION',
        '출금 완료',
        `${request.amount.toLocaleString()} G가 출금되었습니다.`,
        transactionId,
        'WITHDRAWAL'
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('출금 승인 오류:', error);
    res.status(500).json({ error: '출금 승인 실패' });
  }
});

// 출금 거절 (관리자)
router.post('/:id/reject', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await query(
      `UPDATE withdrawal_requests
       SET status = 'REJECTED', processed_at = NOW(), processed_by = ?, notes = ?
       WHERE id = ? AND status = 'PENDING'`,
      [req.session.adminId, notes || null, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('출금 거절 오류:', error);
    res.status(500).json({ error: '출금 거절 실패' });
  }
});

export default router;
