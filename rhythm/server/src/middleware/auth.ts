import { Request, Response, NextFunction } from 'express';
import '../types'; // Import session type declarations

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Please login first' });
  }
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.adminId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
  }
  next();
};
