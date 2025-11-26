import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import accountNumberService from '../services/accountNumberService';
import minecraftService from '../services/minecraftService';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 계좌 생성
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { minecraft_username } = req.body;

    // 마인크래프트 닉네임 유효성 검사
    if (!minecraftService.isValidMinecraftUsername(minecraft_username)) {
      return res.status(400).json({ error: '유효하지 않은 마인크래프트 닉네임입니다' });
    }

    // 중복 확인
    const existing = await query(
      'SELECT * FROM accounts WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 계좌가 존재합니다' });
    }

    // UUID 조회
    const minecraft_uuid = await minecraftService.getMinecraftUUID(minecraft_username);

    // 계좌번호 생성
    const account_number = await accountNumberService.generateAccountNumber();

    // 계좌 생성
    const accountId = uuidv4();
    await query(
      `INSERT INTO accounts (id, account_number, minecraft_username, minecraft_uuid, balance, status)
       VALUES (?, ?, ?, ?, 0, 'ACTIVE')`,
      [accountId, account_number, minecraft_username, minecraft_uuid]
    );

    const accounts = await query('SELECT * FROM accounts WHERE id = ?', [accountId]);

    res.json({
      success: true,
      account: accounts[0],
    });
  } catch (error) {
    console.error('계좌 생성 오류:', error);
    res.status(500).json({ error: '계좌 생성 실패' });
  }
});

// 계좌 조회 (계좌번호)
router.get('/number/:accountNumber', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    // 유효성 검사
    if (!accountNumberService.validateAccountNumber(accountNumber)) {
      return res.status(400).json({ error: '유효하지 않은 계좌번호입니다' });
    }

    const account = await accountNumberService.getAccountByNumber(accountNumber);

    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({ account });
  } catch (error) {
    console.error('계좌 조회 오류:', error);
    res.status(500).json({ error: '계좌 조회 실패' });
  }
});

// 계좌 조회 (닉네임)
router.get('/username/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const accounts = await query(
      'SELECT * FROM accounts WHERE minecraft_username = ? AND status = "ACTIVE"',
      [username]
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

// 잔액 조회
router.get('/:accountNumber/balance', async (req: Request, res: Response) => {
  try {
    const { accountNumber } = req.params;

    const account = await accountNumberService.getAccountByNumber(accountNumber);

    if (!account) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' });
    }

    res.json({
      account_number: accountNumberService.maskAccountNumber(accountNumber),
      balance: account.balance,
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

    let sql = 'SELECT * FROM accounts';
    const params: any[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
