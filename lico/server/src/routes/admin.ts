import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 관리자 대시보드 통계
router.get('/dashboard', isAdmin, async (req: Request, res: Response) => {
  try {
    // 전체 사용자 수
    const usersCount = await query('SELECT COUNT(*) as count FROM user_wallets WHERE status = "ACTIVE"');
    
    // 전체 주식 수
    const stocksCount = await query('SELECT COUNT(*) as count FROM stocks WHERE status = "ACTIVE"');
    
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
      `SELECT t.*, s.symbol, s.name,
              bw.minecraft_username as buyer_username,
              sw.minecraft_username as seller_username
       FROM trades t
       JOIN stocks s ON t.stock_id = s.id
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
        totalStocks: stocksCount[0]?.count || 0,
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
               COALESCE(SUM(ucb.total_amount * s.current_price), 0) as total_stock_value,
               COUNT(DISTINCT ucb.stock_id) as stock_count
               FROM user_wallets w
               LEFT JOIN user_stock_balances ucb ON w.id = ucb.wallet_id
               LEFT JOIN stocks s ON ucb.stock_id = s.id`;
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
    const { page = 1, limit = 50, stock_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT t.*, s.symbol, s.name,
               bw.minecraft_username as buyer_username,
               sw.minecraft_username as seller_username
               FROM trades t
               JOIN stocks s ON t.stock_id = s.id
               JOIN user_wallets bw ON t.buyer_wallet_id = bw.id
               JOIN user_wallets sw ON t.seller_wallet_id = sw.id`;
    const params: any[] = [];

    if (stock_id) {
      sql += ' WHERE t.stock_id = ?';
      params.push(stock_id);
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

// 주식별 가격 변동 그래프 데이터 (관리자)
router.get('/stocks/:stock_id/price-history', isAdmin, async (req: Request, res: Response) => {
  try {
    const { stock_id } = req.params;
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
       WHERE stock_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [stock_id, Number(limit)]
    );

    res.json({ candles: candles.reverse() });
  } catch (error) {
    console.error('가격 변동 그래프 조회 오류:', error);
    res.status(500).json({ error: '가격 변동 그래프 조회 실패' });
  }
});

// 거래 데이터 초기화 (관리자 전용)
router.post('/reset-trading-data', isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔧 거래 데이터 초기화 시작...');

    // 초기화 전 데이터 확인
    const beforeStats = {
      trades: await query('SELECT COUNT(*) as count FROM trades'),
      orders: await query('SELECT COUNT(*) as count FROM orders'),
      balances: await query('SELECT COUNT(*) as count FROM user_stock_balances'),
      wallets: await query('SELECT COUNT(*) as count FROM user_wallets'),
    };

    console.log('📊 초기화 전 데이터:', {
      trades: beforeStats.trades[0].count,
      orders: beforeStats.orders[0].count,
      balances: beforeStats.balances[0].count,
      wallets: beforeStats.wallets[0].count,
    });

    // 1. 거래 내역 삭제
    await query('TRUNCATE TABLE trades');
    console.log('✓ trades 테이블 초기화 완료');

    // 2. 주문 삭제
    await query('TRUNCATE TABLE orders');
    console.log('✓ orders 테이블 초기화 완료');

    // 3. 사용자 주식 잔액 삭제
    await query('TRUNCATE TABLE user_stock_balances');
    console.log('✓ user_stock_balances 테이블 초기화 완료');

    // 4. 캔들 데이터 삭제
    await query('TRUNCATE TABLE candles_1m');
    await query('TRUNCATE TABLE candles_1h');
    await query('TRUNCATE TABLE candles_1d');
    console.log('✓ 캔들 데이터 초기화 완료');

    // 5. AI 로그 삭제
    await query('TRUNCATE TABLE ai_trade_logs');
    console.log('✓ AI 로그 초기화 완료');

    // 6. 주식 가격 초기화
    await query(`
      UPDATE stocks
      SET current_price = initial_price,
          price_change_24h = 0,
          volume_24h = 0,
          market_cap = initial_price * circulating_supply
      WHERE status = 'ACTIVE'
    `);
    console.log('✓ 주식 가격 초기화 완료');

    // 7. AI 봇 지갑 찾기
    const aiWallet = await query(
      "SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT' LIMIT 1"
    );

    if (aiWallet.length > 0) {
      const aiWalletId = aiWallet[0].id;

      // AI 봇의 기존 잔액 삭제
      await query('DELETE FROM user_stock_balances WHERE wallet_id = ?', [aiWalletId]);

      // 각 주식마다 AI 봇에게 전체 발행량 재배포
      await query(`
        INSERT INTO user_stock_balances (id, wallet_id, stock_id, available_amount, locked_amount, average_buy_price)
        SELECT
          UUID(),
          ?,
          id,
          circulating_supply,
          0,
          initial_price
        FROM stocks
        WHERE status = 'ACTIVE'
      `, [aiWalletId]);

      console.log('✓ AI 봇 주식 재배포 완료');
    }

    // 초기화 후 데이터 확인
    const afterStats = {
      trades: await query('SELECT COUNT(*) as count FROM trades'),
      orders: await query('SELECT COUNT(*) as count FROM orders'),
      balances: await query('SELECT COUNT(*) as count FROM user_stock_balances'),
      wallets: await query('SELECT COUNT(*) as count FROM user_wallets'),
      stocks: await query('SELECT COUNT(*) as count FROM stocks WHERE status = "ACTIVE"'),
    };

    console.log('📊 초기화 후 데이터:', {
      trades: afterStats.trades[0].count,
      orders: afterStats.orders[0].count,
      balances: afterStats.balances[0].count,
      wallets: afterStats.wallets[0].count,
      stocks: afterStats.stocks[0].count,
    });

    res.json({
      success: true,
      message: '✅ LICO 거래 데이터 초기화 완료!',
      note: '⚠️ 유저 지갑은 유지되었습니다 (Gold 잔액 포함)',
      before: {
        trades: beforeStats.trades[0].count,
        orders: beforeStats.orders[0].count,
        balances: beforeStats.balances[0].count,
        wallets: beforeStats.wallets[0].count,
      },
      after: {
        trades: afterStats.trades[0].count,
        orders: afterStats.orders[0].count,
        balances: afterStats.balances[0].count,
        wallets: afterStats.wallets[0].count,
        activeStocks: afterStats.stocks[0].count,
      },
    });
  } catch (error: any) {
    console.error('❌ 거래 데이터 초기화 오류:', error);
    res.status(500).json({
      error: '거래 데이터 초기화 실패',
      message: error.message,
    });
  }
});

export default router;

