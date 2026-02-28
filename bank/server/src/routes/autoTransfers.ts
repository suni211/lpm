import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 자동 이체 규칙 목록
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const rules = await query(
      `SELECT atr.*, a.account_number as from_account_number
       FROM auto_transfer_rules atr
       JOIN accounts a ON atr.from_account_id = a.id
       WHERE atr.user_id = ?
       ORDER BY atr.created_at DESC`,
      [req.session.userId]
    );

    res.json({ rules });
  } catch (error) {
    console.error('자동 이체 규칙 조회 오류:', error);
    res.status(500).json({ error: '자동 이체 규칙 조회 실패' });
  }
});

// 자동 이체 규칙 생성
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { from_account_id, to_account_number, amount, frequency, day_of_week, day_of_month, notes } = req.body;

    if (!from_account_id || !to_account_number || !amount || !frequency) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 계좌 소유권 확인
    const accounts = await query('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [
      from_account_id,
      req.session.userId,
    ]);

    if (accounts.length === 0) {
      return res.status(403).json({ error: '계좌 소유권이 없습니다' });
    }

    // 다음 실행 날짜 계산
    const today = new Date();
    let nextExecution = new Date();

    if (frequency === 'DAILY') {
      nextExecution.setDate(today.getDate() + 1);
    } else if (frequency === 'WEEKLY') {
      const daysUntilNext = (day_of_week - today.getDay() + 7) % 7 || 7;
      nextExecution.setDate(today.getDate() + daysUntilNext);
    } else if (frequency === 'MONTHLY') {
      nextExecution.setMonth(today.getMonth() + 1);
      nextExecution.setDate(day_of_month || 1);
    }

    const ruleId = uuidv4();
    await query(
      `INSERT INTO auto_transfer_rules
       (id, user_id, from_account_id, to_account_number, amount, frequency, day_of_week, day_of_month, next_execution_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ruleId, req.session.userId, from_account_id, to_account_number, amount, frequency, day_of_week || null, day_of_month || null, nextExecution, notes || null]
    );

    const rules = await query('SELECT * FROM auto_transfer_rules WHERE id = ?', [ruleId]);

    res.status(201).json({ success: true, rule: rules[0] });
  } catch (error) {
    console.error('자동 이체 규칙 생성 오류:', error);
    res.status(500).json({ error: '자동 이체 규칙 생성 실패' });
  }
});

// 자동 이체 규칙 수정
router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, frequency, day_of_week, day_of_month, is_active, notes } = req.body;

    // 소유권 확인
    const rules = await query('SELECT * FROM auto_transfer_rules WHERE id = ? AND user_id = ?', [
      id,
      req.session.userId,
    ]);

    if (rules.length === 0) {
      return res.status(404).json({ error: '규칙을 찾을 수 없습니다' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (amount !== undefined) {
      updates.push('amount = ?');
      params.push(amount);
    }
    if (frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(frequency);
    }
    if (day_of_week !== undefined) {
      updates.push('day_of_week = ?');
      params.push(day_of_week);
    }
    if (day_of_month !== undefined) {
      updates.push('day_of_month = ?');
      params.push(day_of_month);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '업데이트할 필드가 없습니다' });
    }

    params.push(id);
    await query(`UPDATE auto_transfer_rules SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await query('SELECT * FROM auto_transfer_rules WHERE id = ?', [id]);

    res.json({ success: true, rule: updated[0] });
  } catch (error) {
    console.error('자동 이체 규칙 수정 오류:', error);
    res.status(500).json({ error: '자동 이체 규칙 수정 실패' });
  }
});

// 자동 이체 규칙 삭제
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM auto_transfer_rules WHERE id = ? AND user_id = ?', [id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('자동 이체 규칙 삭제 오류:', error);
    res.status(500).json({ error: '자동 이체 규칙 삭제 실패' });
  }
});

export default router;

