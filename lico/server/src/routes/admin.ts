import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 관리자 대시보드 통계
router.get('/dashboard', isAdmin, async (req: Request, res: Response) => {
  try {
    // 전체 사용자 수
    const usersCount = await query('SELECT COUNT(*) as count FROM user_wallets WHERE status = "ACTIVE"');
    
    // 전체 코인 수
    const coinsCount = await query('SELECT COUNT(*) as count FROM coins WHERE status = "ACTIVE"');
    
    // 전체 Gold 잔액
    const totalGold = await query('SELECT COALESCE(SUM(gold_balance), 0) as total FROM user_wallets WHERE status = "ACTIVE"');
    
    // 오늘 거래량
    const todayTrades = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
       FROM trades
       WHERE DATE(created_at) = CURDATE()`
    );
    
    // 최근 거래 내역
    const recentTrades = await query(
      `SELECT t.*, c.symbol, c.name,
              bw.minecraft_username as buyer_username,
              sw.minecraft_username as seller_username
       FROM trades t
       JOIN coins c ON t.coin_id = c.id
       JOIN user_wallets bw ON t.buyer_wallet_id = bw.id
       JOIN user_wallets sw ON t.seller_wallet_id = sw.id
       ORDER BY t.created_at DESC
       LIMIT 20`
    );
    
    // 최근 가입자
    const recentUsers = await query(
      `SELECT * FROM user_wallets
       WHERE status = "ACTIVE"
       ORDER BY created_at DESC
       LIMIT 10`
    );

    res.json({
      stats: {
        totalUsers: usersCount[0]?.count || 0,
        totalCoins: coinsCount[0]?.count || 0,
        totalGold: totalGold[0]?.total || 0,
        todayTrades: {
          count: todayTrades[0]?.count || 0,
          total: todayTrades[0]?.total || 0,
        },
      },
      recentTrades,
      recentUsers,
    });
  } catch (error) {
    console.error('관리자 대시보드 조회 오류:', error);
    res.status(500).json({ error: '관리자 대시보드 조회 실패' });
  }
});

// 전체 사용자 목록 (관리자)
router.get('/users', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT w.*, 
               COALESCE(SUM(ucb.total_amount * c.current_price), 0) as total_coin_value,
               COUNT(DISTINCT ucb.coin_id) as coin_count
               FROM user_wallets w
               LEFT JOIN user_coin_balances ucb ON w.id = ucb.wallet_id
               LEFT JOIN coins c ON ucb.coin_id = c.id`;
    const params: any[] = [];

    if (status) {
      sql += ' WHERE w.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY w.id ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const users = await query(sql, params);
    const totalResult = await query('SELECT COUNT(*) as total FROM user_wallets');

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

// 사용자 상태 변경 (관리자)
router.patch('/users/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태값입니다' });
    }

    await query('UPDATE user_wallets SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('사용자 상태 변경 오류:', error);
    res.status(500).json({ error: '사용자 상태 변경 실패' });
  }
});

// 전체 거래 내역 (관리자)
router.get('/trades', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 50, coin_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT t.*, c.symbol, c.name,
               bw.minecraft_username as buyer_username,
               sw.minecraft_username as seller_username
               FROM trades t
               JOIN coins c ON t.coin_id = c.id
               JOIN user_wallets bw ON t.buyer_wallet_id = bw.id
               JOIN user_wallets sw ON t.seller_wallet_id = sw.id`;
    const params: any[] = [];

    if (coin_id) {
      sql += ' WHERE t.coin_id = ?';
      params.push(coin_id);
    }

    sql += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const trades = await query(sql, params);
    const totalResult = await query('SELECT COUNT(*) as total FROM trades');

    res.json({
      trades,
      total: totalResult[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
});

// 코인별 가격 변동 그래프 데이터 (관리자)
router.get('/coins/:coin_id/price-history', isAdmin, async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { interval = '1h', limit = 100 } = req.query;

    let tableName = '';
    if (interval === '1m') {
      tableName = 'candles_1m';
    } else if (interval === '1h') {
      tableName = 'candles_1h';
    } else if (interval === '1d') {
      tableName = 'candles_1d';
    } else {
      return res.status(400).json({ error: '유효하지 않은 interval (1m, 1h, 1d만 지원)' });
    }

    const candles = await query(
      `SELECT * FROM ${tableName}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    res.json({ candles: candles.reverse() });
  } catch (error) {
    console.error('가격 변동 그래프 조회 오류:', error);
    res.status(500).json({ error: '가격 변동 그래프 조회 실패' });
  }
});

export default router;

