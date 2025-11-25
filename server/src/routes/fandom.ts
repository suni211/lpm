import express, { Request, Response } from 'express';
import pool from '../database/db';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 팀 팬덤 정보 조회
router.get('/info', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query(
      'SELECT id, team_name, fandom, fan_satisfaction FROM teams WHERE user_id = $1',
      [userId]
    );
    const team = teamResult.rows[0];

    // 팬덤 등급 계산
    const fanLevel = calculateFanLevel(team.fandom);
    const nextLevelFans = getNextLevelFans(fanLevel);

    // 팬 미팅 가능 여부
    const lastMeetingResult = await pool.query(
      'SELECT MAX(meeting_date) as last_meeting FROM fan_meetings WHERE team_id = $1',
      [team.id]
    );

    const lastMeeting = lastMeetingResult.rows[0].last_meeting;
    const canHoldMeeting = !lastMeeting ||
      (new Date().getTime() - new Date(lastMeeting).getTime()) > 7 * 24 * 60 * 60 * 1000; // 7일

    res.json({
      teamName: team.team_name,
      fandom: team.fandom,
      fanSatisfaction: team.fan_satisfaction,
      fanLevel,
      nextLevelFans,
      canHoldMeeting,
      lastMeeting,
    });
  } catch (error) {
    console.error('팬덤 정보 조회 실패:', error);
    res.status(500).json({ error: '팬덤 정보 조회에 실패했습니다' });
  }
});

// 팬 미팅 개최
router.post('/meeting', isAuthenticated, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = req.user?.id;
    const { meetingType } = req.body; // 'basic', 'premium', 'special'

    await client.query('BEGIN');

    // 팀 정보 조회
    const teamResult = await client.query(
      'SELECT id, team_name, balance, fandom, fan_satisfaction FROM teams WHERE user_id = $1',
      [userId]
    );
    const team = teamResult.rows[0];

    // 비용 및 효과 설정
    const meetingCosts: { [key: string]: number } = {
      'basic': 5000000,     // 500만원
      'premium': 15000000,  // 1500만원
      'special': 30000000,  // 3000만원
    };

    const satisfactionGain: { [key: string]: number } = {
      'basic': 5,
      'premium': 15,
      'special': 30,
    };

    const fandomGain: { [key: string]: number } = {
      'basic': 100,
      'premium': 500,
      'special': 1500,
    };

    const cost = meetingCosts[meetingType];
    const satisfaction = satisfactionGain[meetingType];
    const fans = fandomGain[meetingType];

    // 잔액 확인
    if (team.balance < cost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 마지막 팬 미팅 확인 (7일 쿨다운)
    const lastMeetingResult = await client.query(
      'SELECT MAX(meeting_date) as last_meeting FROM fan_meetings WHERE team_id = $1',
      [team.id]
    );

    const lastMeeting = lastMeetingResult.rows[0].last_meeting;
    if (lastMeeting) {
      const daysSince = (new Date().getTime() - new Date(lastMeeting).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `팬 미팅은 7일에 한 번만 개최할 수 있습니다 (${Math.ceil(7 - daysSince)}일 남음)`
        });
      }
    }

    // 비용 차감
    await client.query(
      'UPDATE teams SET balance = balance - $1 WHERE id = $2',
      [cost, team.id]
    );

    // 팬덤 및 만족도 증가
    const newSatisfaction = Math.min(team.fan_satisfaction + satisfaction, 100);
    await client.query(
      'UPDATE teams SET fandom = fandom + $1, fan_satisfaction = $2 WHERE id = $3',
      [fans, newSatisfaction, team.id]
    );

    // 팬 미팅 기록
    await client.query(
      'INSERT INTO fan_meetings (team_id, meeting_type, fans_gained, satisfaction_gained, cost) VALUES ($1, $2, $3, $4, $5)',
      [team.id, meetingType, fans, satisfaction, cost]
    );

    await client.query('COMMIT');

    res.json({
      message: '팬 미팅이 성공적으로 개최되었습니다!',
      fansGained: fans,
      satisfactionGained: satisfaction,
      newFandom: team.fandom + fans,
      newSatisfaction,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('팬 미팅 개최 실패:', error);
    res.status(500).json({ error: '팬 미팅 개최에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 팬덤 이벤트 목록 조회
router.get('/events', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query('SELECT id FROM teams WHERE user_id = $1', [userId]);
    const teamId = teamResult.rows[0].id;

    // 진행 중인 이벤트
    const eventsResult = await pool.query(`
      SELECT * FROM fandom_events
      WHERE start_date <= NOW() AND end_date >= NOW()
      ORDER BY end_date ASC
    `);

    // 이벤트 참여 여부 확인
    const participationResult = await pool.query(
      'SELECT event_id FROM event_participations WHERE team_id = $1',
      [teamId]
    );
    const participatedEvents = participationResult.rows.map(row => row.event_id);

    const events = eventsResult.rows.map(event => ({
      ...event,
      hasParticipated: participatedEvents.includes(event.id),
      daysRemaining: Math.ceil((new Date(event.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }));

    res.json({ events });
  } catch (error) {
    console.error('이벤트 조회 실패:', error);
    res.status(500).json({ error: '이벤트 조회에 실패했습니다' });
  }
});

// 팬덤 이벤트 참여
router.post('/events/:eventId/participate', isAuthenticated, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = req.user?.id;
    const { eventId } = req.params;

    await client.query('BEGIN');

    // 팀 정보 조회
    const teamResult = await client.query(
      'SELECT id, fandom, fan_satisfaction FROM teams WHERE user_id = $1',
      [userId]
    );
    const team = teamResult.rows[0];

    // 이벤트 정보 조회
    const eventResult = await client.query(
      'SELECT * FROM fandom_events WHERE id = $1 AND start_date <= NOW() AND end_date >= NOW()',
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '이벤트를 찾을 수 없거나 종료되었습니다' });
    }

    const event = eventResult.rows[0];

    // 이미 참여했는지 확인
    const participationCheck = await client.query(
      'SELECT * FROM event_participations WHERE team_id = $1 AND event_id = $2',
      [team.id, eventId]
    );

    if (participationCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '이미 참여한 이벤트입니다' });
    }

    // 조건 확인 (팬덤 수)
    if (team.fandom < event.required_fandom) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `팬덤이 부족합니다 (필요: ${event.required_fandom}, 현재: ${team.fandom})`
      });
    }

    // 보상 지급
    await client.query(
      'UPDATE teams SET fandom = fandom + $1, fan_satisfaction = LEAST(fan_satisfaction + $2, 100) WHERE id = $3',
      [event.reward_fandom, event.reward_satisfaction, team.id]
    );

    // 참여 기록
    await client.query(
      'INSERT INTO event_participations (team_id, event_id) VALUES ($1, $2)',
      [team.id, eventId]
    );

    await client.query('COMMIT');

    res.json({
      message: '이벤트에 참여했습니다!',
      rewards: {
        fandom: event.reward_fandom,
        satisfaction: event.reward_satisfaction,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('이벤트 참여 실패:', error);
    res.status(500).json({ error: '이벤트 참여에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 굿즈 샵 목록 조회
router.get('/merchandise', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query('SELECT id, fandom FROM teams WHERE user_id = $1', [userId]);
    const team = teamResult.rows[0];

    // 모든 굿즈 조회
    const merchandiseResult = await pool.query(`
      SELECT * FROM merchandise
      ORDER BY required_fandom ASC, price ASC
    `);

    // 구매 가능 여부 확인
    const merchandise = merchandiseResult.rows.map(item => ({
      ...item,
      canPurchase: team.fandom >= item.required_fandom,
    }));

    res.json({ merchandise });
  } catch (error) {
    console.error('굿즈 조회 실패:', error);
    res.status(500).json({ error: '굿즈 조회에 실패했습니다' });
  }
});

// 굿즈 구매
router.post('/merchandise/:itemId/purchase', isAuthenticated, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = req.user?.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    await client.query('BEGIN');

    // 팀 정보 조회
    const teamResult = await client.query(
      'SELECT id, balance, fandom FROM teams WHERE user_id = $1',
      [userId]
    );
    const team = teamResult.rows[0];

    // 굿즈 정보 조회
    const itemResult = await client.query(
      'SELECT * FROM merchandise WHERE id = $1',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '굿즈를 찾을 수 없습니다' });
    }

    const item = itemResult.rows[0];
    const totalCost = item.price * quantity;

    // 팬덤 조건 확인
    if (team.fandom < item.required_fandom) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '팬덤이 부족합니다' });
    }

    // 잔액 확인
    if (team.balance < totalCost) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 비용 차감 및 팬덤 증가
    const fandomGain = item.fandom_gain * quantity;
    await client.query(
      'UPDATE teams SET balance = balance - $1, fandom = fandom + $2 WHERE id = $3',
      [totalCost, fandomGain, team.id]
    );

    // 구매 기록
    await client.query(
      'INSERT INTO merchandise_purchases (team_id, merchandise_id, quantity, total_price) VALUES ($1, $2, $3, $4)',
      [team.id, itemId, quantity, totalCost]
    );

    await client.query('COMMIT');

    res.json({
      message: '굿즈를 구매했습니다!',
      fandomGained: fandomGain,
      totalCost,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('굿즈 구매 실패:', error);
    res.status(500).json({ error: '굿즈 구매에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 팬 미팅 히스토리
router.get('/meetings/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query('SELECT id FROM teams WHERE user_id = $1', [userId]);
    const teamId = teamResult.rows[0].id;

    const result = await pool.query(`
      SELECT * FROM fan_meetings
      WHERE team_id = $1
      ORDER BY meeting_date DESC
      LIMIT 10
    `, [teamId]);

    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('미팅 히스토리 조회 실패:', error);
    res.status(500).json({ error: '히스토리 조회에 실패했습니다' });
  }
});

// 팬덤 레벨 계산 함수
function calculateFanLevel(fandom: number): number {
  if (fandom >= 100000) return 10;
  if (fandom >= 50000) return 9;
  if (fandom >= 30000) return 8;
  if (fandom >= 20000) return 7;
  if (fandom >= 15000) return 6;
  if (fandom >= 10000) return 5;
  if (fandom >= 5000) return 4;
  if (fandom >= 2000) return 3;
  if (fandom >= 500) return 2;
  return 1;
}

// 다음 레벨까지 필요한 팬 수
function getNextLevelFans(level: number): number {
  const thresholds = [0, 500, 2000, 5000, 10000, 15000, 20000, 30000, 50000, 100000];
  return thresholds[level] || 100000;
}

// 경기 결과에 따른 팬덤 변화 (외부에서 호출)
export async function updateFandomAfterMatch(teamId: string, isWin: boolean, isStreak: boolean) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let fandomChange = isWin ? 50 : -20;
    let satisfactionChange = isWin ? 2 : -3;

    // 연승 보너스
    if (isStreak && isWin) {
      fandomChange += 30;
      satisfactionChange += 3;
    }

    await client.query(
      'UPDATE teams SET fandom = GREATEST(fandom + $1, 0), fan_satisfaction = GREATEST(LEAST(fan_satisfaction + $2, 100), 0) WHERE id = $3',
      [fandomChange, satisfactionChange, teamId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('팬덤 업데이트 실패:', error);
  } finally {
    client.release();
  }
}

export default router;
