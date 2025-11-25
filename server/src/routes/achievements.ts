import express, { Request, Response } from 'express';
import pool from '../database/db';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 모든 업적 조회 (진행도 포함)
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query('SELECT id FROM teams WHERE user_id = $1', [userId]);
    const teamId = teamResult.rows[0].id;

    // 모든 업적 조회
    const achievementsResult = await pool.query(`
      SELECT
        a.*,
        ua.is_claimed,
        ua.claimed_at,
        ua.progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.team_id = $1
      ORDER BY a.category, a.id
    `, [teamId]);

    // 카테고리별로 그룹화
    const grouped = achievementsResult.rows.reduce((acc: any, achievement: any) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = [];
      }
      acc[achievement.category].push({
        ...achievement,
        is_completed: achievement.progress >= achievement.requirement,
        is_claimed: achievement.is_claimed || false,
      });
      return acc;
    }, {});

    res.json({ achievements: grouped });
  } catch (error) {
    console.error('업적 조회 실패:', error);
    res.status(500).json({ error: '업적 조회에 실패했습니다' });
  }
});

// 업적 보상 수령
router.post('/claim/:achievementId', isAuthenticated, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const userId = req.user?.id;
    const { achievementId } = req.params;

    await client.query('BEGIN');

    // 팀 정보 조회
    const teamResult = await client.query('SELECT id FROM teams WHERE user_id = $1', [userId]);
    const teamId = teamResult.rows[0].id;

    // 업적 정보 조회
    const achievementResult = await client.query(
      'SELECT * FROM achievements WHERE id = $1',
      [achievementId]
    );

    if (achievementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '업적을 찾을 수 없습니다' });
    }

    const achievement = achievementResult.rows[0];

    // 사용자 업적 진행도 조회
    const userAchievementResult = await client.query(
      'SELECT * FROM user_achievements WHERE team_id = $1 AND achievement_id = $2',
      [teamId, achievementId]
    );

    if (userAchievementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '업적이 완료되지 않았습니다' });
    }

    const userAchievement = userAchievementResult.rows[0];

    // 이미 수령했는지 확인
    if (userAchievement.is_claimed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '이미 보상을 수령했습니다' });
    }

    // 완료 여부 확인
    if (userAchievement.progress < achievement.requirement) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '업적이 완료되지 않았습니다' });
    }

    // 보상 지급
    await client.query(
      'UPDATE teams SET balance = balance + $1 WHERE id = $2',
      [achievement.reward_money, teamId]
    );

    // 명성도 지급
    if (achievement.reward_reputation) {
      await client.query(
        'UPDATE teams SET reputation = reputation + $1 WHERE id = $2',
        [achievement.reward_reputation, teamId]
      );
    }

    // 업적 수령 표시
    await client.query(
      'UPDATE user_achievements SET is_claimed = true, claimed_at = NOW() WHERE team_id = $1 AND achievement_id = $2',
      [teamId, achievementId]
    );

    await client.query('COMMIT');

    res.json({
      message: '보상을 수령했습니다!',
      rewards: {
        money: achievement.reward_money,
        reputation: achievement.reward_reputation,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('보상 수령 실패:', error);
    res.status(500).json({ error: '보상 수령에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 업적 진행도 업데이트 (내부 사용)
export async function updateAchievementProgress(
  teamId: string,
  achievementId: string,
  progress: number
) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 기존 진행도 확인
    const existingResult = await client.query(
      'SELECT * FROM user_achievements WHERE team_id = $1 AND achievement_id = $2',
      [teamId, achievementId]
    );

    if (existingResult.rows.length === 0) {
      // 새로 생성
      await client.query(
        'INSERT INTO user_achievements (team_id, achievement_id, progress) VALUES ($1, $2, $3)',
        [teamId, achievementId, progress]
      );
    } else {
      // 진행도 업데이트 (최대값만)
      await client.query(
        'UPDATE user_achievements SET progress = GREATEST(progress, $1) WHERE team_id = $2 AND achievement_id = $3',
        [progress, teamId, achievementId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('업적 진행도 업데이트 실패:', error);
  } finally {
    client.release();
  }
}

// 여러 업적 진행도 체크 (내부 사용)
export async function checkAchievements(teamId: string, type: string, value: number) {
  try {
    // 해당 타입의 모든 업적 조회
    const achievementsResult = await pool.query(
      'SELECT * FROM achievements WHERE category = $1',
      [type]
    );

    // 각 업적의 진행도 업데이트
    for (const achievement of achievementsResult.rows) {
      await updateAchievementProgress(teamId, achievement.id, value);
    }
  } catch (error) {
    console.error('업적 체크 실패:', error);
  }
}

// 통계 조회
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await pool.query('SELECT id FROM teams WHERE user_id = $1', [userId]);
    const teamId = teamResult.rows[0].id;

    // 총 업적 수
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM achievements');
    const total = parseInt(totalResult.rows[0].total);

    // 완료한 업적 수
    const completedResult = await pool.query(`
      SELECT COUNT(*) as completed
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.team_id = $1 AND ua.progress >= a.requirement
    `, [teamId]);
    const completed = parseInt(completedResult.rows[0].completed);

    // 수령한 보상 합계
    const rewardsResult = await pool.query(`
      SELECT
        SUM(a.reward_money) as total_money,
        SUM(a.reward_reputation) as total_reputation
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.team_id = $1 AND ua.is_claimed = true
    `, [teamId]);

    res.json({
      total,
      completed,
      claimed: completedResult.rows[0].completed,
      percentage: Math.round((completed / total) * 100),
      rewards: {
        money: parseInt(rewardsResult.rows[0].total_money) || 0,
        reputation: parseInt(rewardsResult.rows[0].total_reputation) || 0,
      },
    });
  } catch (error) {
    console.error('업적 통계 조회 실패:', error);
    res.status(500).json({ error: '통계 조회에 실패했습니다' });
  }
});

export default router;
