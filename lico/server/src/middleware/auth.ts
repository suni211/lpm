import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  session: Request['session'];
}

/**
 * 관리자 인증 미들웨어
 */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: '관리자 로그인이 필요합니다' });
  }
  next();
};

/**
 * 사용자 인증 미들웨어
 */
export const isAuthenticated = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다' });
  }
  next();
};

// Express Session 타입 확장
declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    userId?: string;
    username?: string;
  }
}
