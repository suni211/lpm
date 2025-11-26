import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 현재 솔랭 시즌 조회
router.get('/season/current', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const seasons = await query(
      `SELECT * FROM solo_rank_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasons.length === 0) {
      return res.status(404).json({ error: '진행 중인 솔랭 시즌이 없습니다' });
    }

    res.json({ season: seasons[0] });
  } catch (error) {
    console.error('솔랭 시즌 조회 오류:', error);
    res.status(500).json({ error: '솔랭 시즌 조회에 실패했습니다' });
  }
});

// 선수 솔랭 정보 조회
router.get('/player/:playerCardId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerCardId } = req.params;

    // 현재 시즌 조회
    const seasonResult = await query(
      `SELECT * FROM solo_rank_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      return res.status(404).json({ error: '진행 중인 솔랭 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    // 선수 솔랭 정보 조회
    const soloRankResult = await query(
      `SELECT psr.*, pc.player_name, pc.position
       FROM player_solo_rank psr
       JOIN player_cards pc ON psr.player_card_id = pc.id
       WHERE psr.player_card_id = ? AND psr.season_id = ?`,
      [playerCardId, season.id]
    );

    if (soloRankResult.length === 0) {
      // 솔랭 정보가 없으면 초기화
      await query(
        `INSERT INTO player_solo_rank (player_card_id, season_id, solo_rating)
         VALUES (?, ?, 1500)`,
        [playerCardId, season.id]
      );

      const newSoloRankResult = await query(
        `SELECT psr.*, pc.player_name, pc.position
         FROM player_solo_rank psr
         JOIN player_cards pc ON psr.player_card_id = pc.id
         WHERE psr.player_card_id = ? AND psr.season_id = ?`,
        [playerCardId, season.id]
      );

      return res.json({ soloRank: newSoloRankResult[0], season });
    }

    res.json({ soloRank: soloRankResult[0], season });
  } catch (error) {
    console.error('선수 솔랭 정보 조회 오류:', error);
    res.status(500).json({ error: '선수 솔랭 정보 조회에 실패했습니다' });
  }
});

// 솔랭 리더보드 조회
router.get('/leaderboard', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { position, limit = 100 } = req.query;

    // 현재 시즌 조회
    const seasonResult = await query(
      `SELECT * FROM solo_rank_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      return res.status(404).json({ error: '진행 중인 솔랭 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    let sql = `
      SELECT psr.*, pc.player_name, pc.position, pc.team,
             (@rank := @rank + 1) as rank
      FROM player_solo_rank psr
      JOIN player_cards pc ON psr.player_card_id = pc.id
      CROSS JOIN (SELECT @rank := 0) r
      WHERE psr.season_id = ?
    `;
    const params: any[] = [season.id];

    if (position) {
      sql += ' AND pc.position = ?';
      params.push(position);
    }

    sql += ' ORDER BY psr.solo_rating DESC, psr.wins DESC LIMIT ?';
    params.push(Number(limit));

    const leaderboard = await query(sql, params);

    res.json({ leaderboard, season });
  } catch (error) {
    console.error('솔랭 리더보드 조회 오류:', error);
    res.status(500).json({ error: '솔랭 리더보드 조회에 실패했습니다' });
  }
});

// 솔랭 큐 참가
router.post('/queue/join', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { playerCardId } = req.body;

    await client.beginTransaction();

    // 선수 카드가 사용자의 것인지 확인
    const [ownerResult]: any = await client.query(
      `SELECT upc.*, t.user_id, pc.position
       FROM user_player_cards upc
       JOIN teams t ON upc.team_id = t.id
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.player_card_id = ? AND t.user_id = ?`,
      [playerCardId, req.user.id]
    );

    if (ownerResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    const playerInfo = ownerResult[0];

    // 현재 시즌 조회
    const [seasonResult]: any = await client.query(
      `SELECT * FROM solo_rank_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '진행 중인 솔랭 시즌이 없습니다' });
    }

    const season = seasonResult[0];

    // 선수 솔랭 정보 조회
    const [soloRankResult]: any = await client.query(
      `SELECT * FROM player_solo_rank WHERE player_card_id = ? AND season_id = ?`,
      [playerCardId, season.id]
    );

    let soloRating = 1500;

    if (soloRankResult.length === 0) {
      // 솔랭 정보 초기화
      await client.query(
        `INSERT INTO player_solo_rank (player_card_id, season_id, solo_rating)
         VALUES (?, ?, 1500)`,
        [playerCardId, season.id]
      );
    } else {
      soloRating = soloRankResult[0].solo_rating;
    }

    // 이미 큐에 있는지 확인
    const [existingQueueResult]: any = await client.query(
      `SELECT * FROM solo_rank_queue WHERE player_card_id = ? AND status = 'SEARCHING'`,
      [playerCardId]
    );

    if (existingQueueResult.length > 0) {
      await client.rollback();
      return res.status(400).json({ error: '이미 큐에 참가 중입니다' });
    }

    // 큐 참가
    await client.query(
      `INSERT INTO solo_rank_queue (player_card_id, solo_rating, position, queue_joined_at, status)
       VALUES (?, ?, ?, NOW(), 'SEARCHING')`,
      [playerCardId, soloRating, playerInfo.position]
    );

    // 매칭 시도 (같은 포지션, 비슷한 레이팅)
    const [matchResult]: any = await client.query(
      `SELECT * FROM solo_rank_queue
       WHERE player_card_id != ?
       AND position = ?
       AND status = 'SEARCHING'
       AND ABS(solo_rating - ?) <= 200
       ORDER BY RAND()
       LIMIT 1`,
      [playerCardId, playerInfo.position, soloRating]
    );

    if (matchResult.length > 0) {
      const opponent = matchResult[0];

      // 1vs1 매치 시뮬레이션
      const matchData = await simulate1v1Match(client, playerCardId, opponent.player_card_id);

      // 매치 결과 저장
      const [insertResult]: any = await client.query(
        `INSERT INTO solo_rank_matches (
          season_id, player1_id, player2_id, winner_id, match_date,
          player1_rating_change, player2_rating_change,
          player1_exp_gained, player2_exp_gained,
          player1_chemistry_change, player2_chemistry_change,
          match_duration, match_data
        ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          season.id,
          playerCardId,
          opponent.player_card_id,
          matchData.winnerId,
          matchData.player1RatingChange,
          matchData.player2RatingChange,
          matchData.player1ExpGained,
          matchData.player2ExpGained,
          matchData.player1ChemistryChange,
          matchData.player2ChemistryChange,
          matchData.duration,
          JSON.stringify(matchData),
        ]
      );

      const matchId = insertResult.insertId;

      // 큐 상태 업데이트
      await client.query(
        `UPDATE solo_rank_queue SET status = 'MATCHED', matched_with_player_id = ?, match_id = ? WHERE player_card_id = ?`,
        [opponent.player_card_id, matchId, playerCardId]
      );

      await client.query(
        `UPDATE solo_rank_queue SET status = 'MATCHED', matched_with_player_id = ?, match_id = ? WHERE player_card_id = ?`,
        [playerCardId, matchId, opponent.player_card_id]
      );

      // 솔랭 정보 업데이트
      await updatePlayerSoloRank(
        client,
        playerCardId,
        season.id,
        matchData.winnerId === playerCardId,
        matchData.player1RatingChange,
        matchData.player1ExpGained
      );

      await updatePlayerSoloRank(
        client,
        opponent.player_card_id,
        season.id,
        matchData.winnerId === opponent.player_card_id,
        matchData.player2RatingChange,
        matchData.player2ExpGained
      );

      await client.commit();

      return res.json({
        message: '매칭 성공!',
        matched: true,
        matchResult: matchData,
      });
    }

    await client.commit();

    res.json({
      message: '매칭 대기 중...',
      matched: false,
    });
  } catch (error) {
    await client.rollback();
    console.error('솔랭 큐 참가 오류:', error);
    res.status(500).json({ error: '솔랭 큐 참가에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 솔랭 큐 취소
router.post('/queue/cancel', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerCardId } = req.body;

    await query(
      `UPDATE solo_rank_queue SET status = 'CANCELLED' WHERE player_card_id = ? AND status = 'SEARCHING'`,
      [playerCardId]
    );

    res.json({ message: '큐를 취소했습니다' });
  } catch (error) {
    console.error('큐 취소 오류:', error);
    res.status(500).json({ error: '큐 취소에 실패했습니다' });
  }
});

// 솔랭 매치 기록 조회
router.get('/matches/:playerCardId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerCardId } = req.params;

    const matches = await query(
      `SELECT sm.*,
              pc1.player_name as player1_name, pc1.position as player1_position,
              pc2.player_name as player2_name, pc2.position as player2_position
       FROM solo_rank_matches sm
       JOIN player_cards pc1 ON sm.player1_id = pc1.id
       JOIN player_cards pc2 ON sm.player2_id = pc2.id
       WHERE sm.player1_id = ? OR sm.player2_id = ?
       ORDER BY sm.match_date DESC
       LIMIT 20`,
      [playerCardId, playerCardId]
    );

    res.json({ matches });
  } catch (error) {
    console.error('솔랭 매치 기록 조회 오류:', error);
    res.status(500).json({ error: '솔랭 매치 기록 조회에 실패했습니다' });
  }
});

// 1vs1 매치 시뮬레이션 함수
async function simulate1v1Match(client: any, player1Id: number, player2Id: number) {
  // 선수 정보 조회
  const [p1Result]: any = await client.query(
    `SELECT * FROM player_cards WHERE id = ?`,
    [player1Id]
  );

  const [p2Result]: any = await client.query(
    `SELECT * FROM player_cards WHERE id = ?`,
    [player2Id]
  );

  const player1 = p1Result[0];
  const player2 = p2Result[0];

  // 간단한 파워 계산
  const p1Power = player1.power + Math.random() * 50;
  const p2Power = player2.power + Math.random() * 50;

  const winnerId = p1Power > p2Power ? player1Id : player2Id;
  const loserId = winnerId === player1Id ? player2Id : player1Id;

  // 레이팅 변화 계산 (ELO 방식 간소화)
  const player1Won = winnerId === player1Id;
  const ratingChange = 25;

  const player1RatingChange = player1Won ? ratingChange : -ratingChange;
  const player2RatingChange = player1Won ? -ratingChange : ratingChange;

  // 경험치 획득
  const player1ExpGained = player1Won ? 1000 : 500;
  const player2ExpGained = player1Won ? 500 : 1000;

  // 케미스트리 변화
  const player1ChemistryChange = player1Won ? 5 : -3;
  const player2ChemistryChange = player1Won ? -3 : 5;

  const duration = Math.floor(Math.random() * 600) + 1200; // 20~30분

  return {
    winnerId,
    loserId,
    player1RatingChange,
    player2RatingChange,
    player1ExpGained,
    player2ExpGained,
    player1ChemistryChange,
    player2ChemistryChange,
    duration,
    player1Power: Math.round(p1Power),
    player2Power: Math.round(p2Power),
  };
}

// 선수 솔랭 정보 업데이트 함수
async function updatePlayerSoloRank(
  client: any,
  playerCardId: number,
  seasonId: number,
  won: boolean,
  ratingChange: number,
  expGained: number
) {
  if (won) {
    await client.query(
      `UPDATE player_solo_rank
       SET wins = wins + 1,
           solo_rating = solo_rating + ?,
           win_rate = (wins + 1) * 100.0 / (wins + losses + 1),
           last_match_at = NOW()
       WHERE player_card_id = ? AND season_id = ?`,
      [ratingChange, playerCardId, seasonId]
    );
  } else {
    await client.query(
      `UPDATE player_solo_rank
       SET losses = losses + 1,
           solo_rating = GREATEST(0, solo_rating + ?),
           win_rate = wins * 100.0 / (wins + losses + 1),
           last_match_at = NOW()
       WHERE player_card_id = ? AND season_id = ?`,
      [ratingChange, playerCardId, seasonId]
    );
  }

  // 선수 카드 경험치 업데이트
  await client.query(
    `UPDATE player_cards SET exp = exp + ? WHERE id = ?`,
    [expGained, playerCardId]
  );
}

export default router;
