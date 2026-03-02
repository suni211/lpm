import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 선물 포지션 열기
router.post('/open', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, stock_id, position_type, leverage, quantity } = req.body;

    if (!wallet_address || !stock_id || !position_type || !leverage || !quantity) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    if (!['LONG', 'SHORT'].includes(position_type)) {
      return res.status(400).json({ error: '포지션 타입은 LONG 또는 SHORT만 가능합니다' });
    }

    const leverageNum = parseInt(leverage);
    if (leverageNum < 1 || leverageNum > 10) {
      return res.status(400).json({ error: '레버리지는 1x ~ 10x만 가능합니다' });
    }

    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({ error: '유효한 수량을 입력해주세요' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    // 주식 현재가 조회
    const stocks = await query('SELECT * FROM stocks WHERE id = ? AND status = "ACTIVE"', [stock_id]);
    if (stocks.length === 0) {
      return res.status(404).json({ error: '주식을 찾을 수 없습니다' });
    }
    const stock = stocks[0];
    const currentPrice = parseFloat(stock.current_price);

    // 마진 금액 계산 (포지션 가치 / 레버리지)
    const positionValue = currentPrice * quantityNum;
    const marginAmount = positionValue / leverageNum;

    // 잔액 확인
    const balance = parseFloat(wallet.krw_balance || '0');
    if (balance < marginAmount) {
      return res.status(400).json({
        error: '마진이 부족합니다',
        required: marginAmount,
        available: balance,
      });
    }

    // 청산가 계산
    let liquidationPrice: number;
    if (position_type === 'LONG') {
      // 롱: 마진 전액 손실 시 = 진입가 * (1 - 1/레버리지)
      liquidationPrice = currentPrice * (1 - 0.9 / leverageNum);
    } else {
      // 숏: 마진 전액 손실 시 = 진입가 * (1 + 1/레버리지)
      liquidationPrice = currentPrice * (1 + 0.9 / leverageNum);
    }

    // 마진 차감
    await query('UPDATE user_wallets SET krw_balance = krw_balance - ? WHERE id = ?', [marginAmount, wallet.id]);

    // 포지션 생성
    const positionId = uuidv4();
    await query(
      `INSERT INTO futures_positions (id, wallet_id, stock_id, position_type, leverage, entry_price, quantity, margin_amount, liquidation_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [positionId, wallet.id, stock_id, position_type, leverageNum, currentPrice, quantityNum, marginAmount, liquidationPrice]
    );

    res.json({
      success: true,
      position: {
        id: positionId,
        position_type,
        leverage: leverageNum,
        entry_price: currentPrice,
        quantity: quantityNum,
        margin_amount: marginAmount,
        liquidation_price: parseFloat(liquidationPrice.toFixed(3)),
      },
    });
  } catch (error) {
    console.error('선물 포지션 열기 오류:', error);
    res.status(500).json({ error: '포지션 열기 실패' });
  }
});

// 선물 포지션 닫기
router.post('/close', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { position_id } = req.body;

    if (!position_id) {
      return res.status(400).json({ error: '포지션 ID를 입력해주세요' });
    }

    const positions = await query('SELECT * FROM futures_positions WHERE id = ? AND status = "OPEN"', [position_id]);
    if (positions.length === 0) {
      return res.status(404).json({ error: '열린 포지션을 찾을 수 없습니다' });
    }
    const position = positions[0];

    // 현재 가격 조회
    const stocks = await query('SELECT current_price FROM stocks WHERE id = ?', [position.stock_id]);
    const currentPrice = parseFloat(stocks[0].current_price);
    const entryPrice = parseFloat(position.entry_price);
    const quantity = parseFloat(position.quantity);
    const leverage = position.leverage;
    const marginAmount = parseFloat(position.margin_amount);

    // PnL 계산
    let pnl: number;
    if (position.position_type === 'LONG') {
      pnl = (currentPrice - entryPrice) / entryPrice * marginAmount * leverage;
    } else {
      pnl = (entryPrice - currentPrice) / entryPrice * marginAmount * leverage;
    }

    // 돌려받는 금액 = 마진 + PnL (최소 0)
    const returnAmount = Math.max(marginAmount + pnl, 0);

    // 잔액 반환
    await query('UPDATE user_wallets SET krw_balance = krw_balance + ? WHERE id = ?', [returnAmount, position.wallet_id]);

    // 포지션 닫기
    await query(
      'UPDATE futures_positions SET status = "CLOSED", realized_pnl = ?, closed_at = NOW() WHERE id = ?',
      [pnl, position_id]
    );

    res.json({
      success: true,
      pnl: parseFloat(pnl.toFixed(3)),
      return_amount: parseFloat(returnAmount.toFixed(3)),
      current_price: currentPrice,
    });
  } catch (error) {
    console.error('선물 포지션 닫기 오류:', error);
    res.status(500).json({ error: '포지션 닫기 실패' });
  }
});

// 내 포지션 조회
router.get('/positions/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;
    const { status = 'OPEN' } = req.query;

    const wallets = await query('SELECT id FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const positions = await query(
      `SELECT fp.*, s.symbol, s.name, s.current_price
       FROM futures_positions fp
       JOIN stocks s ON fp.stock_id = s.id
       WHERE fp.wallet_id = ? AND fp.status = ?
       ORDER BY fp.created_at DESC`,
      [wallets[0].id, status]
    );

    // 미실현 손익 계산
    const positionsWithPnl = positions.map((pos: any) => {
      const currentPrice = parseFloat(pos.current_price);
      const entryPrice = parseFloat(pos.entry_price);
      const marginAmount = parseFloat(pos.margin_amount);
      let unrealizedPnl: number;

      if (pos.position_type === 'LONG') {
        unrealizedPnl = (currentPrice - entryPrice) / entryPrice * marginAmount * pos.leverage;
      } else {
        unrealizedPnl = (entryPrice - currentPrice) / entryPrice * marginAmount * pos.leverage;
      }

      const pnlPercent = (unrealizedPnl / marginAmount) * 100;

      return {
        ...pos,
        unrealized_pnl: parseFloat(unrealizedPnl.toFixed(3)),
        pnl_percent: parseFloat(pnlPercent.toFixed(2)),
      };
    });

    res.json({ positions: positionsWithPnl });
  } catch (error) {
    console.error('포지션 조회 오류:', error);
    res.status(500).json({ error: '포지션 조회 실패' });
  }
});

export default router;
