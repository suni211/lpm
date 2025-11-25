import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { simulateMatch } from '../services/matchService';
import pool from '../database/db';

const router = express.Router();

// 랭크 경기 매칭 (AI 상대)
router.post('/ranked/start', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 사용자 팀 조회
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE user_id = $1',
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const userTeam = teamResult.rows[0];

    // 로스터 완성 여부 확인
    const rosterResult = await pool.query(
      'SELECT * FROM rosters WHERE team_id = $1',
      [userTeam.id]
    );

    const roster = rosterResult.rows[0];

    if (
      !roster.top_player_id ||
      !roster.jungle_player_id ||
      !roster.mid_player_id ||
      !roster.adc_player_id ||
      !roster.support_player_id
    ) {
      return res.status(400).json({ error: '로스터를 완성해주세요 (5명 모두 배치)' });
    }

    // AI 상대팀 찾기 (비슷한 티어의 다른 유저 팀)
    const opponentResult = await pool.query(
      `SELECT t.* FROM teams t
       JOIN rosters r ON t.id = r.team_id
       WHERE t.id != $1
       AND t.current_tier = $2
       AND r.top_player_id IS NOT NULL
       AND r.jungle_player_id IS NOT NULL
       AND r.mid_player_id IS NOT NULL
       AND r.adc_player_id IS NOT NULL
       AND r.support_player_id IS NOT NULL
       ORDER BY RANDOM()
       LIMIT 1`,
      [userTeam.id, userTeam.current_tier]
    );

    let opponentTeam;
    if (opponentResult.rows.length > 0) {
      opponentTeam = opponentResult.rows[0];
    } else {
      // 같은 티어에 상대가 없으면 아무 팀이나
      const anyOpponentResult = await pool.query(
        `SELECT t.* FROM teams t
         JOIN rosters r ON t.id = r.team_id
         WHERE t.id != $1
         AND r.top_player_id IS NOT NULL
         AND r.jungle_player_id IS NOT NULL
         AND r.mid_player_id IS NOT NULL
         AND r.adc_player_id IS NOT NULL
         AND r.support_player_id IS NOT NULL
         ORDER BY RANDOM()
         LIMIT 1`,
        [userTeam.id]
      );

      if (anyOpponentResult.rows.length === 0) {
        return res.status(400).json({ error: '매칭할 상대를 찾을 수 없습니다' });
      }

      opponentTeam = anyOpponentResult.rows[0];
    }

    // 경기 시뮬레이션
    const matchResult = await simulateMatch(userTeam.id, opponentTeam.id);

    // 결과 반환
    res.json({
      match: matchResult,
      userTeam,
      opponentTeam,
      userWon: matchResult.winner_id === userTeam.id,
    });
  } catch (error) {
    console.error('경기 시작 오류:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '경기 시작에 실패했습니다',
    });
  }
});

// 경기 기록 조회
router.get('/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await pool.query(
      'SELECT id FROM teams WHERE user_id = $1',
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult.rows[0].id;

    // 최근 경기 기록
    const matchesResult = await pool.query(
      `SELECT m.*,
              t1.team_name as team1_name,
              t2.team_name as team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.team1_id = $1 OR m.team2_id = $1
       ORDER BY m.played_at DESC
       LIMIT 20`,
      [teamId]
    );

    res.json({ matches: matchesResult.rows });
  } catch (error) {
    console.error('경기 기록 조회 오류:', error);
    res.status(500).json({ error: '경기 기록 조회에 실패했습니다' });
  }
});

// 특정 경기 상세 조회
router.get('/:matchId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const matchResult = await pool.query(
      `SELECT m.*,
              t1.team_name as team1_name, t1.team_logo as team1_logo,
              t2.team_name as team2_name, t2.team_logo as team2_logo
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: '경기를 찾을 수 없습니다' });
    }

    res.json({ match: matchResult.rows[0] });
  } catch (error) {
    console.error('경기 조회 오류:', error);
    res.status(500).json({ error: '경기 조회에 실패했습니다' });
  }
});

export default router;
