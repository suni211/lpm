import express, { Request, Response } from 'express';
import { query } from '../database/db';
import bcrypt from 'bcrypt';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import bankService from '../services/bankService';

const router = express.Router();

// 관리자 로그인
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admins = await query('SELECT * FROM admins WHERE username = ?', [username]);

    if (admins.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    const admin = admins[0];

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    // 세션 설정
    req.session.adminId = admin.id;
    req.session.username = admin.username;

    // 마지막 로그인 시간 업데이트
    await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('관리자 로그인 오류:', error);
    res.status(500).json({ error: '로그인 실패' });
  }
});

// 관리자 로그아웃
router.post('/admin/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 실패' });
    }
    res.json({ success: true });
  });
});

// 현재 관리자 정보
router.get('/admin/me', isAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await query('SELECT id, username, role, created_at, last_login FROM admins WHERE id = ?', [
      req.session.adminId,
    ]);

    if (admins.length === 0) {
      return res.status(404).json({ error: '관리자를 찾을 수 없습니다' });
    }

    res.json({ admin: admins[0] });
  } catch (error) {
    console.error('관리자 정보 조회 오류:', error);
    res.status(500).json({ error: '관리자 정보 조회 실패' });
  }
});

// 사용자 로그인 (BANK 인증 코드 기반)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { auth_code } = req.body;

    if (!auth_code) {
      return res.status(400).json({ error: '인증 코드를 입력해주세요' });
    }

    // BANK 서버에서 로그인
    const bankResponse = await bankService.loginWithAuthCode(auth_code);
    
    if (!bankResponse.success || !bankResponse.user) {
      return res.status(401).json({ error: '인증 코드가 올바르지 않습니다' });
    }

    const bankUser = bankResponse.user;

    // BANK 계좌 정보 조회
    const accountData = await bankService.getAccountByUsername(bankUser.minecraft_username);
    
    if (!accountData.account) {
      return res.status(404).json({ error: 'BANK 계좌를 찾을 수 없습니다' });
    }

    const bankAccount = accountData.account;

    // 설문조사 완료 여부 확인
    const questionnaires = await query(
      'SELECT * FROM lico_questionnaires WHERE minecraft_username = ? AND is_approved = TRUE',
      [bankUser.minecraft_username]
    );

    const isQuestionnaireApproved = questionnaires.length > 0;

    // 세션 설정 (설문조사 완료 여부와 관계없이 로그인 성공)
    req.session.userId = bankUser.id;
    req.session.username = bankUser.minecraft_username;

    // LICO 지갑 조회 또는 생성
    let wallets = await query(
      'SELECT * FROM user_wallets WHERE minecraft_username = ?',
      [bankUser.minecraft_username]
    );

    let wallet;
    if (wallets.length === 0) {
      // 지갑이 없고 설문조사가 승인되지 않았으면 지갑 생성하지 않음
      if (!isQuestionnaireApproved) {
        return res.json({
          success: true,
          requires_questionnaire: true,
          user: {
            id: bankUser.id,
            minecraft_username: bankUser.minecraft_username,
            bank_account_number: bankAccount.account_number,
          },
        });
      }

      // 설문조사 승인되었으면 지갑 생성
      const { v4: uuidv4 } = require('uuid');
      const walletAddressService = require('../services/walletAddressService').default;
      const walletAddress = await walletAddressService.generateWalletAddress(bankUser.minecraft_username);

      const walletId = uuidv4();
      await query(
        `INSERT INTO user_wallets
         (id, wallet_address, minecraft_username, minecraft_uuid, bank_account_number, questionnaire_completed)
         VALUES (?, ?, ?, ?, ?, TRUE)`,
        [walletId, walletAddress, bankUser.minecraft_username, bankUser.minecraft_uuid, bankAccount.account_number]
      );

      wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [walletId]);
      wallet = wallets[0];
    } else {
      wallet = wallets[0];
      
      // BANK 계좌 번호 동기화
      if (wallet.bank_account_number !== bankAccount.account_number) {
        await query(
          'UPDATE user_wallets SET bank_account_number = ? WHERE id = ?',
          [bankAccount.account_number, wallet.id]
        );
      }
    }

    res.json({
      success: true,
      requires_questionnaire: !isQuestionnaireApproved,
      user: {
        id: bankUser.id,
        minecraft_username: bankUser.minecraft_username,
        wallet_address: wallet?.wallet_address || null,
        bank_account_number: bankAccount.account_number,
      },
    });
  } catch (error: any) {
    console.error('사용자 로그인 오류:', error);
    res.status(500).json({ error: error.message || '로그인 실패' });
  }
});

// 사용자 로그아웃
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 실패' });
    }
    res.json({ success: true });
  });
});

// 현재 사용자 정보
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const wallets = await query(
      'SELECT * FROM user_wallets WHERE minecraft_username = ?',
      [req.session.username]
    );

    // 지갑이 없으면 (설문조사 미완료 상태) 기본 정보만 반환
    if (wallets.length === 0) {
      // BANK 계좌 정보 조회
      let bankAccount = null;
      try {
        const accountData = await bankService.getAccountByUsername(req.session.username || '');
        bankAccount = accountData.account;
      } catch (error) {
        console.error('BANK 계좌 조회 실패:', error);
      }

      return res.json({
        user: {
          minecraft_username: req.session.username,
          wallet_address: null,
          bank_account_number: bankAccount?.account_number || null,
          gold_balance: 0,
          requires_questionnaire: true,
        },
      });
    }

    const wallet = wallets[0];

    // BANK 잔액 동기화
    try {
      const balanceData = await bankService.getAccountBalance(req.session.username || '');
      if (balanceData.account) {
        await query(
          'UPDATE user_wallets SET gold_balance = ? WHERE id = ?',
          [balanceData.account.balance, wallet.id]
        );
        wallet.gold_balance = balanceData.account.balance;
      }
    } catch (error) {
      console.error('BANK 잔액 동기화 실패:', error);
    }

    res.json({
      user: {
        minecraft_username: wallet.minecraft_username,
        wallet_address: wallet.wallet_address,
        bank_account_number: wallet.bank_account_number,
        gold_balance: wallet.gold_balance,
        requires_questionnaire: false,
      },
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
});

export default router;

