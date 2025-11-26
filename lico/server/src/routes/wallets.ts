import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import walletAddressService from '../services/walletAddressService';
import recoveryWordsService from '../services/recoveryWords';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 지갑 생성 (설문조사 통과한 사용자만)
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { minecraft_username, minecraft_uuid, bank_account_number } = req.body;

    // 설문조사 통과 확인
    const questionnaires = await query(
      'SELECT * FROM lico_questionnaires WHERE minecraft_username = ? AND is_approved = TRUE',
      [minecraft_username]
    );

    if (questionnaires.length === 0) {
      return res.status(403).json({
        error: 'LICO 가입 설문조사를 통과하지 못했습니다',
        message: '설문조사에서 90점 이상을 획득해야 지갑을 생성할 수 있습니다',
      });
    }

    // 이미 지갑이 있는지 확인
    const existing = await query(
      'SELECT * FROM user_wallets WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 지갑이 생성되었습니다' });
    }

    // 지갑 주소 생성 (32자)
    const walletAddress = await walletAddressService.generateWalletAddress(minecraft_username);
    
    // 복구 단어 생성 (6개)
    const recoveryWords = recoveryWordsService.generateRecoveryWords();
    const recoveryWordsHash = recoveryWordsService.hashRecoveryWords(recoveryWords);

    // 지갑 생성
    const walletId = uuidv4();
    await query(
      `INSERT INTO user_wallets
       (id, wallet_address, minecraft_username, minecraft_uuid, bank_account_number, questionnaire_completed, recovery_words_hash, address_shown)
       VALUES (?, ?, ?, ?, ?, TRUE, ?, FALSE)`,
      [walletId, walletAddress, minecraft_username, minecraft_uuid, bank_account_number, recoveryWordsHash]
    );

    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [walletId]);

    res.json({
      success: true,
      wallet: {
        ...wallets[0],
        wallet_address: walletAddress, // 한 번만 표시
        recovery_words: recoveryWords, // 한 번만 표시
      },
    });
  } catch (error) {
    console.error('지갑 생성 오류:', error);
    res.status(500).json({ error: '지갑 생성 실패' });
  }
});

// 지갑 조회 (지갑 주소로) - BANK 연동용 (주소만 확인)
router.get('/address/:wallet_address', async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];
    
    // 민감한 정보 제외하고 반환 (BANK 연동용)
    res.json({ 
      wallet: {
        wallet_address: wallet.wallet_address,
        minecraft_username: wallet.minecraft_username,
        gold_balance: wallet.gold_balance,
        status: wallet.status,
      }
    });
  } catch (error) {
    console.error('지갑 조회 오류:', error);
    res.status(500).json({ error: '지갑 조회 실패' });
  }
});

// 지갑 조회 (Minecraft 사용자명으로)
router.get('/username/:minecraft_username', async (req: Request, res: Response) => {
  try {
    const { minecraft_username } = req.params;

    const wallets = await query('SELECT * FROM user_wallets WHERE minecraft_username = ?', [
      minecraft_username,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    res.json({ wallet: wallets[0] });
  } catch (error) {
    console.error('지갑 조회 오류:', error);
    res.status(500).json({ error: '지갑 조회 실패' });
  }
});

// 내 코인 보유 현황 - 로그인 필요
router.get('/:wallet_address/balances', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    // 코인 보유 현황 조회
    const balances = await query(
      `SELECT ucb.*, c.symbol, c.name, c.current_price, c.logo_url
       FROM user_coin_balances ucb
       JOIN coins c ON ucb.coin_id = c.id
       WHERE ucb.wallet_id = ? AND ucb.total_amount > 0
       ORDER BY (ucb.total_amount * c.current_price) DESC`,
      [wallet.id]
    );

    res.json({
      wallet: {
        wallet_address: wallet.wallet_address,
        gold_balance: wallet.gold_balance,
        minecraft_username: wallet.minecraft_username,
      },
      balances,
    });
  } catch (error) {
    console.error('보유 현황 조회 오류:', error);
    res.status(500).json({ error: '보유 현황 조회 실패' });
  }
});

// Bank에서 LICO로 입금
router.post('/deposit', async (req: Request, res: Response) => {
  try {
    const { wallet_address, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: '입금 금액은 0보다 커야 합니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    // Gold 잔액 증가
    await query('UPDATE user_wallets SET gold_balance = gold_balance + ?, total_deposit = total_deposit + ? WHERE wallet_address = ?', [
      amount,
      amount,
      wallet_address,
    ]);

    res.json({
      success: true,
      message: `${amount} Gold가 입금되었습니다`,
    });
  } catch (error) {
    console.error('입금 오류:', error);
    res.status(500).json({ error: '입금 실패' });
  }
});

// LICO에서 Bank로 출금 (5% 수수료)
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const { wallet_address, amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: '출금 금액은 0보다 커야 합니다' });
    }

    // 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE wallet_address = ?', [
      wallet_address,
    ]);

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    // 5% 출금 수수료
    const fee = Math.floor(amount * 0.05);
    const totalDeduction = amount + fee;

    if (wallet.gold_balance < totalDeduction) {
      return res.status(400).json({
        error: '잔액이 부족합니다',
        required: totalDeduction,
        available: wallet.gold_balance,
        fee,
      });
    }

    // Gold 잔액 차감
    await query(
      'UPDATE user_wallets SET gold_balance = gold_balance - ?, total_withdrawal = total_withdrawal + ? WHERE wallet_address = ?',
      [totalDeduction, amount, wallet_address]
    );

    res.json({
      success: true,
      amount,
      fee,
      total: totalDeduction,
      message: `${amount} Gold가 출금되었습니다 (수수료: ${fee} Gold)`,
    });
  } catch (error) {
    console.error('출금 오류:', error);
    res.status(500).json({ error: '출금 실패' });
  }
});

// 복구 단어로 지갑 주소 확인
router.post('/recover-address', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { recovery_words } = req.body;

    if (!recovery_words || !Array.isArray(recovery_words) || recovery_words.length !== 6) {
      return res.status(400).json({ error: '복구 단어 6개를 모두 입력해주세요' });
    }

    // 현재 사용자의 지갑 조회
    const wallets = await query(
      'SELECT * FROM user_wallets WHERE minecraft_username = ?',
      [req.session.username]
    );

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    const wallet = wallets[0];

    // 복구 단어 검증
    if (!wallet.recovery_words_hash) {
      return res.status(400).json({ error: '복구 단어가 설정되지 않은 지갑입니다' });
    }

    const isValid = recoveryWordsService.verifyRecoveryWords(recovery_words, wallet.recovery_words_hash);

    if (!isValid) {
      return res.status(401).json({ error: '복구 단어가 일치하지 않습니다' });
    }

    // 지갑 주소 반환
    res.json({
      success: true,
      wallet_address: wallet.wallet_address,
    });
  } catch (error) {
    console.error('지갑 주소 복구 오류:', error);
    res.status(500).json({ error: '지갑 주소 복구 실패' });
  }
});

// 복구 단어 목록 조회 (사용자가 선택할 수 있도록)
router.get('/recovery-words-list', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const wordsList = recoveryWordsService.getRecoveryWordsList();
    res.json({ words: wordsList });
  } catch (error) {
    console.error('복구 단어 목록 조회 오류:', error);
    res.status(500).json({ error: '복구 단어 목록 조회 실패' });
  }
});

// 지갑 주소 표시 플래그 업데이트 (한 번 표시 후 true로 설정)
router.post('/mark-address-shown', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const wallets = await query(
      'SELECT * FROM user_wallets WHERE minecraft_username = ?',
      [req.session.username]
    );

    if (wallets.length === 0) {
      return res.status(404).json({ error: '지갑을 찾을 수 없습니다' });
    }

    await query(
      'UPDATE user_wallets SET address_shown = TRUE WHERE minecraft_username = ?',
      [req.session.username]
    );

    res.json({ success: true, message: '지갑 주소 표시 완료' });
  } catch (error) {
    console.error('지갑 주소 표시 플래그 업데이트 오류:', error);
    res.status(500).json({ error: '업데이트 실패' });
  }
});

export default router;
