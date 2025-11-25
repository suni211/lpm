import express, { Request, Response } from 'express';
import passport from '../middleware/passport';
import pool from '../database/db';

const router = express.Router();

// Google OAuth login
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

// Google OAuth callback
router.get(
  '/google/callback',
  (req: Request, res: Response, next: Function) => {
    passport.authenticate('google', (err: any, user: any, info: any) => {
      if (err) {
        // IP 중복 에러 처리
        if (err.message && err.message.includes('DUPLICATE_IP_ERROR')) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=duplicate_ip`);
        }
        // 기타 인증 에러
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.redirect(`${process.env.CLIENT_URL}/login?error=login_failed`);
        }
        // Successful authentication
        return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
      });
    })(req, res, next);
  }
);

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get user info
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.user.id]
    );

    // Get team info
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      user: userResult[0],
      team: teamResult[0] || null,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Check authentication status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user || null,
  });
});

export default router;
