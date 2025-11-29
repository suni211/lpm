import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated, isAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * 밈 코인 발행 신청 생성
 * POST /api/meme-applications
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      coin_name,
      coin_symbol,
      coin_description,
      image_url,
      initial_supply,
      can_creator_trade,
      is_supply_limited,
    } = req.body;

    const walletAddress = (req as any).user.wallet_address;

    // Validation
    if (!coin_name || !coin_symbol || !initial_supply) {
      return res.status(400).json({ error: '필수 정보를 모두 입력해주세요.' });
    }

    if (parseFloat(initial_supply) <= 0) {
      return res.status(400).json({ error: '초기 발행량은 0보다 커야 합니다.' });
    }

    // 심볼 중복 체크
    const existingCoin = await query('SELECT id FROM coins WHERE symbol = ?', [coin_symbol]);
    if (existingCoin.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 코인 심볼입니다.' });
    }

    // 대기 중인 신청서에서도 심볼 중복 체크
    const existingApplication = await query(
      'SELECT id FROM meme_coin_applications WHERE coin_symbol = ? AND status = "PENDING"',
      [coin_symbol]
    );
    if (existingApplication.length > 0) {
      return res.status(400).json({ error: '해당 심볼로 대기 중인 신청이 있습니다.' });
    }

    // Wallet 정보 가져오기
    const wallets = await query('SELECT id FROM wallets WHERE wallet_address = ?', [walletAddress]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다.' });
    }
    const walletId = wallets[0].id;

    // CYC 코인 정보 가져오기
    const cycCoins = await query('SELECT id, current_price FROM coins WHERE symbol = "CYC"', []);
    if (cycCoins.length === 0) {
      return res.status(500).json({ error: 'CYC 코인을 찾을 수 없습니다.' });
    }
    const cycCoin = cycCoins[0];
    const cycPriceInGold = typeof cycCoin.current_price === 'string'
      ? parseFloat(cycCoin.current_price)
      : cycCoin.current_price;

    // 사용자의 CYC 잔액 확인
    const balances = await query(
      'SELECT available_amount FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, cycCoin.id]
    );

    const initialCapitalCYC = 50000; // 초기 자본 50,000 CYC
    const listingFeeCYC = initialCapitalCYC * 0.1; // 10% 수수료 (5,000 CYC)
    const totalRequiredCYC = initialCapitalCYC + listingFeeCYC; // 55,000 CYC

    if (balances.length === 0 || parseFloat(balances[0].available_amount) < totalRequiredCYC) {
      return res.status(400).json({
        error: `밈 코인 발행에는 ${totalRequiredCYC.toLocaleString()} CYC가 필요합니다. (초기 자본 ${initialCapitalCYC.toLocaleString()} + 수수료 ${listingFeeCYC.toLocaleString()})`,
      });
    }

    // 초기 가격 계산
    // 55,000 CYC를 initial_supply로 나눔
    // 예: 10,000개 발행 시 → 5.5 CYC/코인
    const calculatedPriceCYC = totalRequiredCYC / parseFloat(initial_supply);

    // 거래 잠금 일수 설정
    const tradingLockDays = can_creator_trade ? 0 : 7;

    // 신청서 생성
    const applicationId = uuidv4();
    await query(
      `INSERT INTO meme_coin_applications (
        id, applicant_wallet_id, coin_name, coin_symbol, coin_description, image_url,
        initial_supply, can_creator_trade, trading_lock_days, is_supply_limited,
        initial_capital_cyc, listing_fee_cyc, calculated_price, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        applicationId,
        walletId,
        coin_name,
        coin_symbol,
        coin_description || null,
        image_url || null,
        initial_supply,
        can_creator_trade,
        tradingLockDays,
        is_supply_limited,
        initialCapitalCYC,
        listingFeeCYC,
        calculatedPriceCYC,
      ]
    );

    // CYC 잔액 잠금 (신청서 승인 전까지)
    await query(
      `UPDATE user_coin_balances
       SET available_amount = available_amount - ?, locked_amount = locked_amount + ?
       WHERE wallet_id = ? AND coin_id = ?`,
      [totalRequiredCYC, totalRequiredCYC, walletId, cycCoin.id]
    );

    res.json({
      message: '밈 코인 발행 신청이 완료되었습니다. 관리자 승인을 기다려주세요.',
      application: {
        id: applicationId,
        coin_name,
        coin_symbol,
        initial_supply,
        calculated_price_cyc: calculatedPriceCYC,
        calculated_price_gold: calculatedPriceCYC * cycPriceInGold,
        total_required_cyc: totalRequiredCYC,
        status: 'PENDING',
      },
    });
  } catch (error) {
    console.error('밈 코인 신청 오류:', error);
    res.status(500).json({ error: '밈 코인 신청 실패' });
  }
});

/**
 * 내 신청 내역 조회
 * GET /api/meme-applications/my
 */
router.get('/my', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).user.wallet_address;

    const wallets = await query('SELECT id FROM wallets WHERE wallet_address = ?', [walletAddress]);
    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다.' });
    }

    const applications = await query(
      `SELECT * FROM meme_coin_applications
       WHERE applicant_wallet_id = ?
       ORDER BY created_at DESC`,
      [wallets[0].id]
    );

    res.json({ applications });
  } catch (error) {
    console.error('신청 내역 조회 오류:', error);
    res.status(500).json({ error: '신청 내역 조회 실패' });
  }
});

/**
 * 모든 신청 내역 조회 (관리자)
 * GET /api/meme-applications/all
 */
router.get('/all', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT
        ma.*,
        w.wallet_address as applicant_address,
        u.username as applicant_username
      FROM meme_coin_applications ma
      JOIN wallets w ON ma.applicant_wallet_id = w.id
      LEFT JOIN users u ON w.user_id = u.id
    `;

    const params: any[] = [];
    if (status) {
      sql += ' WHERE ma.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY ma.created_at DESC';

    const applications = await query(sql, params);
    res.json({ applications });
  } catch (error) {
    console.error('전체 신청 내역 조회 오류:', error);
    res.status(500).json({ error: '전체 신청 내역 조회 실패' });
  }
});

/**
 * 신청 승인 (관리자)
 * POST /api/meme-applications/:id/approve
 */
router.post('/:id/approve', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_comment } = req.body;
    const adminWalletAddress = (req as any).user.wallet_address;

    // 관리자 wallet_id
    const adminWallets = await query('SELECT id FROM wallets WHERE wallet_address = ?', [adminWalletAddress]);
    if (adminWallets.length === 0) {
      return res.status(404).json({ error: '관리자 지갑을 찾을 수 없습니다.' });
    }
    const adminWalletId = adminWallets[0].id;

    // 신청서 조회
    const applications = await query('SELECT * FROM meme_coin_applications WHERE id = ?', [id]);
    if (applications.length === 0) {
      return res.status(404).json({ error: '신청서를 찾을 수 없습니다.' });
    }

    const application = applications[0];

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: '이미 처리된 신청서입니다.' });
    }

    // CYC 코인 정보
    const cycCoins = await query('SELECT id, current_price FROM coins WHERE symbol = "CYC"', []);
    if (cycCoins.length === 0) {
      return res.status(500).json({ error: 'CYC 코인을 찾을 수 없습니다.' });
    }
    const cycCoin = cycCoins[0];

    // 초기 가격 (골드 기준)
    const cycPriceInGold = typeof cycCoin.current_price === 'string'
      ? parseFloat(cycCoin.current_price)
      : cycCoin.current_price;
    const initialPriceGold = parseFloat(application.calculated_price) * cycPriceInGold;

    // 1. 새 코인 생성
    const newCoinId = uuidv4();
    await query(
      `INSERT INTO coins (
        id, name, symbol, description, image_url, current_price, coin_type,
        total_supply, circulating_supply, base_currency_id,
        creator_wallet_id, is_supply_limited, creator_can_trade, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'MEME', ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        newCoinId,
        application.coin_name,
        application.coin_symbol,
        application.coin_description,
        application.image_url,
        initialPriceGold, // 골드 기준 초기 가격
        application.initial_supply,
        application.initial_supply,
        cycCoin.id, // base_currency_id는 CYC
        application.applicant_wallet_id,
        application.is_supply_limited,
        application.can_creator_trade,
      ]
    );

    // 2. 생성자에게 초기 발행량 지급
    await query(
      `INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, locked_amount)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE available_amount = available_amount + ?`,
      [
        uuidv4(),
        application.applicant_wallet_id,
        newCoinId,
        application.initial_supply,
        application.initial_supply,
      ]
    );

    // 3. CYC 잠금 해제 및 차감
    const totalCYC = parseFloat(application.initial_capital_cyc) + parseFloat(application.listing_fee_cyc);
    await query(
      `UPDATE user_coin_balances
       SET locked_amount = locked_amount - ?
       WHERE wallet_id = ? AND coin_id = ?`,
      [totalCYC, application.applicant_wallet_id, cycCoin.id]
    );

    // 4. 수수료 차감 (실제로는 소각하거나 거래소 지갑으로)
    // 여기서는 그냥 차감만 함
    await query(
      `UPDATE user_coin_balances
       SET available_amount = available_amount - ?
       WHERE wallet_id = ? AND coin_id = ?`,
      [parseFloat(application.listing_fee_cyc), application.applicant_wallet_id, cycCoin.id]
    );

    // 5. 신청서 상태 업데이트
    await query(
      `UPDATE meme_coin_applications
       SET status = 'APPROVED', created_coin_id = ?, reviewed_by = ?, reviewed_at = NOW(), admin_comment = ?
       WHERE id = ?`,
      [newCoinId, adminWalletId, admin_comment || null, id]
    );

    res.json({
      message: '밈 코인 발행이 승인되었습니다.',
      coin: {
        id: newCoinId,
        name: application.coin_name,
        symbol: application.coin_symbol,
        initial_price: initialPriceGold,
      },
    });
  } catch (error) {
    console.error('밈 코인 승인 오류:', error);
    res.status(500).json({ error: '밈 코인 승인 실패' });
  }
});

/**
 * 신청 거부 (관리자)
 * POST /api/meme-applications/:id/reject
 */
router.post('/:id/reject', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { admin_comment } = req.body;
    const adminWalletAddress = (req as any).user.wallet_address;

    // 관리자 wallet_id
    const adminWallets = await query('SELECT id FROM wallets WHERE wallet_address = ?', [adminWalletAddress]);
    if (adminWallets.length === 0) {
      return res.status(404).json({ error: '관리자 지갑을 찾을 수 없습니다.' });
    }
    const adminWalletId = adminWallets[0].id;

    // 신청서 조회
    const applications = await query('SELECT * FROM meme_coin_applications WHERE id = ?', [id]);
    if (applications.length === 0) {
      return res.status(404).json({ error: '신청서를 찾을 수 없습니다.' });
    }

    const application = applications[0];

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: '이미 처리된 신청서입니다.' });
    }

    // CYC 코인 정보
    const cycCoins = await query('SELECT id FROM coins WHERE symbol = "CYC"', []);
    if (cycCoins.length === 0) {
      return res.status(500).json({ error: 'CYC 코인을 찾을 수 없습니다.' });
    }
    const cycCoin = cycCoins[0];

    // CYC 잠금 해제 (환불)
    const totalCYC = parseFloat(application.initial_capital_cyc) + parseFloat(application.listing_fee_cyc);
    await query(
      `UPDATE user_coin_balances
       SET locked_amount = locked_amount - ?, available_amount = available_amount + ?
       WHERE wallet_id = ? AND coin_id = ?`,
      [totalCYC, totalCYC, application.applicant_wallet_id, cycCoin.id]
    );

    // 신청서 상태 업데이트
    await query(
      `UPDATE meme_coin_applications
       SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW(), admin_comment = ?
       WHERE id = ?`,
      [adminWalletId, admin_comment || '승인 거부', id]
    );

    res.json({
      message: '밈 코인 발행이 거부되었습니다. CYC가 환불되었습니다.',
    });
  } catch (error) {
    console.error('밈 코인 거부 오류:', error);
    res.status(500).json({ error: '밈 코인 거부 실패' });
  }
});

export default router;
