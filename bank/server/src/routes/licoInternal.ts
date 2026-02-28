import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 🔒 LICO 서버 전용 내부 API (API 키 인증)
const LICO_API_SECRET = process.env.LICO_API_SECRET || 'lico-internal-secret-key-change-in-production';

// API 키 검증 미들웨어
const validateLicoApiKey = (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers['x-lico-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== LICO_API_SECRET) {
    return res.status(401).json({ error: '인증 실패: 유효하지 않은 API 키' });
  }

  next();
};

// BANK에서 LICO로 출금 (LICO 서버 전용)
router.post('/deduct-balance', validateLicoApiKey, async (req: Request, res: Response) => {
  try {
    const { minecraft_username, amount, transaction_id } = req.body;

    // ========== 1단계: 입력 검증 ==========
    if (!minecraft_username || !amount || !transaction_id) {
      return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다' });
    }

    // Transaction ID 형식 검증
    if (typeof transaction_id !== 'string' || !/^[A-Za-z0-9-]{8,}$/.test(transaction_id)) {
      return res.status(400).json({ error: '유효하지 않은 Transaction ID 형식입니다' });
    }

    // Amount 검증 (정수만 허용)
    const deductAmount = typeof amount === 'string' ? parseInt(amount, 10) : Math.floor(amount);
    if (isNaN(deductAmount) || !isFinite(deductAmount) || deductAmount <= 0) {
      return res.status(400).json({ error: '유효하지 않은 금액입니다' });
    }

    // 소수점 금액 차단
    if (typeof amount === 'number' && amount !== Math.floor(amount)) {
      return res.status(400).json({ error: '소수점 금액은 처리할 수 없습니다' });
    }

    // ========== 2단계: 트랜잭션 시작 ==========
    await query('START TRANSACTION');

    try {
      // 중복 트랜잭션 확인
      const existingTx = await query(
        'SELECT id FROM transactions WHERE notes LIKE ? FOR UPDATE',
        [`%${transaction_id}%`]
      );

      if (existingTx.length > 0) {
        await query('ROLLBACK');
        return res.status(400).json({
          error: '이미 처리된 거래입니다',
          transaction_id: transaction_id
        });
      }

      // 사용자 조회 (마인크래프트 닉네임으로)
      const users = await query(
        'SELECT * FROM users WHERE minecraft_username = ? FOR UPDATE',
        [minecraft_username]
      );

      if (users.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
      }

      const user = users[0];

      // 주식 계좌 조회 (02로 시작하는 계좌)
      const accounts = await query(
        `SELECT * FROM accounts
         WHERE user_id = ? AND account_type = 'STOCK' AND status = 'ACTIVE'
         FOR UPDATE`,
        [user.id]
      );

      if (accounts.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: '주식 계좌를 찾을 수 없습니다' });
      }

      const account = accounts[0];

      // 잔액 확인
      if (account.balance < deductAmount) {
        await query('ROLLBACK');
        return res.status(400).json({
          error: 'BANK 잔액이 부족합니다',
          current_balance: account.balance,
          required: deductAmount
        });
      }

      // ========== 3단계: 잔액 차감 ==========
      const updateResult: any = await query(
        'UPDATE accounts SET balance = balance - ? WHERE id = ? AND balance >= ?',
        [deductAmount, account.id, deductAmount]
      );

      if (!updateResult || (updateResult.affectedRows !== undefined && updateResult.affectedRows === 0)) {
        await query('ROLLBACK');
        return res.status(500).json({ error: '잔액 차감 실패' });
      }

      // ========== 4단계: 거래 기록 ==========
      const transactionDbId = uuidv4();
      await query(
        `INSERT INTO transactions (id, transaction_type, account_id, amount, balance_before, balance_after, notes)
         VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?)`,
        [
          transactionDbId,
          account.id,
          deductAmount,
          account.balance,
          account.balance - deductAmount,
          `LICO 입금 (TXN: ${transaction_id})`
        ]
      );

      // ========== 5단계: 커밋 ==========
      await query('COMMIT');

      console.log(`✅ BANK → LICO 출금: ${minecraft_username} - ${deductAmount} Gold (Transaction: ${transaction_id})`);

      res.json({
        success: true,
        message: `${deductAmount} Gold가 BANK에서 차감되었습니다`,
        transaction_id: transaction_id,
        amount: deductAmount,
        new_balance: account.balance - deductAmount
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    console.error('BANK 출금 오류:', error);
    res.status(500).json({ error: 'BANK 출금 실패' });
  }
});

// BANK로 입금 (LICO 서버 전용 - LICO 출금 시 호출)
router.post('/add-balance', validateLicoApiKey, async (req: Request, res: Response) => {
  try {
    const { minecraft_username, amount, transaction_id, fee } = req.body;

    // ========== 1단계: 입력 검증 ==========
    if (!minecraft_username || !amount) {
      return res.status(400).json({ error: '필수 입력 항목이 누락되었습니다' });
    }

    // Amount 검증 (정수만 허용)
    const addAmount = typeof amount === 'string' ? parseInt(amount, 10) : Math.floor(amount);
    if (isNaN(addAmount) || !isFinite(addAmount) || addAmount <= 0) {
      return res.status(400).json({ error: '유효하지 않은 금액입니다' });
    }

    // 소수점 금액 차단
    if (typeof amount === 'number' && amount !== Math.floor(amount)) {
      return res.status(400).json({ error: '소수점 금액은 처리할 수 없습니다' });
    }

    // ========== 2단계: 트랜잭션 시작 ==========
    await query('START TRANSACTION');

    try {
      // 사용자 조회
      const users = await query(
        'SELECT * FROM users WHERE minecraft_username = ? FOR UPDATE',
        [minecraft_username]
      );

      if (users.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
      }

      const user = users[0];

      // 주식 계좌 조회
      const accounts = await query(
        `SELECT * FROM accounts
         WHERE user_id = ? AND account_type = 'STOCK' AND status = 'ACTIVE'
         FOR UPDATE`,
        [user.id]
      );

      if (accounts.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ error: '주식 계좌를 찾을 수 없습니다' });
      }

      const account = accounts[0];

      // ========== 3단계: 잔액 추가 ==========
      const updateResult: any = await query(
        'UPDATE accounts SET balance = balance + ? WHERE id = ?',
        [addAmount, account.id]
      );

      if (!updateResult || (updateResult.affectedRows !== undefined && updateResult.affectedRows === 0)) {
        await query('ROLLBACK');
        return res.status(500).json({ error: '잔액 추가 실패' });
      }

      // ========== 4단계: 거래 기록 ==========
      const transactionDbId = uuidv4();
      const notes = transaction_id
        ? `LICO 출금 (TXN: ${transaction_id}${fee ? `, 수수료: ${fee}G` : ''})`
        : `LICO 출금 (수수료: ${fee || 0}G)`;

      await query(
        `INSERT INTO transactions (id, transaction_type, account_id, amount, balance_before, balance_after, notes)
         VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?)`,
        [
          transactionDbId,
          account.id,
          addAmount,
          account.balance,
          account.balance + addAmount,
          notes
        ]
      );

      // ========== 5단계: 커밋 ==========
      await query('COMMIT');

      console.log(`✅ LICO → BANK 입금: ${minecraft_username} - ${addAmount} Gold`);

      res.json({
        success: true,
        message: `${addAmount} Gold가 BANK에 입금되었습니다`,
        amount: addAmount,
        new_balance: account.balance + addAmount
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }

  } catch (error) {
    console.error('BANK 입금 오류:', error);
    res.status(500).json({ error: 'BANK 입금 실패' });
  }
});

// 잔액 조회 (LICO 서버 전용)
router.get('/balance/:minecraft_username', validateLicoApiKey, async (req: Request, res: Response) => {
  try {
    const { minecraft_username } = req.params;

    // 사용자 조회
    const users = await query(
      'SELECT * FROM users WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = users[0];

    // 주식 계좌 조회
    const accounts = await query(
      `SELECT * FROM accounts
       WHERE user_id = ? AND account_type = 'STOCK' AND status = 'ACTIVE'`,
      [user.id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ error: '주식 계좌를 찾을 수 없습니다' });
    }

    const account = accounts[0];

    res.json({
      minecraft_username: minecraft_username,
      account_number: account.account_number,
      balance: account.balance
    });

  } catch (error) {
    console.error('BANK 잔액 조회 오류:', error);
    res.status(500).json({ error: 'BANK 잔액 조회 실패' });
  }
});

export default router;
