import { Request, Response, NextFunction } from 'express';
import '../types'; // Import session type declarations

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔐 Admin auth check:', {
    sessionID: req.sessionID,
    adminId: req.session.adminId,
    username: req.session.username,
    session: req.session
  });

  if (!req.session.adminId) {
    console.log('❌ Admin auth failed - no adminId in session');
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }

  console.log('✅ Admin auth success');
  next();
};
