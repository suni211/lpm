import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';
import { simulateRankedMatch } from '../services/matchEngine';

const router = express.Router();

// 현재 시즌 정보 조회
router.get('/season/current', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const seasons = await query(
      `SELECT * FROM ranked_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: '진행 중인 시즌이 없습니다' });
    }

    res.json({ season: seasons[0] });
  } catch (error) {
    console.error('시즌 정보 조회 오류:', error);
    res.status(500).json({ error: '시즌 정보 조회에 실패했습니다' });
  }
});

// 랭크 티어 목록 조회
router.get('/tiers', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const tiers = await query(
      'SELECT * FROM ranked_tiers ORDER BY tier_order ASC'
    );

    res.json({ tiers });
  } catch (error) {
    console.error('티어 목록 조회 오류:', error);
    res.status(500).json({ error: '티어 목록 조회에 실패했습니다' });
  }
});

// 팀 랭크 정보 조회
router.get('/my-rank', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 팀 정보 조회
    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    // 현재 시즌 조회
    const seasonResult = await query(
      `SELECT * FROM ranked_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      return res.status(404).json({ error: '진행 중인 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    // 팀 랭크 정보 조회
    const rankResult = await query(
      `SELECT tr.*, rt.tier_name, rt.tier_display, rt.tier_color, rt.min_lp, rt.max_lp
       FROM team_ranked tr
       JOIN ranked_tiers rt ON tr.tier_id = rt.id
       WHERE tr.team_id = ? AND tr.season_id = ?`,
      [teamId, season.id]
    );

    if (rankResult.length === 0) {
      // 랭크 정보가 없으면 초기화 (브론즈 티어)
      const bronzeTier = await query(
        `SELECT * FROM ranked_tiers WHERE tier_name = 'BRONZE'`
      );

      await query(
        `INSERT INTO team_ranked (team_id, season_id, tier_id, current_lp)
         VALUES (?, ?, ?, 0)`,
        [teamId, season.id, bronzeTier[0].id]
      );

      const newRankResult = await query(
        `SELECT tr.*, rt.tier_name, rt.tier_display, rt.tier_color, rt.min_lp, rt.max_lp
         FROM team_ranked tr
         JOIN ranked_tiers rt ON tr.tier_id = rt.id
         WHERE tr.team_id = ? AND tr.season_id = ?`,
        [teamId, season.id]
      );

      return res.json({ rank: newRankResult[0], season });
    }

    res.json({ rank: rankResult[0], season });
  } catch (error) {
    console.error('랭크 정보 조회 오류:', error);
    res.status(500).json({ error: '랭크 정보 조회에 실패했습니다' });
  }
});

// 랭크 매치 시작
router.post('/match/start', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT * FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const team = teamResult[0];

    // 로스터 완성 확인
    const [rosterResult]: any = await client.query(
      'SELECT * FROM rosters WHERE team_id = ?',
      [team.id]
    );

    const roster = rosterResult[0];

    if (
      !roster.top_player_id ||
      !roster.jungle_player_id ||
      !roster.mid_player_id ||
      !roster.adc_player_id ||
      !roster.support_player_id
    ) {
      await client.rollback();
      return res.status(400).json({ error: '로스터를 완성해주세요 (5명 모두 배치)' });
    }

    // 현재 시즌 조회
    const [seasonResult]: any = await client.query(
      `SELECT * FROM ranked_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '진행 중인 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    // 팀 랭크 정보 조회
    const [myRankResult]: any = await client.query(
      `SELECT tr.*, rt.tier_order
       FROM team_ranked tr
       JOIN ranked_tiers rt ON tr.tier_id = rt.id
       WHERE tr.team_id = ? AND tr.season_id = ?`,
      [team.id, season.id]
    );

    const myRank = myRankResult[0];

    // 상대 팀 찾기 (비슷한 티어)
    const [opponentResult]: any = await client.query(
      `SELECT t.*, tr.current_lp, rt.tier_order
       FROM teams t
       JOIN team_ranked tr ON t.id = tr.team_id
       JOIN ranked_tiers rt ON tr.tier_id = rt.id
       JOIN rosters r ON t.id = r.team_id
       WHERE t.id != ?
       AND tr.season_id = ?
       AND r.top_player_id IS NOT NULL
       AND r.jungle_player_id IS NOT NULL
       AND r.mid_player_id IS NOT NULL
       AND r.adc_player_id IS NOT NULL
       AND r.support_player_id IS NOT NULL
       AND ABS(rt.tier_order - ?) <= 1
       ORDER BY RAND()
       LIMIT 1`,
      [team.id, season.id, myRank.tier_order]
    );

    if (opponentResult.length === 0) {
      await client.rollback();
      return res.status(400).json({ error: '매칭할 상대를 찾을 수 없습니다' });
    }

    const opponent = opponentResult[0];

    // 경기 시뮬레이션
    const matchResult = await simulateRankedMatch(
      client,
      team.id,
      opponent.id,
      season.id,
      myRank.is_placement
    );

    await client.commit();

    res.json({
      match: matchResult,
      userTeam: team,
      opponentTeam: opponent,
      userWon: matchResult.winner_id === team.id,
    });
  } catch (error) {
    await client.rollback();
    console.error('랭크 매치 시작 오류:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '랭크 매치 시작에 실패했습니다',
    });
  } finally {
    client.release();
  }
});

// 랭크 매치 기록 조회
router.get('/match/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    // 최근 랭크 매치 기록
    const matches = await query(
      `SELECT rm.*,
              t1.team_name as team1_name, t1.team_logo as team1_logo,
              t2.team_name as team2_name, t2.team_logo as team2_logo
       FROM ranked_matches rm
       JOIN teams t1 ON rm.team1_id = t1.id
       JOIN teams t2 ON rm.team2_id = t2.id
       WHERE rm.team1_id = ? OR rm.team2_id = ?
       ORDER BY rm.match_date DESC
       LIMIT 20`,
      [teamId, teamId]
    );

    res.json({ matches });
  } catch (error) {
    console.error('매치 기록 조회 오류:', error);
    res.status(500).json({ error: '매치 기록 조회에 실패했습니다' });
  }
});

// 랭크 리더보드 조회
router.get('/leaderboard', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { tier, limit = 100 } = req.query;

    // 현재 시즌 조회
    const seasonResult = await query(
      `SELECT * FROM ranked_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      return res.status(404).json({ error: '진행 중인 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    let sql = `
      SELECT tr.*, t.team_name, t.team_logo, t.user_id,
             rt.tier_name, rt.tier_display, rt.tier_color,
             (@rank := @rank + 1) as rank
      FROM team_ranked tr
      JOIN teams t ON tr.team_id = t.id
      JOIN ranked_tiers rt ON tr.tier_id = rt.id
      CROSS JOIN (SELECT @rank := 0) r
      WHERE tr.season_id = ?
    `;
    const params: any[] = [season.id];

    if (tier) {
      sql += ' AND rt.tier_name = ?';
      params.push(tier);
    }

    sql += ' ORDER BY tr.current_lp DESC, tr.wins DESC LIMIT ?';
    params.push(Number(limit));

    const leaderboard = await query(sql, params);

    res.json({ leaderboard, season });
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    res.status(500).json({ error: '리더보드 조회에 실패했습니다' });
  }
});

// LP 변화 내역 조회
router.get('/lp-history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    // 현재 시즌 조회
    const seasonResult = await query(
      `SELECT * FROM ranked_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      return res.status(404).json({ error: '진행 중인 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    // 팀 랭크 ID 조회
    const rankResult = await query(
      'SELECT id FROM team_ranked WHERE team_id = ? AND season_id = ?',
      [teamId, season.id]
    );

    if (rankResult.length === 0) {
      return res.json({ history: [] });
    }

    const teamRankedId = rankResult[0].id;

    // LP 변화 내역 조회
    const history = await query(
      `SELECT lh.*,
              rt1.tier_name as previous_tier_name,
              rt2.tier_name as new_tier_name
       FROM lp_history lh
       LEFT JOIN ranked_tiers rt1 ON lh.previous_tier_id = rt1.id
       LEFT JOIN ranked_tiers rt2 ON lh.new_tier_id = rt2.id
       WHERE lh.team_ranked_id = ?
       ORDER BY lh.changed_at DESC
       LIMIT 50`,
      [teamRankedId]
    );

    res.json({ history });
  } catch (error) {
    console.error('LP 내역 조회 오류:', error);
    res.status(500).json({ error: 'LP 내역 조회에 실패했습니다' });
  }
});

// 시즌 보상 조회
router.get('/rewards', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    const rewards = await query(
      `SELECT sr.*, rs.season_number, rt.tier_name, rt.tier_display
       FROM season_rewards sr
       JOIN ranked_seasons rs ON sr.season_id = rs.id
       JOIN ranked_tiers rt ON sr.tier_id = rt.id
       WHERE sr.team_id = ?
       ORDER BY rs.season_number DESC`,
      [teamId]
    );

    res.json({ rewards });
  } catch (error) {
    console.error('보상 조회 오류:', error);
    res.status(500).json({ error: '보상 조회에 실패했습니다' });
  }
});

// 시즌 보상 수령
router.post('/rewards/:rewardId/claim', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rewardId } = req.params;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id, balance FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const team = teamResult[0];

    // 보상 정보 조회
    const [rewardResult]: any = await client.query(
      `SELECT * FROM season_rewards WHERE id = ? AND team_id = ?`,
      [rewardId, team.id]
    );

    if (rewardResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '보상을 찾을 수 없습니다' });
    }

    const reward = rewardResult[0];

    if (reward.claimed) {
      await client.rollback();
      return res.status(400).json({ error: '이미 수령한 보상입니다' });
    }

    // 보상 지급
    await client.query(
      'UPDATE teams SET balance = balance + ? WHERE id = ?',
      [reward.reward_money, team.id]
    );

    // 작전 카드 지급 (간단히 처리 - 실제로는 카드 지급 로직 필요)
    // TODO: 작전 카드 지급 로직 추가

    // 보상 수령 처리
    await client.query(
      'UPDATE season_rewards SET claimed = TRUE, claimed_at = NOW() WHERE id = ?',
      [rewardId]
    );

    await client.commit();

    res.json({
      message: '시즌 보상을 수령했습니다!',
      reward_money: reward.reward_money,
      reward_tactic_cards: reward.reward_tactic_cards,
    });
  } catch (error) {
    await client.rollback();
    console.error('보상 수령 오류:', error);
    res.status(500).json({ error: '보상 수령에 실패했습니다' });
  } finally {
    client.release();
  }
});

export default router;
