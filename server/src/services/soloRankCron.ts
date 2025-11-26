import cron from 'node-cron';
import { query, getConnection } from '../database/db';

// 1시간마다 실행되는 솔로랭크 AI 매칭
export function startSoloRankCron() {
  // 매 시간 정각에 실행
  cron.schedule('0 * * * *', async () => {
    console.log('🤖 [SoloRank] AI 자동 매칭 시작...');

    try {
      await runAutoMatching();
      console.log('✅ [SoloRank] AI 자동 매칭 완료');
    } catch (error) {
      console.error('❌ [SoloRank] AI 자동 매칭 오류:', error);
    }
  });

  console.log('⏰ [SoloRank] 크론 작업 시작 - 매 시간 정각에 AI 매칭 실행');
}

// AI 자동 매칭 로직
async function runAutoMatching() {
  const client = await getConnection();

  try {
    await client.beginTransaction();

    // 현재 활성화된 솔랭 시즌 조회
    const [seasonResult]: any = await client.query(
      `SELECT * FROM solo_rank_seasons WHERE status = 'ONGOING' ORDER BY season_number DESC LIMIT 1`
    );

    if (seasonResult.length === 0) {
      console.log('⚠️  [SoloRank] 진행 중인 솔랭 시즌이 없습니다');
      await client.rollback();
      return;
    }

    const season = seasonResult[0];

    // 모든 선수 카드 조회
    const [allPlayers]: any = await client.query(
      `SELECT pc.id, pc.card_name, pc.position, pc.power, pc.mental, pc.team_fight,
              pc.cs_ability, pc.vision, pc.judgment, pc.laning
       FROM player_cards pc`
    );

    console.log(`📊 [SoloRank] 총 ${allPlayers.length}명의 선수 조회`);

    // 선수별 솔랭 정보 초기화 or 조회
    for (const player of allPlayers) {
      const [soloRankResult]: any = await client.query(
        `SELECT * FROM player_solo_rank WHERE player_card_id = ? AND season_id = ?`,
        [player.id, season.id]
      );

      if (soloRankResult.length === 0) {
        // 솔랭 정보가 없으면 초기화 (기본 MMR 1500)
        await client.query(
          `INSERT INTO player_solo_rank (player_card_id, season_id, solo_rating, current_rank, wins, losses)
           VALUES (?, ?, 1500, NULL, 0, 0)`,
          [player.id, season.id]
        );
      }
    }

    // 포지션별로 매칭
    const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    let totalMatches = 0;

    for (const position of positions) {
      const [positionPlayers]: any = await client.query(
        `SELECT pc.id, pc.card_name, pc.position, pc.power, pc.mental, pc.team_fight,
                pc.cs_ability, pc.vision, pc.judgment, pc.laning,
                psr.solo_rating, psr.wins, psr.losses
         FROM player_cards pc
         JOIN player_solo_rank psr ON pc.id = psr.player_card_id
         WHERE pc.position = ? AND psr.season_id = ?
         ORDER BY RAND()`,
        [position, season.id]
      );

      console.log(`🎯 [SoloRank] ${position} 포지션: ${positionPlayers.length}명`);

      // 2명씩 매칭
      for (let i = 0; i < positionPlayers.length - 1; i += 2) {
        if (i + 1 >= positionPlayers.length) break;

        const player1 = positionPlayers[i];
        const player2 = positionPlayers[i + 1];

        // MMR 차이가 500 이하인 경우에만 매칭
        const mmrDiff = Math.abs(player1.solo_rating - player2.solo_rating);
        if (mmrDiff > 500) continue;

        // 1vs1 경기 시뮬레이션
        const matchResult = await simulate1v1Match(player1, player2);

        // 경기 결과 저장
        await client.query(
          `INSERT INTO solo_rank_matches (
            season_id, player1_id, player2_id, winner_id, match_date,
            player1_rating_change, player2_rating_change,
            player1_exp_gained, player2_exp_gained,
            player1_chemistry_change, player2_chemistry_change,
            match_duration, match_data
          ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            season.id,
            player1.id,
            player2.id,
            matchResult.winnerId,
            matchResult.player1RatingChange,
            matchResult.player2RatingChange,
            matchResult.player1ExpGained,
            matchResult.player2ExpGained,
            matchResult.player1ChemistryChange,
            matchResult.player2ChemistryChange,
            matchResult.duration,
            JSON.stringify(matchResult),
          ]
        );

        // 선수 솔랭 정보 업데이트
        await updatePlayerSoloRank(
          client,
          player1.id,
          season.id,
          matchResult.winnerId === player1.id,
          matchResult.player1RatingChange
        );

        await updatePlayerSoloRank(
          client,
          player2.id,
          season.id,
          matchResult.winnerId === player2.id,
          matchResult.player2RatingChange
        );

        totalMatches++;
      }
    }

    // 순위 업데이트
    await updateRankings(client, season.id);

    await client.commit();

    console.log(`✅ [SoloRank] 총 ${totalMatches}개의 경기 완료`);
  } catch (error) {
    await client.rollback();
    console.error('❌ [SoloRank] 자동 매칭 오류:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 1vs1 경기 시뮬레이션
async function simulate1v1Match(player1: any, player2: any) {
  // 포지션별 가중치 적용
  const positionWeights: any = {
    TOP: { mental: 0.15, team_fight: 0.20, cs_ability: 0.15, vision: 0.05, judgment: 0.15, laning: 0.30 },
    JUNGLE: { mental: 0.15, team_fight: 0.25, cs_ability: 0.10, vision: 0.25, judgment: 0.20, laning: 0.05 },
    MID: { mental: 0.15, team_fight: 0.25, cs_ability: 0.15, vision: 0.10, judgment: 0.20, laning: 0.15 },
    ADC: { mental: 0.10, team_fight: 0.30, cs_ability: 0.20, vision: 0.05, judgment: 0.15, laning: 0.20 },
    SUPPORT: { mental: 0.15, team_fight: 0.25, cs_ability: 0.05, vision: 0.30, judgment: 0.20, laning: 0.05 }
  };

  const weights = positionWeights[player1.position] || positionWeights.MID;

  // 파워 계산
  const p1Power =
    player1.mental * weights.mental +
    player1.team_fight * weights.team_fight +
    player1.cs_ability * weights.cs_ability +
    player1.vision * weights.vision +
    player1.judgment * weights.judgment +
    player1.laning * weights.laning;

  const p2Power =
    player2.mental * weights.mental +
    player2.team_fight * weights.team_fight +
    player2.cs_ability * weights.cs_ability +
    player2.vision * weights.vision +
    player2.judgment * weights.judgment +
    player2.laning * weights.laning;

  // 랜덤 요소 추가 (±10%)
  const p1FinalPower = p1Power * (0.9 + Math.random() * 0.2);
  const p2FinalPower = p2Power * (0.9 + Math.random() * 0.2);

  const winnerId = p1FinalPower > p2FinalPower ? player1.id : player2.id;
  const player1Won = winnerId === player1.id;

  // MMR 변화 계산 (ELO 방식)
  const expectedScore1 = 1 / (1 + Math.pow(10, (player2.solo_rating - player1.solo_rating) / 400));
  const actualScore1 = player1Won ? 1 : 0;

  const K = 32; // K-factor
  const player1RatingChange = Math.round(K * (actualScore1 - expectedScore1));
  const player2RatingChange = -player1RatingChange;

  // 경험치 획득
  const player1ExpGained = player1Won ? 1000 : 500;
  const player2ExpGained = player1Won ? 500 : 1000;

  // 케미스트리 변화
  const player1ChemistryChange = player1Won ? 5 : -3;
  const player2ChemistryChange = player1Won ? -3 : 5;

  const duration = Math.floor(Math.random() * 600) + 1200; // 20~30분

  return {
    winnerId,
    player1RatingChange,
    player2RatingChange,
    player1ExpGained,
    player2ExpGained,
    player1ChemistryChange,
    player2ChemistryChange,
    duration,
    player1Power: Math.round(p1FinalPower),
    player2Power: Math.round(p2FinalPower),
  };
}

// 선수 솔랭 정보 업데이트
async function updatePlayerSoloRank(
  client: any,
  playerCardId: number,
  seasonId: number,
  won: boolean,
  ratingChange: number
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
}

// 순위 업데이트
async function updateRankings(client: any, seasonId: number) {
  // 각 포지션별로 순위 업데이트
  const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  for (const position of positions) {
    const [players]: any = await client.query(
      `SELECT psr.id, psr.player_card_id
       FROM player_solo_rank psr
       JOIN player_cards pc ON psr.player_card_id = pc.id
       WHERE psr.season_id = ? AND pc.position = ?
       ORDER BY psr.solo_rating DESC, psr.wins DESC`,
      [seasonId, position]
    );

    // 순위 부여
    for (let i = 0; i < players.length; i++) {
      await client.query(
        `UPDATE player_solo_rank SET current_rank = ? WHERE id = ?`,
        [i + 1, players[i].id]
      );
    }
  }
}
