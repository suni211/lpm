import express from 'express';
import exchangeService from '../services/exchangeService';
import { query } from '../database/db';

const router = express.Router();

/**
 * POST /api/exchange
 * 환전 실행
 * Body: { fromCoinId, toCoinId, amount }
 */
router.post('/', async (req, res) => {
  try {
    const { fromCoinId, toCoinId, amount } = req.body;
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    if (!fromCoinId || amount == null || amount <= 0) {
      return res.status(400).json({ error: '잘못된 요청입니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const result = await exchangeService.exchange(
      wallets[0].id,
      fromCoinId,
      toCoinId || null, // null이면 Gold로 환전
      parseFloat(amount)
    );

    res.json({
      success: true,
      message: '환전이 완료되었습니다',
      data: result,
    });
  } catch (error: any) {
    console.error('환전 오류:', error);
    res.status(400).json({ error: error.message || '환전에 실패했습니다' });
  }
});

/**
 * GET /api/exchange/history
 * 환전 기록 조회
 */
router.get('/history', async (req, res) => {
  try {
    const userId = (req.session as any).userId;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE user_id = ?', [userId]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const history = await exchangeService.getExchangeHistory(wallets[0].id, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('환전 기록 조회 오류:', error);
    res.status(500).json({ error: '환전 기록을 불러오는데 실패했습니다' });
  }
});

/**
 * GET /api/exchange/rate
 * 환전 비율 조회
 * Query: fromCoinId, toCoinId (null이면 Gold)
 */
router.get('/rate', async (req, res) => {
  try {
    const { fromCoinId, toCoinId } = req.query;

    if (!fromCoinId) {
      return res.status(400).json({ error: 'fromCoinId가 필요합니다' });
    }

    // From 코인 조회
    const fromCoins = await query('SELECT * FROM coins WHERE id = ?', [fromCoinId]);
    if (fromCoins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }
    const fromCoin = fromCoins[0];
    const fromPrice = typeof fromCoin.current_price === 'string'
      ? parseFloat(fromCoin.current_price)
      : (fromCoin.current_price || 0);

    // Gold로 환전하는 경우
    if (!toCoinId || toCoinId === 'null') {
      const exchangeRate = fromPrice;
      const feePercentage = 5.0;

      return res.json({
        success: true,
        data: {
          from: {
            coinId: fromCoin.id,
            symbol: fromCoin.symbol,
            name: fromCoin.name,
            type: fromCoin.coin_type,
          },
          to: {
            symbol: 'Gold',
            name: 'Gold',
          },
          exchangeRate,
          feePercentage,
          example: {
            input: 1,
            grossOutput: exchangeRate,
            fee: exchangeRate * (feePercentage / 100),
            netOutput: exchangeRate * (1 - feePercentage / 100),
          },
        },
      });
    }

    // To 코인 조회
    const toCoins = await query('SELECT * FROM coins WHERE id = ?', [toCoinId]);
    if (toCoins.length === 0) {
      return res.status(404).json({ error: '받을 코인을 찾을 수 없습니다' });
    }
    const toCoin = toCoins[0];
    const toPrice = typeof toCoin.current_price === 'string'
      ? parseFloat(toCoin.current_price)
      : (toCoin.current_price || 0);

    const exchangeRate = fromPrice / toPrice;
    const feePercentage = 5.0;

    res.json({
      success: true,
      data: {
        from: {
          coinId: fromCoin.id,
          symbol: fromCoin.symbol,
          name: fromCoin.name,
          type: fromCoin.coin_type,
        },
        to: {
          coinId: toCoin.id,
          symbol: toCoin.symbol,
          name: toCoin.name,
          type: toCoin.coin_type,
        },
        exchangeRate,
        feePercentage,
        example: {
          input: 1,
          grossOutput: exchangeRate,
          fee: exchangeRate * (feePercentage / 100),
          netOutput: exchangeRate * (1 - feePercentage / 100),
        },
      },
    });
  } catch (error: any) {
    console.error('환전 비율 조회 오류:', error);
    res.status(500).json({ error: '환전 비율을 조회하는데 실패했습니다' });
  }
});

export default router;
