import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

/**
 * LICO 가입 설문조사 제출
 *
 * 질문:
 * 1. 당신은 계산적이며, 플래닛어스 골드가 많으며, 감당을 할 자신이 있으십니까?
 *    - 예: 10점, 아니요: 0점
 *
 * 2. 당신은 현실 주식에서 성과를 보여줬습니까?
 *    - 예: 50점, 보통입니다: 30점, 아니요: 0점
 *
 * 3. LICO SYSTEM은 블록체인 기술을 도입해, 저희도 건드리지 못합니다.
 *    코인이 사라질 시, 책임을 온전히 당신이 쥐어집니다. 동의하십니까?
 *    - 예: 30점, 아니요: 0점
 *
 * 총점 90점 이상이면 자동 승인
 */
router.post('/submit', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // 세션에서 사용자 정보 가져오기
    const session = (req as any).session;
    const minecraft_username = session?.username;
    
    if (!minecraft_username) {
      return res.status(400).json({ error: '로그인이 필요합니다' });
    }

    const { question1_answer, question2_answer, question3_answer } = req.body;

    // 이미 제출했는지 확인
    const existing = await query(
      'SELECT * FROM lico_questionnaires WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 설문조사를 제출하셨습니다' });
    }

    // 점수 계산
    let q1Score = 0;
    let q2Score = 0;
    let q3Score = 0;

    // Question 1: 예(10), 아니요(0)
    if (question1_answer === 'YES') {
      q1Score = 10;
    }

    // Question 2: 예(50), 보통(30), 아니요(0)
    if (question2_answer === 'YES') {
      q2Score = 50;
    } else if (question2_answer === 'MODERATE') {
      q2Score = 30;
    }

    // Question 3: 예(30), 아니요(0)
    if (question3_answer === 'YES') {
      q3Score = 30;
    }

    const totalScore = q1Score + q2Score + q3Score;
    const isApproved = totalScore >= 90;

    // 설문조사 저장
    const questionnaireId = uuidv4();
    await query(
      `INSERT INTO lico_questionnaires
       (id, minecraft_username, question1_score, question2_score, question3_score, is_approved)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [questionnaireId, minecraft_username, q1Score, q2Score, q3Score, isApproved]
    );

    res.json({
      success: true,
      total_score: totalScore,
      is_approved: isApproved,
      message: isApproved
        ? 'LICO 가입이 승인되었습니다!'
        : `설문조사가 제출되었습니다. 총점: ${totalScore}/90점. 90점 이상이 필요합니다.`,
    });
  } catch (error) {
    console.error('설문조사 제출 오류:', error);
    res.status(500).json({ error: '설문조사 제출 실패' });
  }
});

// 내 설문조사 결과 조회
router.get('/my/:minecraft_username', async (req: Request, res: Response) => {
  try {
    const { minecraft_username } = req.params;

    const results = await query(
      'SELECT * FROM lico_questionnaires WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (results.length === 0) {
      return res.status(404).json({ error: '설문조사 기록을 찾을 수 없습니다' });
    }

    res.json({ questionnaire: results[0] });
  } catch (error) {
    console.error('설문조사 조회 오류:', error);
    res.status(500).json({ error: '설문조사 조회 실패' });
  }
});

// 설문조사 승인 여부 확인 (현재 로그인한 사용자)
router.get('/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // 세션에서 사용자 정보 가져오기 (인증 필요)
    const session = (req as any).session;
    if (!session || !session.username) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }

    const minecraft_username = session.username;

    const results = await query(
      'SELECT is_approved, (question1_score + question2_score + question3_score) as total_score FROM lico_questionnaires WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (results.length === 0) {
      return res.status(404).json({
        completed: false,
        approved: false,
        message: '설문조사를 먼저 완료해주세요'
      });
    }

    const questionnaire = results[0];

    res.json({
      completed: true,
      approved: questionnaire.is_approved,
      total_score: questionnaire.total_score,
      message: questionnaire.is_approved
        ? 'LICO 이용이 승인되었습니다'
        : `설문조사 점수가 부족합니다 (${questionnaire.total_score}/90점)`,
    });
  } catch (error) {
    console.error('승인 확인 오류:', error);
    res.status(500).json({ error: '승인 확인 실패' });
  }
});

// 설문조사 승인 여부 확인 (마인크래프트 닉네임으로)
router.get('/check/:minecraft_username', async (req: Request, res: Response) => {
  try {
    const { minecraft_username } = req.params;

    const results = await query(
      'SELECT is_approved, total_score FROM lico_questionnaires WHERE minecraft_username = ?',
      [minecraft_username]
    );

    if (results.length === 0) {
      return res.json({
        completed: false,
        approved: false,
        message: '설문조사를 먼저 완료해주세요'
      });
    }

    const questionnaire = results[0];

    res.json({
      completed: true,
      approved: questionnaire.is_approved,
      total_score: questionnaire.total_score,
      message: questionnaire.is_approved
        ? 'LICO 이용이 승인되었습니다'
        : `설문조사 점수가 부족합니다 (${questionnaire.total_score}/90점)`,
    });
  } catch (error) {
    console.error('승인 확인 오류:', error);
    res.status(500).json({ error: '승인 확인 실패' });
  }
});

export default router;
