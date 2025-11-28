import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 코인별 총 소각량 조회
router.get('/stats/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;

    // 코인 정보 조회
    const coins = await query('SELECT * FROM coins WHERE id = ?', [coin_id]);
    if (coins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }
    const coin = coins[0];

    // 소각 유형별 통계
    const burnStats = await query(`
      SELECT
        burn_type,
        COUNT(*) as burn_count,
        SUM(amount) as total_burned
      FROM coin_burn_logs
      WHERE coin_id = ?
      GROUP BY burn_type
    `, [coin_id]);

    // 전체 소각량
    const totalBurn = await query(`
      SELECT
        COUNT(*) as total_count,
        SUM(amount) as total_amount
      FROM coin_burn_logs
      WHERE coin_id = ?
    `, [coin_id]);

    // 최근 소각 내역 (10개)
    const recentBurns = await query(`
      SELECT *
      FROM coin_burn_logs
      WHERE coin_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [coin_id]);

    res.json({
      coin: {
        symbol: coin.symbol,
        name: coin.name,
        circulating_supply: coin.circulating_supply,
      },
      burn_stats: burnStats,
      total_burn: {
        count: totalBurn[0]?.total_count || 0,
        amount: totalBurn[0]?.total_amount || 0,
      },
      recent_burns: recentBurns,
    });

  } catch (error: any) {
    console.error('소각 통계 조회 오류:', error);
    res.status(500).json({ error: '소각 통계 조회 실패', message: error.message });
  }
});

// 전체 소각 내역 조회 (관리자 전용)
router.get('/logs', isAdmin, async (req: Request, res: Response) => {
  try {
    const { coin_id, burn_type, limit = 100, offset = 0 } = req.query;

    let sql = `
      SELECT bl.*, c.symbol, c.name
      FROM coin_burn_logs bl
      JOIN coins c ON bl.coin_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (coin_id) {
      sql += ' AND bl.coin_id = ?';
      params.push(coin_id);
    }

    if (burn_type) {
      sql += ' AND bl.burn_type = ?';
      params.push(burn_type);
    }

    sql += ' ORDER BY bl.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const logs = await query(sql, params);

    res.json({ logs });

  } catch (error: any) {
    console.error('소각 로그 조회 오류:', error);
    res.status(500).json({ error: '소각 로그 조회 실패', message: error.message });
  }
});

// 24시간 소각 통계
router.get('/stats-24h', async (req: Request, res: Response) => {
  try {
    const stats = await query(`
      SELECT
        c.symbol,
        c.name,
        COUNT(*) as burn_count,
        SUM(bl.amount) as total_burned
      FROM coin_burn_logs bl
      JOIN coins c ON bl.coin_id = c.id
      WHERE bl.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY bl.coin_id, c.symbol, c.name
      ORDER BY total_burned DESC
    `);

    res.json({ stats });

  } catch (error: any) {
    console.error('24시간 소각 통계 조회 오류:', error);
    res.status(500).json({ error: '24시간 소각 통계 조회 실패', message: error.message });
  }
});

export default router;
