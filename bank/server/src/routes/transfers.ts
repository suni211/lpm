import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import accountNumberService from '../services/accountNumberService';
import { createNotification } from './notifications';

const router = express.Router();

// 이체 신청 (간단한 버전 - account_id 사용)
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { from_account_id, to_account_number, amount, notes } = req.body;

    if (!from_account_id || !to_account_number || !amount) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 송신 계좌 조회 및 소유자 확인
    const fromAccounts = await query(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND status = "ACTIVE"',
      [from_account_id, req.session.userId]
    );

    if (fromAccounts.length === 0) {
      return res.status(404).json({ error: '송신 계좌를 찾을 수 없습니다' });
    }

    const fromAccount = fromAccounts[0];

    // 수신 계좌 조회
    const toAccounts = await query(
      'SELECT * FROM accounts WHERE account_number = ? AND status = "ACTIVE"',
      [to_account_number]
    );

    if (toAccounts.length === 0) {
      return res.status(404).json({ error: '수신 계좌를 찾을 수 없습니다' });
    }

    const toAccount = toAccounts[0];

    // 같은 계좌 확인
    if (fromAccount.id === toAccount.id) {
      return res.status(400).json({ error: '같은 계좌로 이체할 수 없습니다' });
    }

    // 잔액 확인
    if (fromAccount.balance < amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 이체 신청 생성
    const requestId = uuidv4();
    await query(
      `INSERT INTO transfer_requests (id, from_account_id, to_account_id, amount, fee, status, notes)
       VALUES (?, ?, ?, ?, 0, 'PENDING', ?)`,
      [requestId, fromAccount.id, toAccount.id, amount, notes || null]
    );

    const requests = await query(
      `SELECT tr.*,
              fu.minecraft_username as from_username, fa.account_number as from_account_number,
              tu.minecraft_username as to_username, ta.account_number as to_account_number
       FROM transfer_requests tr
       JOIN accounts fa ON tr.from_account_id = fa.id
       JOIN users fu ON fa.user_id = fu.id
       JOIN accounts ta ON tr.to_account_id = ta.id
       JOIN users tu ON ta.user_id = tu.id
       WHERE tr.id = ?`,
      [requestId]
    );

    res.json({
      success: true,
      request: requests[0],
    });
  } catch (error) {
    console.error('이체 신청 오류:', error);
    res.status(500).json({ error: '이체 신청 실패' });
  }
});

// 이체 신청 (상세 버전 - account_number 사용)
router.post('/request', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { from_account_number, to_account_number, amount } = req.body;

    // 송신 계좌 조회
    const fromAccount = await accountNumberService.getAccountByNumber(from_account_number);
    if (!fromAccount) {
      return res.status(404).json({ error: '송신 계좌를 찾을 수 없습니다' });
    }

    // 수신 계좌 조회
    const toAccount = await accountNumberService.getAccountByNumber(to_account_number);
    if (!toAccount) {
      return res.status(404).json({ error: '수신 계좌를 찾을 수 없습니다' });
    }

    // 같은 계좌 확인
    if (fromAccount.id === toAccount.id) {
      return res.status(400).json({ error: '같은 계좌로 이체할 수 없습니다' });
    }

    // 잔액 확인
    if (fromAccount.balance < amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 이체 신청 생성
    const requestId = uuidv4();
    await query(
      `INSERT INTO transfer_requests (id, from_account_id, to_account_id, amount, fee, status)
       VALUES (?, ?, ?, ?, 0, 'PENDING')`,
      [requestId, fromAccount.id, toAccount.id, amount]
    );

    const requests = await query(
      `SELECT tr.*,
              fu.minecraft_username as from_username, fa.account_number as from_account_number,
              tu.minecraft_username as to_username, ta.account_number as to_account_number
       FROM transfer_requests tr
       JOIN accounts fa ON tr.from_account_id = fa.id
       JOIN users fu ON fa.user_id = fu.id
       JOIN accounts ta ON tr.to_account_id = ta.id
       JOIN users tu ON ta.user_id = tu.id
       WHERE tr.id = ?`,
      [requestId]
    );

    res.json({
      success: true,
      request: requests[0],
    });
  } catch (error) {
    console.error('이체 신청 오류:', error);
    res.status(500).json({ error: '이체 신청 실패' });
  }
});

// 내 이체 신청 목록 (송신/수신)
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
      `SELECT tr.*,
              fu.minecraft_username as from_username, fa.account_number as from_account_number,
              tu.minecraft_username as to_username, ta.account_number as to_account_number
       FROM transfer_requests tr
       JOIN accounts fa ON tr.from_account_id = fa.id
       JOIN users fu ON fa.user_id = fu.id
       JOIN accounts ta ON tr.to_account_id = ta.id
       JOIN users tu ON ta.user_id = tu.id
       WHERE tr.from_account_id = ? OR tr.to_account_id = ?
       ORDER BY tr.requested_at DESC`,
      [accounts[0].id, accounts[0].id]
    );

    res.json({ requests, transfers: requests }); // 호환성을 위해 둘 다 반환
  } catch (error) {
    console.error('이체 신청 조회 오류:', error);
    res.status(500).json({ error: '이체 신청 조회 실패' });
  }
});

// 대기 중인 이체 신청 목록 (관리자)
router.get('/pending', isAdmin, async (req: Request, res: Response) => {
  try {
    const requests = await query(
      `SELECT tr.*,
              fu.minecraft_username as from_username, fa.account_number as from_account_number, fa.balance as from_balance,
              tu.minecraft_username as to_username, ta.account_number as to_account_number
       FROM transfer_requests tr
       JOIN accounts fa ON tr.from_account_id = fa.id
       JOIN users fu ON fa.user_id = fu.id
       JOIN accounts ta ON tr.to_account_id = ta.id
       JOIN users tu ON ta.user_id = tu.id
       WHERE tr.status = 'PENDING'
       ORDER BY tr.requested_at ASC`
    );

    res.json({ requests, transfers: requests }); // 호환성을 위해 둘 다 반환
  } catch (error) {
    console.error('대기 이체 조회 오류:', error);
    res.status(500).json({ error: '대기 이체 조회 실패' });
  }
});

// 이체 승인 (관리자)
router.post('/:id/approve', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // 이체 신청 조회
    const requests = await query(
      'SELECT * FROM transfer_requests WHERE id = ? AND status = "PENDING"',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: '이체 신청을 찾을 수 없습니다' });
    }

    const request = requests[0];

    // 송신 계좌 조회 및 잔액 확인
    const fromAccounts = await query('SELECT * FROM accounts WHERE id = ?', [request.from_account_id]);
    const fromAccount = fromAccounts[0];

    if (fromAccount.balance < request.amount) {
      return res.status(400).json({ error: '송신 계좌의 잔액이 부족합니다' });
    }

    const toAccounts = await query('SELECT * FROM accounts WHERE id = ?', [request.to_account_id]);
    const toAccount = toAccounts[0];

    // 송신 계좌 잔액 차감
    await query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [request.amount, fromAccount.id]
    );

    // 수신 계좌 잔액 증가
    await query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [request.amount, toAccount.id]
    );

    // 이체 신청 상태 업데이트
    await query(
      `UPDATE transfer_requests
       SET status = 'COMPLETED', processed_at = NOW(), processed_by = ?, notes = ?
       WHERE id = ?`,
      [req.session.adminId, notes || null, id]
    );

    // 거래 기록 생성 (송신)
    await query(
      `INSERT INTO transactions
       (id, transaction_type, account_id, related_account_id, amount, balance_before, balance_after, reference_id, reference_type, processed_by, notes)
       VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)`,
      [
        uuidv4(),
        fromAccount.id,
        toAccount.id,
        request.amount,
        fromAccount.balance,
        fromAccount.balance - request.amount,
        id,
        req.session.adminId,
        notes || null,
      ]
    );

    // 거래 기록 생성 (수신)
    const receiveTransactionId = uuidv4();
    await query(
      `INSERT INTO transactions
       (id, transaction_type, account_id, related_account_id, amount, balance_before, balance_after, reference_id, reference_type, processed_by, notes)
       VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?, ?, 'TRANSFER', ?, ?)`,
      [
        receiveTransactionId,
        toAccount.id,
        fromAccount.id,
        request.amount,
        toAccount.balance,
        toAccount.balance + request.amount,
        id,
        req.session.adminId,
        notes || null,
      ]
    );

    // 송신자에게 알림
    const fromUser = await query('SELECT user_id FROM accounts WHERE id = ?', [fromAccount.id]);
    if (fromUser[0]) {
      await createNotification(
        fromUser[0].user_id,
        'TRANSACTION',
        '이체 완료',
        `${request.amount.toLocaleString()} G를 ${toAccount.account_number}로 이체했습니다.`,
        uuidv4(),
        'TRANSFER'
      );
    }

    // 수신자에게 알림
    const toUser = await query('SELECT user_id FROM accounts WHERE id = ?', [toAccount.id]);
    if (toUser[0]) {
      await createNotification(
        toUser[0].user_id,
        'TRANSACTION',
        '이체 수신',
        `${request.amount.toLocaleString()} G가 ${fromAccount.account_number}에서 입금되었습니다.`,
        receiveTransactionId,
        'TRANSFER'
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('이체 승인 오류:', error);
    res.status(500).json({ error: '이체 승인 실패' });
  }
});

// 이체 거절 (관리자)
router.post('/:id/reject', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await query(
      `UPDATE transfer_requests
       SET status = 'REJECTED', processed_at = NOW(), processed_by = ?, notes = ?
       WHERE id = ? AND status = 'PENDING'`,
      [req.session.adminId, notes || null, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('이체 거절 오류:', error);
    res.status(500).json({ error: '이체 거절 실패' });
  }
});

export default router;
