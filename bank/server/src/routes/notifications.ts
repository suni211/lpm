import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { sendNotification } from '../index';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 알림 생성 헬퍼 함수
export const createNotification = async (
  userId: string,
  type: 'TRANSACTION' | 'APPROVAL' | 'SYSTEM' | 'ALERT',
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string
) => {
  const notificationId = uuidv4();
  await query(
    `INSERT INTO notifications (id, user_id, type, title, message, related_id, related_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [notificationId, userId, type, title, message, relatedId || null, relatedType || null]
  );

  // WebSocket으로 실시간 알림 전송
  sendNotification(userId, {
    id: notificationId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    isRead: false,
    created_at: new Date().toISOString(),
  });

  return notificationId;
};

// 알림 목록 조회
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { limit = 50, unread_only } = req.query;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [req.session.userId];

    if (unread_only === 'true') {
      sql += ' AND is_read = FALSE';
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const notifications = await query(sql, params);

    res.json({ notifications });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({ error: '알림 조회 실패' });
  }
});

// 읽지 않은 알림 개수
router.get('/unread-count', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.session.userId]
    );

    res.json({ count: result[0].count || 0 });
  } catch (error) {
    console.error('알림 개수 조회 오류:', error);
    res.status(500).json({ error: '알림 개수 조회 실패' });
  }
});

// 알림 읽음 처리
router.patch('/:id/read', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [id, req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({ error: '알림 읽음 처리 실패' });
  }
});

// 모든 알림 읽음 처리
router.patch('/read-all', isAuthenticated, async (req: Request, res: Response) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.session.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('알림 일괄 읽음 처리 오류:', error);
    res.status(500).json({ error: '알림 일괄 읽음 처리 실패' });
  }
});

// 알림 삭제
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, req.session.userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('알림 삭제 오류:', error);
    res.status(500).json({ error: '알림 삭제 실패' });
  }
});

export default router;

