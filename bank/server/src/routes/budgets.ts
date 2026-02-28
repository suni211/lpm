import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 예산 목록
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { month_year } = req.query;

    let sql = `SELECT b.*, a.account_number
               FROM budgets b
               JOIN accounts a ON b.account_id = a.id
               WHERE b.user_id = ?`;
    const params: any[] = [req.session.userId];

    if (month_year) {
      sql += ' AND b.month_year = ?';
      params.push(month_year);
    } else {
      // 현재 월 기본
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      sql += ' AND b.month_year = ?';
      params.push(currentMonth);
    }

    sql += ' ORDER BY b.created_at DESC';

    const budgets = await query(sql, params);

    res.json({ budgets });
  } catch (error) {
    console.error('예산 조회 오류:', error);
    res.status(500).json({ error: '예산 조회 실패' });
  }
});

// 예산 생성/수정
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { account_id, category, monthly_limit, month_year } = req.body;

    if (!account_id || !category || !monthly_limit) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 계좌 소유권 확인
    const accounts = await query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [
      account_id,
      req.session.userId,
    ]);

    if (accounts.length === 0) {
      return res.status(403).json({ error: '계좌 소유권이 없습니다' });
    }

    const now = new Date();
    const targetMonth = month_year || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 기존 예산 확인
    const existing = await query(
      'SELECT * FROM budgets WHERE user_id = ? AND account_id = ? AND category = ? AND month_year = ?',
      [req.session.userId, account_id, category, targetMonth]
    );

    if (existing.length > 0) {
      // 업데이트
      await query(
        'UPDATE budgets SET monthly_limit = ? WHERE id = ?',
        [monthly_limit, existing[0].id]
      );

      const updated = await query('SELECT * FROM budgets WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, budget: updated[0] });
    } else {
      // 생성
      const budgetId = uuidv4();
      await query(
        `INSERT INTO budgets (id, user_id, account_id, category, monthly_limit, month_year)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [budgetId, req.session.userId, account_id, category, monthly_limit, targetMonth]
      );

      const budgets = await query('SELECT * FROM budgets WHERE id = ?', [budgetId]);
      return res.status(201).json({ success: true, budget: budgets[0] });
    }
  } catch (error) {
    console.error('예산 생성/수정 오류:', error);
    res.status(500).json({ error: '예산 생성/수정 실패' });
  }
});

// 예산 삭제
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('예산 삭제 오류:', error);
    res.status(500).json({ error: '예산 삭제 실패' });
  }
});

export default router;

