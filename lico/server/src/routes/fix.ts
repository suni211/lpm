import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 음수 잔액 확인 (관리자 전용)
router.get('/negative-balances', isAdmin, async (req: Request, res: Response) => {
  try {
    const negativeBalances = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        s.symbol,
        ucb.available_amount,
        ucb.locked_amount,
        (ucb.available_amount + ucb.locked_amount) as total
      FROM user_stock_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN stocks s ON ucb.stock_id = s.id
      WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0
    `);

    res.json({
      count: negativeBalances.length,
      balances: negativeBalances,
    });
  } catch (error: any) {
    console.error('음수 잔액 조회 오류:', error);
    res.status(500).json({ error: '조회 실패', message: error.message });
  }
});

// locked 잔액을 available로 병합 (관리자 전용)
router.post('/merge-locked-balances', isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔧 locked 잔액을 available로 병합 시작...');

    // 1. locked가 있는 모든 잔액 조회
    const lockedBalances = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        s.symbol,
        ucb.available_amount,
        ucb.locked_amount,
        (ucb.available_amount + ucb.locked_amount) as total
      FROM user_stock_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN stocks s ON ucb.stock_id = s.id
      WHERE ucb.locked_amount > 0
    `);

    if (lockedBalances.length === 0) {
      return res.json({
        success: true,
        message: 'locked 잔액이 없습니다',
        merged: [],
      });
    }

    const merged = [];

    // 2. 각 locked 잔액을 available로 병합
    for (const balance of lockedBalances) {
      const available = parseFloat(balance.available_amount || 0);
      const locked = parseFloat(balance.locked_amount || 0);
      const total = available + locked;

      const before = {
        username: balance.minecraft_username,
        symbol: balance.symbol,
        available,
        locked,
      };

      // locked를 available로 병합
      await query(
        `UPDATE user_stock_balances
         SET available_amount = ?,
             locked_amount = 0
         WHERE id = ?`,
        [total, balance.id]
      );

      merged.push({
        ...before,
        after: { available: total, locked: 0 },
      });
    }

    // 3. 병합 후 확인
    const remainingLocked = await query(`
      SELECT COUNT(*) as count
      FROM user_stock_balances
      WHERE locked_amount > 0
    `);

    res.json({
      success: true,
      message: `${merged.length}개의 locked 잔액을 available로 병합했습니다`,
      merged,
      remaining: remainingLocked[0].count,
    });
  } catch (error: any) {
    console.error('locked 잔액 병합 오류:', error);
    res.status(500).json({ error: '병합 실패', message: error.message });
  }
});

// 음수 잔액 수정 (관리자 전용)
router.post('/negative-balances', isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔧 음수 잔액 수정 시작...');

    // 1. 현재 음수 잔액 확인
    const negativeBalances = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        s.symbol,
        ucb.available_amount,
        ucb.locked_amount,
        (ucb.available_amount + ucb.locked_amount) as total
      FROM user_stock_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN stocks s ON ucb.stock_id = s.id
      WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0
    `);

    if (negativeBalances.length === 0) {
      return res.json({
        success: true,
        message: '음수 잔액이 없습니다',
        fixed: [],
      });
    }

    const fixed = [];

    // 2. 각 음수 잔액 수정
    for (const balance of negativeBalances) {
      const available = parseFloat(balance.available_amount || 0);
      const locked = parseFloat(balance.locked_amount || 0);
      const total = available + locked;

      const before = {
        username: balance.minecraft_username,
        symbol: balance.symbol,
        available,
        locked,
        total,
      };

      if (total >= 0) {
        // 총합이 양수면 locked를 available로 옮기기
        await query(
          `UPDATE user_stock_balances
           SET available_amount = ?,
               locked_amount = 0
           WHERE id = ?`,
          [total, balance.id]
        );

        fixed.push({
          ...before,
          after: { available: total, locked: 0 },
          action: 'merged',
        });
      } else {
        // 총합이 음수면 모두 0으로
        await query(
          `UPDATE user_stock_balances
           SET available_amount = 0,
               locked_amount = 0
           WHERE id = ?`,
          [balance.id]
        );

        fixed.push({
          ...before,
          after: { available: 0, locked: 0 },
          action: 'reset_to_zero',
        });
      }
    }

    // 3. 수정 후 확인
    const remainingNegative = await query(`
      SELECT COUNT(*) as count
      FROM user_stock_balances
      WHERE available_amount < 0 OR locked_amount < 0
    `);

    res.json({
      success: true,
      message: `${fixed.length}개의 음수 잔액을 수정했습니다`,
      fixed,
      remaining: remainingNegative[0].count,
    });
  } catch (error: any) {
    console.error('음수 잔액 수정 오류:', error);
    res.status(500).json({ error: '수정 실패', message: error.message });
  }
});

export default router;
