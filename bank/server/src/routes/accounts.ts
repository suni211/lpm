import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../database/db';
import { isAdmin, isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 내 계좌 목록 조회 (로그인 사용자)
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const accounts = await query(
      `SELECT a.*, u.username, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = ? AND a.status = 'ACTIVE'
       ORDER BY a.created_at DESC`,
      [req.session.userId]
    );

    res.json({ accounts });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 주식 계좌 자동 생성 (LICO 서버용 내부 API)
router.post('/create-stock-account', async (req: Request, res: Response) => {
  try {
    const { user_id, minecraft_username } = req.body;

    if (!user_id || !minecraft_username) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 이미 주식 계좌가 있는지 확인
    const existing = await query(
      'SELECT id FROM accounts WHERE user_id = ? AND account_type = ? AND status = "ACTIVE"',
      [user_id, 'STOCK']
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 주식 계좌가 존재합니다' });
    }

    // 계좌번호 생성 (02: 주식계좌)
    const prefix = '02';
    let accountNumber: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const randomPart = Array.from({ length: 3 }, () =>
        Math.floor(1000 + Math.random() * 9000)
      ).join('-');
      accountNumber = `${prefix}-${randomPart}`;

      const existingAccount = await query(
        'SELECT id FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      if (existingAccount.length === 0) {
        break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('계좌번호 생성 실패: 최대 시도 횟수 초과');
      }
    } while (true);

    const accountId = require('crypto').randomUUID();

    await query(
      'INSERT INTO accounts (id, user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?, 0)',
      [accountId, user_id, accountNumber, 'STOCK']
    );

    const accounts = await query('SELECT * FROM accounts WHERE id = ?', [accountId]);

    res.status(201).json({
      success: true,
      account: accounts[0],
      message: '주식 계좌가 생성되었습니다',
    });
  } catch (error: any) {
    console.error('주식 계좌 생성 오류:', error);
    res.status(500).json({ error: '주식 계좌 생성 실패', message: error.message });
  }
});

// 계좌 생성 (로그인 사용자)
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { account_type = 'BASIC' } = req.body;

    if (!['BASIC', 'STOCK'].includes(account_type)) {
      return res.status(400).json({ error: '유효하지 않은 계좌 유형입니다' });
    }

    // 이미 같은 유형의 계좌가 있는지 확인
    const existing = await query(
      'SELECT id FROM accounts WHERE user_id = ? AND account_type = ? AND status = "ACTIVE"',
      [req.session.userId, account_type]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: `이미 ${account_type === 'BASIC' ? '기본' : '주식'} 계좌가 존재합니다` });
    }

    // 계좌번호 생성 (01: 기본계좌, 02: 주식계좌)
    const prefix = account_type === 'BASIC' ? '01' : '02';
    let accountNumber: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      const randomPart = Array.from({ length: 3 }, () =>
        Math.floor(1000 + Math.random() * 9000)
      ).join('-');
      accountNumber = `${prefix}-${randomPart}`;

      const existingAccount = await query(
        'SELECT id FROM accounts WHERE account_number = ?',
        [accountNumber]
      );

      if (existingAccount.length === 0) {
        break;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('계좌번호 생성 실패: 최대 시도 횟수 초과');
      }
    } while (true);

    const accountId = require('crypto').randomUUID();

    await query(
      'INSERT INTO accounts (id, user_id, account_number, account_type, balance) VALUES (?, ?, ?, ?, 0)',
      [accountId, req.session.userId, accountNumber, account_type]
    );

    const accounts = await query('SELECT * FROM accounts WHERE id = ?', [accountId]);

    res.status(201).json({
      success: true,
      account: accounts[0],
      message: `${account_type === 'BASIC' ? '기본' : '주식'} 계좌가 생성되었습니다`,
    });
  } catch (error: any) {
    console.error('계좌 생성 오류:', error);
    res.status(500).json({ error: '계좌 생성 실패', message: error.message });
  }
});

// 계좌 조회 (계좌번호)
router.get('/number/:accountNumber', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const accounts = await query(
      `SELECT a.*, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE a.account_number = ? AND a.status = 'ACTIVE'`,
      [accountNumber]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({ account: accounts[0] });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 계좌 조회 (마인크래프트 닉네임) - 주식 계좌(02) 우선 반환
router.get('/minecraft/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const accounts = await query(
      `SELECT a.*, u.minecraft_username, u.email
       FROM accounts a
       JOIN users u ON a.user_id = u.id
       WHERE u.minecraft_username = ? AND a.status = 'ACTIVE'
       ORDER BY 
         CASE 
           WHEN a.account_type = 'STOCK' THEN 1
           WHEN a.account_number LIKE '02-%' THEN 1
           ELSE 2
         END,
         a.created_at DESC`,
      [username]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    // 주식 계좌(02) 우선 반환
    const stockAccount = accounts.find(acc => 
      acc.account_type === 'STOCK' || acc.account_number?.startsWith('02-')
    );

    res.json({ 
      account: stockAccount || accounts[0],
      accounts: accounts // 모든 계좌도 함께 반환 (호환성)
    });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 잔액 조회
router.get('/:accountNumber/balance', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const accounts = await query(
      'SELECT balance FROM accounts WHERE account_number = ? AND status = ?',
      [accountNumber, 'ACTIVE']
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    // 계좌번호 마스킹 (1234-****-****-3456)
    const maskedNumber = accountNumber.split('-').map((part: string, idx: number) =>
      idx === 0 || idx === 3 ? part : '****'
    ).join('-');

    res.json({
      account_number: maskedNumber,
      balance: accounts[0].balance,
    });
  } catch (error) {
    console.error('잔액 조회 오류:', error);
    res.status(500).json({ error: '잔액 조회 실패' });
  }
});

// 전체 계좌 목록 (관리자)
router.get('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = `SELECT a.*, u.username, u.minecraft_username, u.email
               FROM accounts a
               JOIN users u ON a.user_id = u.id`;
    const params: any[] = [];

    if (status) {
      sql += ' WHERE a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const accounts = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as total FROM accounts');

    res.json({
      accounts,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('계좌 목록 조회 오류:', error);
    res.status(500).json({ error: '계좌 목록 조회 실패' });
  }
});

// 계좌 상태 변경 (관리자)
router.patch('/:id/status', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'SUSPENDED', 'CLOSED'].includes(status)) {
      return res.status(400).json({ error: '유효하지 않은 상태값입니다' });
    }

    await query('UPDATE accounts SET status = ? WHERE id = ?', [status, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('계좌 상태 변경 오류:', error);
    res.status(500).json({ error: '계좌 상태 변경 실패' });
  }
});

export default router;
