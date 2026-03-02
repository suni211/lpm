import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 옵션 계약 목록 조회
router.get('/contracts', async (req: Request, res: Response) => {
  try {
    const { stock_id, option_type } = req.query;

    let sql = `SELECT oc.*, s.symbol, s.name, s.current_price
               FROM options_contracts oc
               JOIN stocks s ON oc.stock_id = s.id
               WHERE oc.status = 'ACTIVE' AND oc.expiry_date > NOW() AND oc.remaining_supply > 0`;
    const params: any[] = [];

    if (stock_id) {
      sql += ' AND oc.stock_id = ?';
      params.push(stock_id);
    }
    if (option_type) {
      sql += ' AND oc.option_type = ?';
      params.push(option_type);
    }

    sql += ' ORDER BY oc.expiry_date ASC, oc.strike_price ASC';

    const contracts = await query(sql, params);

    // 각 계약에 내재가치 계산 추가
    const contractsWithValue = contracts.map((c: any) => {
      const currentPrice = parseFloat(c.current_price);
      const strikePrice = parseFloat(c.strike_price);
      let intrinsicValue = 0;

      if (c.option_type === 'CALL') {
        intrinsicValue = Math.max(currentPrice - strikePrice, 0);
      } else {
        intrinsicValue = Math.max(strikePrice - currentPrice, 0);
      }

      return {
        ...c,
        intrinsic_value: parseFloat(intrinsicValue.toFixed(3)),
        in_the_money: intrinsicValue > 0,
      };
    });

    res.json({ contracts: contractsWithValue });
  } catch (error) {
    console.error('옵션 계약 조회 오류:', error);
    res.status(500).json({ error: '옵션 계약 조회 실패' });
  }
});

// 옵션 계약 생성 (관리자)
router.post('/contracts/create', isAdmin, async (req: Request, res: Response) => {
  try {
    const { stock_id, option_type, strike_price, premium, expiry_days, total_supply } = req.body;

    if (!stock_id || !option_type || !strike_price || !premium || !expiry_days) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(expiry_days));

    const contractId = uuidv4();
    await query(
      `INSERT INTO options_contracts (id, stock_id, option_type, strike_price, premium, expiry_date, total_supply, remaining_supply)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [contractId, stock_id, option_type, strike_price, premium, expiryDate, total_supply || 100, total_supply || 100]
    );

    res.json({ success: true, contract_id: contractId });
  } catch (error) {
    console.error('옵션 계약 생성 오류:', error);
    res.status(500).json({ error: '옵션 계약 생성 실패' });
  }
});

// 옵션 매수
router.post('/buy', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address, contract_id, quantity } = req.body;

    if (!wallet_address || !contract_id || !quantity) {
      return res.status(400).json({ error: '필수 항목을 모두 입력해주세요' });
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      return res.status(400).json({ error: '유효한 수량을 입력해주세요' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }
    const wallet = wallets[0];

    // 계약 조회
    const contracts = await query(
      'SELECT * FROM options_contracts WHERE id = ? AND status = "ACTIVE" AND expiry_date > NOW()',
      [contract_id]
    );
    if (contracts.length === 0) {
      return res.status(404).json({ error: '유효한 옵션 계약을 찾을 수 없습니다' });
    }
    const contract = contracts[0];

    if (contract.remaining_supply < qty) {
      return res.status(400).json({ error: '잔여 공급량이 부족합니다' });
    }

    // 총 비용 (프리미엄 × 수량)
    const totalCost = parseFloat(contract.premium) * qty;
    const balance = parseFloat(wallet.krw_balance || '0');

    if (balance < totalCost) {
      return res.status(400).json({
        error: '잔액이 부족합니다',
        required: totalCost,
        available: balance,
      });
    }

    // 잔액 차감
    await query('UPDATE user_wallets SET krw_balance = krw_balance - ? WHERE id = ?', [totalCost, wallet.id]);

    // 공급량 감소
    await query('UPDATE options_contracts SET remaining_supply = remaining_supply - ? WHERE id = ?', [qty, contract_id]);

    // 보유 기록 생성
    const holdingId = uuidv4();
    await query(
      `INSERT INTO options_holdings (id, wallet_id, contract_id, quantity, purchase_price)
       VALUES (?, ?, ?, ?, ?)`,
      [holdingId, wallet.id, contract_id, qty, contract.premium]
    );

    res.json({
      success: true,
      holding_id: holdingId,
      total_cost: totalCost,
    });
  } catch (error) {
    console.error('옵션 매수 오류:', error);
    res.status(500).json({ error: '옵션 매수 실패' });
  }
});

// 옵션 행사
router.post('/exercise', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { holding_id } = req.body;

    if (!holding_id) {
      return res.status(400).json({ error: '보유 ID를 입력해주세요' });
    }

    const holdings = await query(
      `SELECT oh.*, oc.stock_id, oc.option_type, oc.strike_price, oc.expiry_date
       FROM options_holdings oh
       JOIN options_contracts oc ON oh.contract_id = oc.id
       WHERE oh.id = ? AND oh.status = 'HOLDING'`,
      [holding_id]
    );

    if (holdings.length === 0) {
      return res.status(404).json({ error: '보유한 옵션을 찾을 수 없습니다' });
    }
    const holding = holdings[0];

    // 만기 확인
    if (new Date(holding.expiry_date) < new Date()) {
      await query('UPDATE options_holdings SET status = "EXPIRED" WHERE id = ?', [holding_id]);
      return res.status(400).json({ error: '만기가 지난 옵션입니다' });
    }

    // 현재 가격 조회
    const stocks = await query('SELECT current_price FROM stocks WHERE id = ?', [holding.stock_id]);
    const currentPrice = parseFloat(stocks[0].current_price);
    const strikePrice = parseFloat(holding.strike_price);

    // 행사 수익 계산
    let profit = 0;
    if (holding.option_type === 'CALL') {
      profit = Math.max((currentPrice - strikePrice) * holding.quantity, 0);
    } else {
      profit = Math.max((strikePrice - currentPrice) * holding.quantity, 0);
    }

    if (profit <= 0) {
      return res.status(400).json({ error: '행사 수익이 없습니다 (외가격 상태)' });
    }

    // 수익 지급
    await query('UPDATE user_wallets SET krw_balance = krw_balance + ? WHERE id = ?', [profit, holding.wallet_id]);

    // 상태 업데이트
    await query('UPDATE options_holdings SET status = "EXERCISED", exercised_at = NOW() WHERE id = ?', [holding_id]);

    res.json({
      success: true,
      profit: parseFloat(profit.toFixed(3)),
      current_price: currentPrice,
      strike_price: strikePrice,
    });
  } catch (error) {
    console.error('옵션 행사 오류:', error);
    res.status(500).json({ error: '옵션 행사 실패' });
  }
});

// 내 옵션 보유 조회
router.get('/holdings/:wallet_address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const wallets = await query('SELECT id FROM user_wallets WHERE wallet_address = ?', [wallet_address]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const holdings = await query(
      `SELECT oh.*, oc.stock_id, oc.option_type, oc.strike_price, oc.premium, oc.expiry_date,
              s.symbol, s.name, s.current_price
       FROM options_holdings oh
       JOIN options_contracts oc ON oh.contract_id = oc.id
       JOIN stocks s ON oc.stock_id = s.id
       WHERE oh.wallet_id = ?
       ORDER BY oh.created_at DESC`,
      [wallets[0].id]
    );

    // 현재 가치 계산
    const holdingsWithValue = holdings.map((h: any) => {
      const currentPrice = parseFloat(h.current_price);
      const strikePrice = parseFloat(h.strike_price);
      let intrinsicValue = 0;

      if (h.option_type === 'CALL') {
        intrinsicValue = Math.max(currentPrice - strikePrice, 0) * h.quantity;
      } else {
        intrinsicValue = Math.max(strikePrice - currentPrice, 0) * h.quantity;
      }

      const totalCost = parseFloat(h.purchase_price) * h.quantity;

      return {
        ...h,
        intrinsic_value: parseFloat(intrinsicValue.toFixed(3)),
        total_cost: parseFloat(totalCost.toFixed(3)),
        pnl: parseFloat((intrinsicValue - totalCost).toFixed(3)),
        in_the_money: intrinsicValue > 0,
      };
    });

    res.json({ holdings: holdingsWithValue });
  } catch (error) {
    console.error('옵션 보유 조회 오류:', error);
    res.status(500).json({ error: '옵션 보유 조회 실패' });
  }
});

export default router;
