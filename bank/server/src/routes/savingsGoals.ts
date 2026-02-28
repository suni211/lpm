import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 목표 저축 목록
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const goals = await query(
      `SELECT sg.*, a.account_number
       FROM savings_goals sg
       JOIN accounts a ON sg.account_id = a.id
       WHERE sg.user_id = ?
       ORDER BY sg.created_at DESC`,
      [req.session.userId]
    );

    res.json({ goals });
  } catch (error) {
    console.error('목표 저축 조회 오류:', error);
    res.status(500).json({ error: '목표 저축 조회 실패' });
  }
});

// 목표 저축 생성
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { account_id, title, target_amount, target_date } = req.body;

    if (!account_id || !title || !target_amount) {
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

    const goalId = uuidv4();
    await query(
      `INSERT INTO savings_goals (id, user_id, account_id, title, target_amount, target_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [goalId, req.session.userId, account_id, title, target_amount, target_date || null]
    );

    const goals = await query('SELECT * FROM savings_goals WHERE id = ?', [goalId]);

    res.status(201).json({ success: true, goal: goals[0] });
  } catch (error) {
    console.error('목표 저축 생성 오류:', error);
    res.status(500).json({ error: '목표 저축 생성 실패' });
  }
});

// 목표 저축 수정
router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, target_amount, target_date, current_amount } = req.body;

    // 소유권 확인
    const goals = await query('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?', [
      id,
      req.session.userId,
    ]);

    if (goals.length === 0) {
      return res.status(404).json({ error: '목표 저축을 찾을 수 없습니다' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (target_amount !== undefined) {
      updates.push('target_amount = ?');
      params.push(target_amount);
    }
    if (target_date !== undefined) {
      updates.push('target_date = ?');
      params.push(target_date);
    }
    if (current_amount !== undefined) {
      updates.push('current_amount = ?');
      params.push(current_amount);
    }

    // 목표 달성 체크
    if (current_amount !== undefined && target_amount !== undefined) {
      if (current_amount >= target_amount) {
        updates.push('is_completed = TRUE');
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '업데이트할 필드가 없습니다' });
    }

    params.push(id);
    await query(`UPDATE savings_goals SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = await query('SELECT * FROM savings_goals WHERE id = ?', [id]);

    res.json({ success: true, goal: updated[0] });
  } catch (error) {
    console.error('목표 저축 수정 오류:', error);
    res.status(500).json({ error: '목표 저축 수정 실패' });
  }
});

// 목표 저축 삭제
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM savings_goals WHERE id = ? AND user_id = ?', [id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('목표 저축 삭제 오류:', error);
    res.status(500).json({ error: '목표 저축 삭제 실패' });
  }
});

export default router;

