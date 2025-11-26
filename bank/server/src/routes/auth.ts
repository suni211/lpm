import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query, pool } from '../database/db';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import minecraftService from '../services/minecraftService';

const router = express.Router();

// 32자 인증 코드 생성
function generateAuthCode(): string {
  return crypto.randomBytes(16).toString('hex'); // 32자 hex 문자열
}

// 회원가입
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      username,
      password,
      email,
      minecraft_username,
      security_answer_1,  // 학교
      security_answer_2,  // 좋아하는 동물
      security_answer_3   // 좋아하는 선수
    } = req.body;

    // 입력 검증
    if (!username || !password || !email || !minecraft_username ||
        !security_answer_1 || !security_answer_2 || !security_answer_3) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요' });
    }

    // 아이디 유효성 검사 (4-20자, 영문+숫자)
    if (!/^[a-zA-Z0-9]{4,20}$/.test(username)) {
      return res.status(400).json({ error: '아이디는 4-20자의 영문과 숫자만 가능합니다' });
    }

    // 비밀번호 유효성 검사 (최소 8자)
    if (password.length < 8) {
      return res.status(400).json({ error: '비밀번호는 최소 8자 이상이어야 합니다' });
    }

    // 이메일 유효성 검사
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식이 아닙니다' });
    }

    // 마인크래프트 닉네임 유효성 검사
    if (!minecraftService.isValidMinecraftUsername(minecraft_username)) {
      return res.status(400).json({ error: '올바른 마인크래프트 닉네임이 아닙니다 (3-16자, 영문/숫자/_만 가능)' });
    }

    // 마인크래프트 API로 닉네임 검증 및 UUID 조회
    const minecraft_uuid = await minecraftService.getMinecraftUUID(minecraft_username);
    if (!minecraft_uuid) {
      return res.status(400).json({ error: '존재하지 않는 마인크래프트 닉네임입니다. 정품 계정만 가입 가능합니다.' });
    }

    // 중복 확인
    const existingUsers = await query(
      'SELECT id FROM users WHERE username = ? OR email = ? OR minecraft_username = ? OR minecraft_uuid = ?',
      [username, email, minecraft_username, minecraft_uuid]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디, 이메일 또는 마인크래프트 계정입니다' });
    }

    // 32자 인증 코드 생성
    const authCode = generateAuthCode();

    // 인증 코드, 비밀번호, 보안 답변 해싱
    const hashedAuthCode = await bcrypt.hash(authCode, 10);
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedAnswer1 = await bcrypt.hash(security_answer_1.toLowerCase().trim(), 10);
    const hashedAnswer2 = await bcrypt.hash(security_answer_2.toLowerCase().trim(), 10);
    const hashedAnswer3 = await bcrypt.hash(security_answer_3.toLowerCase().trim(), 10);

    // UUID 생성
    const userId = crypto.randomUUID();

    // 계좌번호 생성 (랜덤 16자리: 1234-5678-9012-3456) - 중복 체크
    let accountNumber: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      accountNumber = Array.from({ length: 4 }, () =>
        Math.floor(1000 + Math.random() * 9000)
      ).join('-');
      
      const existingAccount = await query(
        'SELECT id FROM accounts WHERE account_number = ?',
        [accountNumber]
      );
      
      if (existingAccount.length === 0) {
        break; // 중복 없음
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('계좌번호 생성 실패: 최대 시도 횟수 초과');
      }
    } while (true);

    // 계좌 ID 생성
    const accountId = crypto.randomUUID();

    // 트랜잭션으로 사용자 및 계좌 생성
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 사용자 생성
      await connection.query(
        `INSERT INTO users (
          id, auth_code, username, password, email, minecraft_username, minecraft_uuid,
          security_question_1, security_answer_1,
          security_question_2, security_answer_2,
          security_question_3, security_answer_3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, hashedAuthCode, username, hashedPassword, email, minecraft_username, minecraft_uuid,
          '다니는 학교 또는 다녔던 학교는?', hashedAnswer1,
          '좋아하는 동물은?', hashedAnswer2,
          '좋아하는 선수는?', hashedAnswer3
        ]
      );

      // 기본 계좌 생성 (회원가입 시 자동 생성하지 않음 - 사용자가 직접 생성)
      // 계좌는 /api/accounts/create 엔드포인트를 통해 생성

      await connection.commit();
    } catch (dbError: any) {
      await connection.rollback();
      console.error('트랜잭션 롤백:', dbError);
      throw dbError;
    } finally {
      connection.release();
    }

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다. 아래 인증 코드를 안전하게 보관하세요. 분실 시 복구에 필요합니다.',
      auth_code: authCode,
      user: {
        username,
        email,
        minecraft_username
      }
    });
  } catch (error: any) {
    console.error('회원가입 오류:', error);
    console.error('오류 상세:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
    });
    
    // 데이터베이스 오류인 경우 더 자세한 정보 제공
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: '이미 사용 중인 정보입니다',
        details: error.sqlMessage 
      });
    }
    
    res.status(500).json({ 
      error: '회원가입 처리 중 오류가 발생했습니다',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 로그인 (인증 코드 기반)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { auth_code } = req.body;

    if (!auth_code) {
      return res.status(400).json({ error: '인증 코드를 입력해주세요' });
    }

    // 인증 코드 길이 확인 (32자)
    if (auth_code.length !== 32) {
      return res.status(400).json({ error: '올바른 인증 코드 형식이 아닙니다 (32자)' });
    }

    // 모든 활성 사용자 조회
    const users = await query(
      'SELECT * FROM users WHERE status = ?',
      ['ACTIVE']
    );

    // 인증 코드 매칭
    let matchedUser = null;
    for (const user of users) {
      const isValid = await bcrypt.compare(auth_code, user.auth_code);
      if (isValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ error: '올바르지 않은 인증 코드입니다' });
    }

    // 세션 저장
    req.session.userId = matchedUser.id;
    req.session.username = matchedUser.minecraft_username;

    // 마지막 로그인 시간 업데이트
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [matchedUser.id]);

    res.json({
      success: true,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        minecraft_username: matchedUser.minecraft_username,
      },
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다' });
  }
});

// 로그아웃
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '로그아웃 실패' });
    }
    res.json({ success: true });
  });
});

// 인증 코드 복구 (3단계 검증)
router.post('/recover-auth-code', async (req: Request, res: Response) => {
  try {
    const {
      email,
      username,
      password,
      minecraft_uuid,
      security_answer_1,
      security_answer_2,
      security_answer_3
    } = req.body;

    // 모든 필드 필수
    if (!email || !username || !password || !minecraft_uuid ||
        !security_answer_1 || !security_answer_2 || !security_answer_3) {
      return res.status(400).json({ error: '모든 복구 정보를 입력해주세요' });
    }

    // 1단계: 이메일로 사용자 조회
    const users = await query(
      'SELECT * FROM users WHERE email = ? AND status = ?',
      [email, 'ACTIVE']
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '일치하는 사용자 정보를 찾을 수 없습니다' });
    }

    const user = users[0];

    // 2단계: 아이디 확인
    if (user.username !== username) {
      return res.status(401).json({ error: '사용자 정보가 일치하지 않습니다' });
    }

    // 3단계: 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '사용자 정보가 일치하지 않습니다' });
    }

    // 4단계: 마인크래프트 UUID 확인
    if (user.minecraft_uuid !== minecraft_uuid) {
      return res.status(401).json({ error: '사용자 정보가 일치하지 않습니다' });
    }

    // 5단계: 보안 질문 답변 확인 (3개 모두 일치해야 함)
    const isAnswer1Valid = await bcrypt.compare(security_answer_1.toLowerCase().trim(), user.security_answer_1);
    const isAnswer2Valid = await bcrypt.compare(security_answer_2.toLowerCase().trim(), user.security_answer_2);
    const isAnswer3Valid = await bcrypt.compare(security_answer_3.toLowerCase().trim(), user.security_answer_3);

    if (!isAnswer1Valid || !isAnswer2Valid || !isAnswer3Valid) {
      return res.status(401).json({ error: '보안 질문 답변이 일치하지 않습니다' });
    }

    // 모든 인증 통과 → 새로운 인증 코드 생성
    const newAuthCode = generateAuthCode();
    const hashedNewAuthCode = await bcrypt.hash(newAuthCode, 10);

    // 인증 코드 업데이트
    await query(
      'UPDATE users SET auth_code = ? WHERE id = ?',
      [hashedNewAuthCode, user.id]
    );

    res.json({
      success: true,
      message: '인증 코드가 재발급되었습니다. 새로운 인증 코드를 안전하게 보관하세요.',
      auth_code: newAuthCode
    });
  } catch (error) {
    console.error('인증 코드 복구 오류:', error);
    res.status(500).json({ error: '인증 코드 복구 처리 중 오류가 발생했습니다' });
  }
});

// 현재 로그인한 사용자 정보
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const users = await query(
      'SELECT u.id, u.username, u.email, u.minecraft_username, u.minecraft_uuid FROM users u WHERE u.id = ?',
      [req.session.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const user = users[0];

    // 계좌 목록 조회
    const accounts = await query(
      'SELECT id, account_number, account_type, balance, status FROM accounts WHERE user_id = ? AND status = "ACTIVE" ORDER BY created_at DESC',
      [req.session.userId]
    );

    res.json({ 
      user: {
        ...user,
        accounts: accounts || []
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    res.status(500).json({ error: '사용자 정보 조회 실패' });
  }
});

// 관리자 로그인
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const admins = await query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    const admin = admins[0];
    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다' });
    }

    // 세션 저장
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
    res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다' });
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

// 현재 로그인한 관리자 정보
router.get('/admin/me', isAdmin, async (req: Request, res: Response) => {
  try {
    const admins = await query(
      'SELECT id, username, role FROM admins WHERE id = ?',
      [req.session.adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: '관리자를 찾을 수 없습니다' });
    }

    res.json({ admin: admins[0] });
  } catch (error) {
    console.error('관리자 정보 조회 오류:', error);
    res.status(500).json({ error: '관리자 정보 조회 실패' });
  }
});

export default router;
