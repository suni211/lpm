import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: '인증이 필요합니다' });
  }

  if (!(req.user as any).is_admin) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  }

  next();
};
