import { Request, Response, NextFunction } from 'express';
import { query } from '../utils/database';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!(req.session as any).userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 관리자 권한 확인
    const users = await query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    if (!users[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
