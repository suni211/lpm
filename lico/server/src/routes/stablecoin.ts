import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Gold → LGOLD 교환 (발행)
router.post('/mint', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_id, amount } = req.body;

    // 입력 검증
    const goldAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!goldAmount || goldAmount <= 0) {
      return res.status(400).json({ error: '유효하지 않은 금액입니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [wallet_id]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];
    const currentGold = typeof wallet.gold_balance === 'string'
      ? parseFloat(wallet.gold_balance)
      : (wallet.gold_balance || 0);

    // Gold 잔액 확인
    if (currentGold < goldAmount) {
      return res.status(400).json({
        error: 'Gold 잔액이 부족합니다',
        available: currentGold,
        required: goldAmount
      });
    }

    // LGOLD 코인 조회
    const lgoldCoins = await query('SELECT * FROM coins WHERE symbol = "LGOLD" AND is_stable_coin = TRUE');
    if (lgoldCoins.length === 0) {
      return res.status(500).json({ error: 'LGOLD 코인을 찾을 수 없습니다' });
    }
    const lgoldCoin = lgoldCoins[0];

    // 트랜잭션 시작
    await query('START TRANSACTION');

    try {
      // 1. Gold 차감
      await query(
        'UPDATE user_wallets SET gold_balance = gold_balance - ? WHERE id = ?',
        [goldAmount, wallet_id]
      );

      // 2. LGOLD 발행 (1:1 비율)
      const lgoldAmount = goldAmount; // 1:1 비율
      const existing = await query(
        'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
        [wallet_id, lgoldCoin.id]
      );

      if (existing.length > 0) {
        // 기존 잔액에 추가
        await query(
          'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
          [lgoldAmount, wallet_id, lgoldCoin.id]
        );
      } else {
        // 새로 생성
        await query(
          'INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, locked_amount, average_buy_price) VALUES (?, ?, ?, ?, 0, 1)',
          [uuidv4(), wallet_id, lgoldCoin.id, lgoldAmount]
        );
      }

      // 3. LGOLD 총 발행량 증가
      await query(
        'UPDATE coins SET circulating_supply = circulating_supply + ? WHERE id = ?',
        [lgoldAmount, lgoldCoin.id]
      );

      await query('COMMIT');

      console.log(`💰 LGOLD 발행: ${wallet.minecraft_username} - ${goldAmount} Gold → ${lgoldAmount} LGOLD`);

      res.json({
        success: true,
        message: 'LGOLD 발행 완료',
        gold_spent: goldAmount,
        lgold_received: lgoldAmount,
        rate: '1:1',
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('LGOLD 발행 오류:', error);
    res.status(500).json({ error: 'LGOLD 발행 실패', message: error.message });
  }
});

// LGOLD → Gold 교환 (소각)
router.post('/burn', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_id, amount } = req.body;

    // 입력 검증
    const lgoldAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!lgoldAmount || lgoldAmount <= 0) {
      return res.status(400).json({ error: '유효하지 않은 금액입니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [wallet_id]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    // LGOLD 코인 조회
    const lgoldCoins = await query('SELECT * FROM coins WHERE symbol = "LGOLD" AND is_stable_coin = TRUE');
    if (lgoldCoins.length === 0) {
      return res.status(500).json({ error: 'LGOLD 코인을 찾을 수 없습니다' });
    }
    const lgoldCoin = lgoldCoins[0];

    // LGOLD 잔액 확인
    const balances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [wallet_id, lgoldCoin.id]
    );

    if (balances.length === 0) {
      return res.status(400).json({ error: 'LGOLD 잔액이 없습니다' });
    }

    const currentLgold = typeof balances[0].available_amount === 'string'
      ? parseFloat(balances[0].available_amount)
      : (balances[0].available_amount || 0);

    if (currentLgold < lgoldAmount) {
      return res.status(400).json({
        error: 'LGOLD 잔액이 부족합니다',
        available: currentLgold,
        required: lgoldAmount
      });
    }

    // 트랜잭션 시작
    await query('START TRANSACTION');

    try {
      // 1. LGOLD 소각
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount - ? WHERE wallet_id = ? AND coin_id = ?',
        [lgoldAmount, wallet_id, lgoldCoin.id]
      );

      // 2. Gold 지급 (1:1 비율)
      const goldAmount = lgoldAmount; // 1:1 비율
      await query(
        'UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE id = ?',
        [goldAmount, wallet_id]
      );

      // 3. LGOLD 총 발행량 감소
      await query(
        'UPDATE coins SET circulating_supply = circulating_supply - ? WHERE id = ?',
        [lgoldAmount, lgoldCoin.id]
      );

      await query('COMMIT');

      console.log(`💰 LGOLD 소각: ${wallet.minecraft_username} - ${lgoldAmount} LGOLD → ${goldAmount} Gold`);

      res.json({
        success: true,
        message: 'LGOLD 소각 완료',
        lgold_burned: lgoldAmount,
        gold_received: goldAmount,
        rate: '1:1',
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error: any) {
    console.error('LGOLD 소각 오류:', error);
    res.status(500).json({ error: 'LGOLD 소각 실패', message: error.message });
  }
});

// LGOLD 정보 조회
router.get('/info', async (req: Request, res: Response) => {
  try {
    const lgoldCoins = await query('SELECT * FROM coins WHERE symbol = "LGOLD" AND is_stable_coin = TRUE');

    if (lgoldCoins.length === 0) {
      return res.status(404).json({ error: 'LGOLD 코인을 찾을 수 없습니다' });
    }

    const lgoldCoin = lgoldCoins[0];

    res.json({
      coin: {
        id: lgoldCoin.id,
        symbol: lgoldCoin.symbol,
        name: lgoldCoin.name,
        description: lgoldCoin.description,
        current_price: lgoldCoin.current_price,
        circulating_supply: lgoldCoin.circulating_supply,
        is_stable_coin: lgoldCoin.is_stable_coin,
      },
      exchange_rate: {
        gold_to_lgold: '1:1',
        lgold_to_gold: '1:1',
      },
      features: [
        '거래 수수료 0%',
        '1 LGOLD = 1 BANK Gold 고정',
        '보유량 프라이버시 보호',
        '거래 내역 비공개 (당사자+관리자만 조회)',
      ],
    });

  } catch (error: any) {
    console.error('LGOLD 정보 조회 오류:', error);
    res.status(500).json({ error: 'LGOLD 정보 조회 실패', message: error.message });
  }
});

// 내 LGOLD 잔액 조회 (본인만)
router.get('/balance/:wallet_id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_id } = req.params;

    // LGOLD 코인 조회
    const lgoldCoins = await query('SELECT * FROM coins WHERE symbol = "LGOLD" AND is_stable_coin = TRUE');
    if (lgoldCoins.length === 0) {
      return res.status(404).json({ error: 'LGOLD 코인을 찾을 수 없습니다' });
    }
    const lgoldCoin = lgoldCoins[0];

    // LGOLD 잔액 조회
    const balances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [wallet_id, lgoldCoin.id]
    );

    if (balances.length === 0) {
      return res.json({
        wallet_id,
        lgold_balance: 0,
        locked_amount: 0,
        total: 0,
      });
    }

    const balance = balances[0];
    const available = typeof balance.available_amount === 'string'
      ? parseFloat(balance.available_amount)
      : (balance.available_amount || 0);
    const locked = typeof balance.locked_amount === 'string'
      ? parseFloat(balance.locked_amount)
      : (balance.locked_amount || 0);

    res.json({
      wallet_id,
      lgold_balance: available,
      locked_amount: locked,
      total: available + locked,
    });

  } catch (error: any) {
    console.error('LGOLD 잔액 조회 오류:', error);
    res.status(500).json({ error: 'LGOLD 잔액 조회 실패', message: error.message });
  }
});

export default router;
