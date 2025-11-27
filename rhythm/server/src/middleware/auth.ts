import { Request, Response, NextFunction } from 'express';

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

    // 관리자 체크 로직 추가 (추후 구현)
    next();
  } catch (error) {
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
