import express from 'express';
import bcrypt from 'bcrypt';
import { query } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import '../types'; // Import session type declarations

const router = express.Router();

// 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUsers: any = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    await query(
      `INSERT INTO users (id, username, email, password, display_name)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, username, email, hashedPassword, displayName]
    );

    // Create default settings
    await query(
      `INSERT INTO user_settings (user_id) VALUES (?)`,
      [userId]
    );

    res.json({ message: 'Registration successful', userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const users: any = await query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email,
        level: user.level,
        totalScore: user.total_score
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 로그아웃
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// 현재 사용자 정보
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const users: any = await query(
      'SELECT id, username, email, display_name, avatar_url, total_score, total_plays, level, experience, status FROM users WHERE id = ?',
      [req.session.userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      totalScore: user.total_score,
      totalPlays: user.total_plays,
      level: user.level,
      experience: user.experience,
      status: user.status
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
