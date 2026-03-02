import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

const SWAP_FEE_RATE = 0.03; // 3% 수수료

// 교환 비율 조회
router.get('/rate', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from과 to 주식 ID를 입력해주세요' });
    }

    if (from === to) {
      return res.status(400).json({ error: '같은 주식으로 교환할 수 없습니다' });
    }

    const fromStocks = await query('SELECT id, symbol, name, current_price FROM stocks WHERE id = ? AND status = "ACTIVE"', [from]);
    const toStocks = await query('SELECT id, symbol, name, current_price FROM stocks WHERE id = ? AND status = "ACTIVE"', [to]);

    if (fromStocks.length === 0 || toStocks.length === 0) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    const fromPrice = parseFloat(fromStocks[0].current_price);
    const toPrice = parseFloat(toStocks[0].current_price);
    const rate = fromPrice / toPrice;

    res.json({
      from: { id: fromStocks[0].id, symbol: fromStocks[0].symbol, name: fromStocks[0].name, price: fromPrice },
      to: { id: toStocks[0].id, symbol: toStocks[0].symbol, name: toStocks[0].name, price: toPrice },
      exchange_rate: parseFloat(rate.toFixed(8)),
      fee_rate: SWAP_FEE_RATE,
    });
  } catch (error) {
    console.error('교환 비율 조회 오류:', error);
    res.status(500).json({ error: '교환 비율 조회 실패' });
  }
});

// 스왑 실행
router.post('/execute', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, from_stock_id, to_stock_id, from_quantity } = req.body;

    if (!wallet_address || !from_stock_id || !to_stock_id || !from_quantity) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (from_stock_id === to_stock_id) {
      return res.status(400).json({ error: '같은 주식으로 교환할 수 없습니다' });
    }

    const fromQty = parseFloat(from_quantity);
    if (isNaN(fromQty) || fromQty <= 0) {
      return res.status(400).json({ error: '유효한 수량을 입력해주세요' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    // 주식 정보 조회
    const fromStocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [from_stock_id]);
    const toStocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [to_stock_id]);

    if (fromStocks.length === 0 || toStocks.length === 0) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }

    // 보유량 확인
    const balances = await query(
      'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
      [wallet.id, from_stock_id]
    );

    if (balances.length === 0) {
      return res.status(400).json({ error: '해당 주식을 보유하고 있지 않습니다' });
    }

    const availableAmount = parseFloat(balances[0].available_amount || '0');
    if (availableAmount < fromQty) {
      return res.status(400).json({
        error: '보유 수량이 부족합니다',
        available: availableAmount,
        required: fromQty,
      });
    }

    const fromPrice = parseFloat(fromStocks[0].current_price);
    const toPrice = parseFloat(toStocks[0].current_price);
    const exchangeRate = fromPrice / toPrice;

    // 수수료 계산 (Gold 기준)
    const totalValue = fromQty * fromPrice;
    const fee = totalValue * SWAP_FEE_RATE;
    const netValue = totalValue - fee;
    const toQty = netValue / toPrice;

    // 트랜잭션
    await query('START TRANSACTION');

    try {
      // from 주식 차감
      await query(
        'UPDATE user_stock_balances SET available_amount = available_amount - ? WHERE wallet_id = ? AND stock_id = ?',
        [fromQty, wallet.id, from_stock_id]
      );

      // to 주식 추가 (없으면 생성)
      const toBalance = await query(
        'SELECT * FROM user_stock_balances WHERE wallet_id = ? AND stock_id = ?',
        [wallet.id, to_stock_id]
      );

      if (toBalance.length === 0) {
        await query(
          `INSERT INTO user_stock_balances (id, wallet_id, stock_id, available_amount, locked_amount, average_buy_price)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [uuidv4(), wallet.id, to_stock_id, toQty, toPrice]
        );
      } else {
        await query(
          'UPDATE user_stock_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND stock_id = ?',
          [toQty, wallet.id, to_stock_id]
        );
      }

      // 수수료를 Gold로 차감
      await query('UPDATE user_wallets SET krw_balance = GREATEST(krw_balance - ?, 0) WHERE id = ?', [fee, wallet.id]);

      // 스왑 기록
      await query(
        `INSERT INTO swap_transactions (id, wallet_id, from_stock_id, to_stock_id, from_quantity, to_quantity, exchange_rate, fee)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), wallet.id, from_stock_id, to_stock_id, fromQty, toQty, exchangeRate, fee]
      );

      await query('COMMIT');

      res.json({
        success: true,
        from_quantity: fromQty,
        to_quantity: parseFloat(toQty.toFixed(8)),
        exchange_rate: parseFloat(exchangeRate.toFixed(8)),
        fee: parseFloat(fee.toFixed(3)),
      });
    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    console.error('스왑 실행 오류:', error);
    res.status(500).json({ error: '스왑 실행 실패' });
  }
});

// 스왑 히스토리
router.get('/history/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const wallets = await query('SELECT id FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const history = await query(
      `SELECT st.id, st.from_quantity as from_amount, st.to_quantity as to_amount,
              st.exchange_rate as rate, st.fee, st.created_at,
              fs.symbol as from_symbol, fs.name as from_name,
              ts.symbol as to_symbol, ts.name as to_name
       FROM swap_transactions st
       JOIN stocks fs ON st.from_stock_id = fs.id
       JOIN stocks ts ON st.to_stock_id = ts.id
       WHERE st.wallet_id = ?
       ORDER BY st.created_at DESC
       LIMIT 50`,
      [wallets[0].id]
    );

    res.json({ history });
  } catch (error) {
    console.error('스왑 히스토리 조회 오류:', error);
    res.status(500).json({ error: '스왑 히스토리 조회 실패' });
  }
});

export default router;
