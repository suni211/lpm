import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const LICO_API_URL = process.env.LICO_API_URL || 'http://localhost:5002';

// Lico 지갑 주소로 계좌 연결
router.post('/connect', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { stock_account_id, lico_wallet_address } = req.body;

    if (!stock_account_id || !lico_wallet_address) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 주식 계좌인지 확인
    const accounts = await query(
      'SELECT * FROM accounts WHERE id = ? AND user_id = ? AND account_type = "STOCK"',
      [stock_account_id, req.session.userId]
    );

    if (accounts.length === 0) {
      return res.status(400).json({ error: '주식 계좌를 찾을 수 없습니다' });
    }

    // Lico 지갑 주소 검증 (Lico API 호출)
    try {
      const licoResponse = await axios.get(`${LICO_API_URL}/api/wallets/address/${lico_wallet_address}`);
      if (!licoResponse.data.wallet) {
        return res.status(400).json({ error: '유효하지 않은 Lico 지갑 주소입니다' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Lico 지갑 주소를 확인할 수 없습니다' });
    }

    // 기존 연결 확인
    const existing = await query(
      'SELECT * FROM lico_connections WHERE user_id = ? AND stock_account_id = ?',
      [req.session.userId, stock_account_id]
    );

    if (existing.length > 0) {
      // 업데이트
      await query(
        'UPDATE lico_connections SET lico_wallet_address = ?, is_active = TRUE WHERE id = ?',
        [lico_wallet_address, existing[0].id]
      );

      const updated = await query('SELECT * FROM lico_connections WHERE id = ?', [existing[0].id]);
      return res.json({ success: true, connection: updated[0] });
    } else {
      // 생성
      const connectionId = uuidv4();
      await query(
        'INSERT INTO lico_connections (id, user_id, stock_account_id, lico_wallet_address) VALUES (?, ?, ?, ?)',
        [connectionId, req.session.userId, stock_account_id, lico_wallet_address]
      );

      const connections = await query('SELECT * FROM lico_connections WHERE id = ?', [connectionId]);
      return res.status(201).json({ success: true, connection: connections[0] });
    }
  } catch (error) {
    console.error('Lico 연결 오류:', error);
    res.status(500).json({ error: 'Lico 연결 실패' });
  }
});

// 연결된 Lico 지갑 정보 조회
router.get('/connection', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const connections = await query(
      `SELECT lc.*, a.account_number, a.balance
       FROM lico_connections lc
       JOIN accounts a ON lc.stock_account_id = a.id
       WHERE lc.user_id = ? AND lc.is_active = TRUE`,
      [req.session.userId]
    );

    if (connections.length === 0) {
      return res.json({ connection: null });
    }

    const connection = connections[0];

    // Lico 지갑 정보 조회
    try {
      const licoResponse = await axios.get(`${LICO_API_URL}/api/wallets/address/${connection.lico_wallet_address}`);
      const licoWallet = licoResponse.data.wallet;

      res.json({
        connection: {
          ...connection,
          lico_wallet: {
            wallet_address: licoWallet.wallet_address,
            gold_balance: licoWallet.gold_balance,
            minecraft_username: licoWallet.minecraft_username,
          },
        },
      });
    } catch (error) {
      res.json({ connection, lico_wallet: null });
    }
  } catch (error) {
    console.error('Lico 연결 조회 오류:', error);
    res.status(500).json({ error: 'Lico 연결 조회 실패' });
  }
});

// Bank 계좌에서 Lico로 자금 이체
router.post('/transfer-to-lico', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { stock_account_id, amount } = req.body;

    if (!stock_account_id || !amount) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 연결 확인
    const connections = await query(
      'SELECT * FROM lico_connections WHERE user_id = ? AND stock_account_id = ? AND is_active = TRUE',
      [req.session.userId, stock_account_id]
    );

    if (connections.length === 0) {
      return res.status(400).json({ error: 'Lico 지갑이 연결되지 않았습니다' });
    }

    const connection = connections[0];

    // 계좌 잔액 확인
    const accounts = await query('SELECT * FROM accounts WHERE id = ?', [stock_account_id]);
    if (accounts[0].balance < amount) {
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // Lico API로 입금 요청
    try {
      const licoResponse = await axios.post(`${LICO_API_URL}/api/wallets/deposit`, {
        wallet_address: connection.lico_wallet_address,
        amount: amount,
      });

      if (licoResponse.data.success) {
        // Bank 계좌에서 차감
        await query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, stock_account_id]);

        // 거래 기록
        const transactionId = uuidv4();
        await query(
          `INSERT INTO transactions (id, transaction_type, account_id, amount, balance_before, balance_after, notes)
           VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?)`,
          [
            transactionId,
            stock_account_id,
            amount,
            accounts[0].balance,
            accounts[0].balance - amount,
            `Lico 지갑으로 이체: ${connection.lico_wallet_address}`,
          ]
        );

        res.json({ success: true, message: 'Lico 지갑으로 이체되었습니다' });
      }
    } catch (error: any) {
      console.error('Lico 이체 오류:', error);
      res.status(500).json({ error: 'Lico 이체 실패', details: error.response?.data?.error });
    }
  } catch (error) {
    console.error('Lico 이체 오류:', error);
    res.status(500).json({ error: 'Lico 이체 실패' });
  }
});

// Lico에서 Bank 계좌로 자금 이체
router.post('/transfer-from-lico', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { stock_account_id, amount } = req.body;

    if (!stock_account_id || !amount) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    // 연결 확인
    const connections = await query(
      'SELECT * FROM lico_connections WHERE user_id = ? AND stock_account_id = ? AND is_active = TRUE',
      [req.session.userId, stock_account_id]
    );

    if (connections.length === 0) {
      return res.status(400).json({ error: 'Lico 지갑이 연결되지 않았습니다' });
    }

    const connection = connections[0];

    // Lico API로 출금 요청
    try {
      const licoResponse = await axios.post(`${LICO_API_URL}/api/wallets/withdraw`, {
        wallet_address: connection.lico_wallet_address,
        amount: amount,
      });

      if (licoResponse.data.success) {
        // Bank 계좌에 입금
        const accounts = await query('SELECT * FROM accounts WHERE id = ?', [stock_account_id]);
        await query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, stock_account_id]);

        // 거래 기록
        const transactionId = uuidv4();
        await query(
          `INSERT INTO transactions (id, transaction_type, account_id, amount, balance_before, balance_after, notes)
           VALUES (?, 'TRANSFER_IN', ?, ?, ?, ?, ?)`,
          [
            transactionId,
            stock_account_id,
            amount,
            accounts[0].balance,
            accounts[0].balance + amount,
            `Lico 지갑에서 입금: ${connection.lico_wallet_address}`,
          ]
        );

        res.json({ success: true, message: 'Lico 지갑에서 입금되었습니다' });
      }
    } catch (error: any) {
      console.error('Lico 입금 오류:', error);
      res.status(500).json({ error: 'Lico 입금 실패', details: error.response?.data?.error });
    }
  } catch (error) {
    console.error('Lico 입금 오류:', error);
    res.status(500).json({ error: 'Lico 입금 실패' });
  }
});

export default router;

