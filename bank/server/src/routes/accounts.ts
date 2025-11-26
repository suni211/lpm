import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin, isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 내 계좌 조회 (로그인 사용자)
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const accounts = await query(
      `SELECT a.*, u.username, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = ?`,
      [req.session.userId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({ account: accounts[0] });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 계좌 조회 (계좌번호)
router.get('/number/:accountNumber', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const accounts = await query(
      `SELECT a.*, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.account_number = ? AND a.status = 'ACTIVE'`,
      [accountNumber]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({ account: accounts[0] });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 계좌 조회 (마인크래프트 닉네임)
router.get('/minecraft/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const accounts = await query(
      `SELECT a.*, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE u.minecraft_username = ? AND a.status = 'ACTIVE'`,
      [username]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({ account: accounts[0] });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 잔액 조회
router.get('/:accountNumber/balance', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const accounts = await query(
      'SELECT balance FROM accounts WHERE account_number = ? AND status = ?',
      [accountNumber, 'ACTIVE']
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    // 계좌번호 마스킹 (1234-****-****-3456)
    const maskedNumber = accountNumber.split('-').map((part: string, idx: number) =>
      idx === 0 || idx === 3 ? part : '****'
    ).join('-');

    res.json({
      account_number: maskedNumber,
      balance: accounts[0].balance,
    });
  } catch (error) {
    console.error('잔액 조회 오류:', error);
    res.status(500).json({ error: '잔액 조회 실패' });
  }
});

// 전체 계좌 목록 (관리자)
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT a.*, u.username, u.minecraft_username, u.email
               FROM accounts a
               JOIN users u ON a.user_id = u.id`;
    const params: any[] = [];

    if (status) {
      sql += ' WHERE a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const accounts = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as total FROM accounts');

    res.json({
      accounts,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('계좌 목록 조회 오류:', error);
    res.status(500).json({ error: '계좌 목록 조회 실패' });
  }
});

// 계좌 상태 변경 (관리자)
router.patch('/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태값입니다' });
    }

    await query('UPDATE accounts SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('계좌 상태 변경 오류:', error);
    res.status(500).json({ error: '계좌 상태 변경 실패' });
  }
});

export default router;
