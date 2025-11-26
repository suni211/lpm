import express, { Request, Response } from 'express';
import { query } from '../database/db';
import bcrypt from 'bcrypt';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 관리자 로그인
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admins = await query('SELECT * FROM admins WHERE username = ?', [username]);

    if (admins.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    const admin = admins[0];

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    // 세션 설정
    req.session.adminId = admin.id;
    req.session.username = admin.username;

    // 마지막 로그인 시간 업데이트
    await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('관리자 로그인 오류:', error);
    res.status(500).json({ error: '로그인 실패' });
  }
});

// 관리자 로그아웃
router.post('/admin/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 실패' });
    }
    res.json({ success: true });
  });
});

// 현재 관리자 정보
router.get('/admin/me', isAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await query('SELECT id, username, role, created_at, last_login FROM admins WHERE id = ?', [
      req.session.adminId,
    ]);

    if (admins.length === 0) {
      return res.status(404).json({ error: '관리자를 찾을 수 없습니다' });
    }

    res.json({ admin: admins[0] });
  } catch (error) {
    console.error('관리자 정보 조회 오류:', error);
    res.status(500).json({ error: '관리자 정보 조회 실패' });
  }
});

export default router;
