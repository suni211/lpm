import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../utils/database';
import { User } from '../types';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 중복 체크
    const existingUser = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    ) as any[];

    if (existingUser.length > 0) {
      return res.status(409).json({ error: '이미 존재하는 사용자입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const result = await query(
      'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, display_name || username]
    ) as any;

    // 기본 설정 생성
    await query(
      'INSERT INTO user_settings (user_id, key_bindings) VALUES (?, ?)',
      [
        result.insertId,
        JSON.stringify({
          key4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
          key5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
          key6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']
        })
      ]
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: {
        id: result.insertId,
        username,
        email,
        display_name: display_name || username
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    const users = await query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    ) as User[];

    if (users.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 세션 저장
    (req.session as any).userId = user.id;
    (req.session as any).username = user.username;

    res.json({
      message: '로그인 성공',
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        tier: user.tier,
        rating: user.rating
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};

export const logout = async (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 중 오류가 발생했습니다.' });
    }
    res.json({ message: '로그아웃되었습니다.' });
  });
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const users = await query(
      `SELECT id, username, email, display_name, tier, rating, total_plays, total_score, profile_image, is_admin, created_at
       FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
};
