import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 내 거래 내역 (로그인 사용자)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, type, account_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 사용자의 모든 계좌 ID 조회
    const accounts = await query('SELECT id FROM accounts WHERE user_id = ?', [req.session.userId]);
    const accountIds = accounts.map((a: any) => a.id);

    if (accountIds.length === 0) {
      return res.json({ transactions: [], total: 0, page: Number(page), limit: Number(limit) });
    }

    const placeholders = accountIds.map(() => '?').join(',');

    let sql = `SELECT t.*, a.account_number
               FROM transactions t
               JOIN accounts a ON t.account_id = a.id
               WHERE t.account_id IN (${placeholders})`;
    const params: any[] = [...accountIds];

    if (type) {
      sql += ' AND t.transaction_type = ?';
      params.push(type);
    }
    if (account_id) {
      sql += ' AND t.account_id = ?';
      params.push(account_id);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const transactions = await query(sql, params);
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM transactions WHERE account_id IN (${placeholders})`,
      accountIds
    );

    res.json({
      transactions,
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
});

// 내 거래 내역 (계좌번호로 - 레거시)
router.get('/my/:account_number', async (req: Request, res: Response) => {
  try {
    const { account_number } = req.params;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 계좌 조회
    const accounts = await query(
      'SELECT id FROM accounts WHERE account_number = ?',
      [account_number]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    let sql = `
      SELECT t.*,
             a.minecraft_username, a.account_number,
             ra.minecraft_username as related_username, ra.account_number as related_account_number
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts ra ON t.related_account_id = ra.id
      WHERE t.account_id = ?
    `;
    const params: any[] = [accounts[0].id];

    if (type) {
      sql += ' AND t.transaction_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const transactions = await query(sql, params);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM transactions WHERE account_id = ?',
      [accounts[0].id]
    );

    res.json({
      transactions,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
});

// 최근 거래 내역 (공개 - 마인크래프트 닉네임만)
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const transactions = await query(
      `SELECT t.transaction_type, t.amount, t.created_at,
              a.minecraft_username
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       ORDER BY t.created_at DESC
       LIMIT ?`,
      [Number(limit)]
    );

    res.json({ transactions });
  } catch (error) {
    console.error('최근 거래 조회 오류:', error);
    res.status(500).json({ error: '최근 거래 조회 실패' });
  }
});

// 전체 거래 내역 (관리자)
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `
      SELECT t.*,
             a.minecraft_username, a.account_number,
             ra.minecraft_username as related_username, ra.account_number as related_account_number
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      LEFT JOIN accounts ra ON t.related_account_id = ra.id
    `;
    const params: any[] = [];

    if (type) {
      sql += ' WHERE t.transaction_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const transactions = await query(sql, params);

    const countSql = type
      ? 'SELECT COUNT(*) as total FROM transactions WHERE transaction_type = ?'
      : 'SELECT COUNT(*) as total FROM transactions';
    const countResult = await query(countSql, type ? [type] : []);

    res.json({
      transactions,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('전체 거래 내역 조회 오류:', error);
    res.status(500).json({ error: '전체 거래 내역 조회 실패' });
  }
});

// 통계 (관리자)
router.get('/stats', isAdmin, async (req: Request, res: Response) => {
  try {
    // 오늘 거래 통계
    const todayStats = await query(`
      SELECT
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE DATE(created_at) = CURDATE()
      GROUP BY transaction_type
    `);

    // 총 잔액
    const balanceResult = await query(
      'SELECT SUM(balance) as total_balance FROM accounts WHERE status = "ACTIVE"'
    );

    // 활성 계좌 수
    const accountResult = await query(
      'SELECT COUNT(*) as active_accounts FROM accounts WHERE status = "ACTIVE"'
    );

    res.json({
      today_stats: todayStats,
      total_balance: balanceResult[0].total_balance || 0,
      active_accounts: accountResult[0].active_accounts,
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

export default router;
