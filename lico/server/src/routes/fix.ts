import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 음수 잔액 수정 (관리자 전용)
router.post('/negative-balances', isAdmin, async (req: Request, res: Response) => {
  try {
    console.log('🔧 음수 잔액 수정 시작...');

    // 1. 현재 음수 잔액 확인
    const negativeBalances = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        c.symbol,
        ucb.available_amount,
        ucb.locked_amount,
        (ucb.available_amount + ucb.locked_amount) as total
      FROM user_coin_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN coins c ON ucb.coin_id = c.id
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
          `UPDATE user_coin_balances
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
          `UPDATE user_coin_balances
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
      FROM user_coin_balances
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
