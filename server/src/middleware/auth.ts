import { Request, Response, NextFunction } from 'express';

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // users 테이블의 is_admin 컬럼 체크
  if ((req.user as any).is_admin === true || (req.user as any).is_admin === 1) {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden: Admin access required' });
};
