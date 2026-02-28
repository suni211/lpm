import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 관리자 대시보드 통계
router.get('/dashboard', isAdmin, async (req: Request, res: Response) => {
  try {
    // 전체 사용자 수
    const usersCount = await query('SELECT COUNT(*) as count FROM users WHERE status = "ACTIVE"');
    
    // 전체 계좌 수
    const accountsCount = await query('SELECT COUNT(*) as count FROM accounts WHERE status = "ACTIVE"');
    
    // 전체 잔액
    const totalBalance = await query('SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE status = "ACTIVE"');
    
    // 대기 중인 요청
    const pendingDeposits = await query('SELECT COUNT(*) as count FROM deposit_requests WHERE status = "PENDING"');
    const pendingWithdrawals = await query('SELECT COUNT(*) as count FROM withdrawal_requests WHERE status = "PENDING"');
    const pendingTransfers = await query('SELECT COUNT(*) as count FROM transfer_requests WHERE status = "PENDING"');
    
    // 오늘 거래
    const todayTransactions = await query(
      'SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(created_at) = CURDATE()'
    );
    
    // 최근 거래 내역
    const recentTransactions = await query(
      `SELECT t.*, a.account_number, u.minecraft_username
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN users u ON a.user_id = u.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );
    
    // 최근 가입자
    const recentUsers = await query(
      `SELECT u.*, COUNT(a.id) as account_count
       FROM users u
       LEFT JOIN accounts a ON u.id = a.user_id
       WHERE u.status = "ACTIVE"
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        totalUsers: usersCount[0]?.count || 0,
        totalAccounts: accountsCount[0]?.count || 0,
        totalBalance: totalBalance[0]?.total || 0,
        pendingRequests: {
          deposits: pendingDeposits[0]?.count || 0,
          withdrawals: pendingWithdrawals[0]?.count || 0,
          transfers: pendingTransfers[0]?.count || 0,
        },
        todayTransactions: {
          count: todayTransactions[0]?.count || 0,
          total: todayTransactions[0]?.total || 0,
        },
      },
      recentTransactions,
      recentUsers,
    });
  } catch (error) {
    console.error('관리자 대시보드 조회 오류:', error);
    res.status(500).json({ error: '관리자 대시보드 조회 실패' });
  }
});

// 전체 거래 내역 (관리자)
router.get('/transactions', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, type, account_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT t.*, a.account_number, u.minecraft_username
               FROM transactions t
               JOIN accounts a ON t.account_id = a.id
               JOIN users u ON a.user_id = u.id`;
    const params: any[] = [];

    const conditions: string[] = [];
    if (type) {
      conditions.push('t.transaction_type = ?');
      params.push(type);
    }
    if (account_id) {
      conditions.push('t.account_id = ?');
      params.push(account_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const transactions = await query(sql, params);
    const totalResult = await query('SELECT COUNT(*) as total FROM transactions');

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

// 전체 계좌 목록 (관리자)
router.get('/accounts', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status, account_type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT a.*, u.username, u.minecraft_username, u.email
               FROM accounts a
               JOIN users u ON a.user_id = u.id`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (account_type) {
      conditions.push('a.account_type = ?');
      params.push(account_type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const accounts = await query(sql, params);
    const totalResult = await query('SELECT COUNT(*) as total FROM accounts');

    res.json({
      accounts,
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('계좌 목록 조회 오류:', error);
    res.status(500).json({ error: '계좌 목록 조회 실패' });
  }
});

// 전체 사용자 목록 (관리자)
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT u.*, COUNT(a.id) as account_count, COALESCE(SUM(a.balance), 0) as total_balance
               FROM users u
               LEFT JOIN accounts a ON u.id = a.user_id AND a.status = "ACTIVE"
               GROUP BY u.id`;
    const params: any[] = [];

    if (status) {
      sql = `SELECT u.*, COUNT(a.id) as account_count, COALESCE(SUM(a.balance), 0) as total_balance
             FROM users u
             LEFT JOIN accounts a ON u.id = a.user_id AND a.status = "ACTIVE"
             WHERE u.status = ?
             GROUP BY u.id`;
      params.push(status);
    }

    sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const users = await query(sql, params);
    const totalResult = await query('SELECT COUNT(*) as total FROM users');

    res.json({
      users,
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '사용자 목록 조회 실패' });
  }
});

export default router;

