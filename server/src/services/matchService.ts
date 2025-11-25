import pool from '../database/db';

interface Player {
  position: string;
  mental: number;
  team_fight: number;
  cs_ability: number;
  vision: number;
  judgment: number;
  laning: number;
  power: number;
  condition: string;
  form: number;
  traits: string[];
}

interface PhaseResult {
  team1_score: number;
  team2_score: number;
  description: string;
  events: string[];
}

interface MatchResult {
  winner_id: string;
  team1_power: number;
  team2_power: number;
  phase1_result: PhaseResult;
  phase2_result: PhaseResult;
  phase3_result: PhaseResult;
  match_log: any;
  lp_change: number;
}

// 컨디션 보너스
const CONDITION_BONUS: any = {
  RED: 0.10,
  ORANGE: 0.05,
  YELLOW: 0,
  BLUE: -0.05,
  PURPLE: -0.10,
};

/**
 * 랭크 경기 시뮬레이션
 */
export async function simulateMatch(team1Id: string, team2Id: string): Promise<MatchResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 팀 정보 가져오기
    const team1Result = await client.query('SELECT * FROM teams WHERE id = $1', [team1Id]);
    const team2Result = await client.query('SELECT * FROM teams WHERE id = $1', [team2Id]);

    const team1 = team1Result.rows[0];
    const team2 = team2Result.rows[0];

    // 로스터 가져오기
    const team1Players = await getTeamPlayers(client, team1Id);
    const team2Players = await getTeamPlayers(client, team2Id);

    // 팀 파워 계산
    const team1Power = calculateTeamPower(team1Players);
    const team2Power = calculateTeamPower(team2Players);

    // 3페이즈 시뮬레이션
    const phase1 = simulatePhase1(team1Players, team2Players);
    const phase2 = simulatePhase2(team1Players, team2Players, phase1);
    const phase3 = simulatePhase3(team1Players, team2Players, phase2);

    // 승자 결정
    const winnerId = phase3.team1_score > phase3.team2_score ? team1Id : team2Id;
    const loserId = winnerId === team1Id ? team2Id : team1Id;

    // LP 변화 계산
    const lpChange = calculateLPChange(
      team1.current_tier,
      team2.current_tier,
      winnerId === team1Id
    );

    // 팀 전적 업데이트
    if (winnerId === team1Id) {
      await updateTeamStats(client, team1Id, true, lpChange);
      await updateTeamStats(client, team2Id, false, -lpChange);
    } else {
      await updateTeamStats(client, team1Id, false, -lpChange);
      await updateTeamStats(client, team2Id, true, lpChange);
    }

    // 경기 기록 저장
    const matchResult = await client.query(
      `INSERT INTO matches
       (match_type, team1_id, team2_id, winner_id, team1_power, team2_power,
        phase1_result, phase2_result, phase3_result, match_log, lp_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        'RANKED',
        team1Id,
        team2Id,
        winnerId,
        team1Power,
        team2Power,
        phase1,
        phase2,
        phase3,
        { team1Players, team2Players },
        lpChange,
      ]
    );

    await client.query('COMMIT');

    return {
      winner_id: winnerId,
      team1_power,
      team2_power,
      phase1_result: phase1,
      phase2_result: phase2,
      phase3_result: phase3,
      match_log: { team1Players, team2Players },
      lp_change: lpChange,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 팀 선수 정보 가져오기
 */
async function getTeamPlayers(client: any, teamId: string): Promise<Player[]> {
  const rosterResult = await client.query(
    'SELECT * FROM rosters WHERE team_id = $1',
    [teamId]
  );

  const roster = rosterResult.rows[0];
  const players: Player[] = [];

  const positions = ['top', 'jungle', 'mid', 'adc', 'support'];

  for (const pos of positions) {
    const playerId = roster[`${pos}_player_id`];
    if (!playerId) {
      throw new Error(`${pos} 포지션에 선수가 없습니다`);
    }

    const playerResult = await client.query(
      `SELECT upc.*, pc.position, pc.mental, pc.team_fight, pc.cs_ability,
              pc.vision, pc.judgment, pc.laning, pc.power
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.id = $1`,
      [playerId]
    );

    players.push(playerResult.rows[0]);
  }

  return players;
}

/**
 * 팀 파워 계산
 */
function calculateTeamPower(players: Player[]): number {
  let totalPower = 0;

  for (const player of players) {
    let power = player.power;

    // 컨디션 보너스
    power += power * CONDITION_BONUS[player.condition];

    // 폼 보너스
    power += power * (player.form / 100);

    totalPower += power;
  }

  return Math.round(totalPower);
}

/**
 * 페이즈 1: 라인전 (0~15분)
 */
function simulatePhase1(team1: Player[], team2: Player[]): PhaseResult {
  let team1Score = 0;
  let team2Score = 0;
  const events: string[] = [];

  // 각 라인별 대결
  for (let i = 0; i < 5; i++) {
    const p1 = team1[i];
    const p2 = team2[i];

    const p1Laning = p1.laning + p1.cs_ability + p1.judgment;
    const p2Laning = p2.laning + p2.cs_ability + p2.judgment;

    const p1Power = p1Laning * (1 + CONDITION_BONUS[p1.condition]);
    const p2Power = p2Laning * (1 + CONDITION_BONUS[p2.condition]);

    if (p1Power > p2Power) {
      team1Score += 20;
      events.push(`${p1.position} 라인에서 우세를 점했습니다!`);
    } else if (p2Power > p1Power) {
      team2Score += 20;
      events.push(`${p2.position} 라인에서 밀렸습니다...`);
    } else {
      team1Score += 10;
      team2Score += 10;
      events.push(`${p1.position} 라인이 비등비등합니다.`);
    }
  }

  return {
    team1_score: team1Score,
    team2_score: team2Score,
    description: '라인전 페이즈',
    events,
  };
}

/**
 * 페이즈 2: 오브젝트 한타 (15~30분)
 */
function simulatePhase2(team1: Player[], team2: Player[], phase1: PhaseResult): PhaseResult {
  let team1Score = phase1.team1_score;
  let team2Score = phase1.team2_score;
  const events: string[] = [];

  // 드래곤/바론 쟁탈전
  for (let i = 0; i < 3; i++) {
    const team1TF = team1.reduce((sum, p) => sum + p.team_fight + p.vision, 0);
    const team2TF = team2.reduce((sum, p) => sum + p.team_fight + p.vision, 0);

    const random1 = Math.random() * 0.2 + 0.9; // 0.9~1.1
    const random2 = Math.random() * 0.2 + 0.9;

    if (team1TF * random1 > team2TF * random2) {
      team1Score += 30;
      events.push('오브젝트를 성공적으로 획득했습니다!');
    } else {
      team2Score += 30;
      events.push('오브젝트를 빼앗겼습니다...');
    }
  }

  return {
    team1_score: team1Score,
    team2_score: team2Score,
    description: '오브젝트 한타 페이즈',
    events,
  };
}

/**
 * 페이즈 3: 최종 한타 (30~45분)
 */
function simulatePhase3(team1: Player[], team2: Player[], phase2: PhaseResult): PhaseResult {
  let team1Score = phase2.team1_score;
  let team2Score = phase2.team2_score;
  const events: string[] = [];

  // 최종 한타
  const team1FinalPower = team1.reduce(
    (sum, p) =>
      sum +
      p.mental +
      p.team_fight +
      p.judgment +
      p.power * CONDITION_BONUS[p.condition],
    0
  );

  const team2FinalPower = team2.reduce(
    (sum, p) =>
      sum +
      p.mental +
      p.team_fight +
      p.judgment +
      p.power * CONDITION_BONUS[p.condition],
    0
  );

  // 주사위 (랭크전 한정 1~10)
  const dice1 = Math.floor(Math.random() * 10) + 1;
  const dice2 = Math.floor(Math.random() * 10) + 1;

  const finalTeam1 = team1FinalPower * (1 + dice1 / 100);
  const finalTeam2 = team2FinalPower * (1 + dice2 / 100);

  events.push(`주사위를 굴렸습니다! (우리: ${dice1}, 상대: ${dice2})`);

  if (finalTeam1 > finalTeam2) {
    team1Score += 50;
    events.push('최종 한타에서 승리했습니다!');
  } else {
    team2Score += 50;
    events.push('최종 한타에서 패배했습니다...');
  }

  return {
    team1_score: team1Score,
    team2_score: team2Score,
    description: '최종 한타 페이즈',
    events,
  };
}

/**
 * LP 변화 계산
 */
function calculateLPChange(tier1: string, tier2: string, team1Won: boolean): number {
  const tierValues: any = {
    BRONZE: 1,
    SILVER: 2,
    GOLD: 3,
    PLATINUM: 4,
    DIAMOND: 5,
    MASTER: 6,
    CHALLENGER: 7,
  };

  const diff = tierValues[tier2] - tierValues[tier1];
  let lp = 50;

  if (team1Won) {
    lp += diff * 10; // 상대가 높을수록 LP 더 많이 획득
  } else {
    lp = 30 - diff * 5; // 상대가 낮을수록 LP 덜 잃음
  }

  return Math.max(10, Math.min(100, lp));
}

/**
 * 팀 통계 업데이트
 */
async function updateTeamStats(
  client: any,
  teamId: string,
  won: boolean,
  lpChange: number
) {
  if (won) {
    await client.query(
      `UPDATE teams
       SET wins = wins + 1,
           win_streak = win_streak + 1,
           lp = lp + $1
       WHERE id = $2`,
      [lpChange, teamId]
    );
  } else {
    await client.query(
      `UPDATE teams
       SET losses = losses + 1,
           win_streak = 0,
           lp = GREATEST(0, lp + $1)
       WHERE id = $2`,
      [lpChange, teamId]
    );
  }

  // 티어 승급/강등 체크
  await checkTierPromotion(client, teamId);
}

/**
 * 티어 승급/강등 체크
 */
async function checkTierPromotion(client: any, teamId: string) {
  const teamResult = await client.query('SELECT * FROM teams WHERE id = $1', [teamId]);
  const team = teamResult.rows[0];

  const tierThresholds: any = {
    BRONZE: 0,
    SILVER: 1000,
    GOLD: 2000,
    PLATINUM: 2500,
    DIAMOND: 3500,
    MASTER: 4000,
    CHALLENGER: 6500,
  };

  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'CHALLENGER'];
  let newTier = team.current_tier;

  for (let i = tiers.length - 1; i >= 0; i--) {
    if (team.lp >= tierThresholds[tiers[i]]) {
      newTier = tiers[i];
      break;
    }
  }

  if (newTier !== team.current_tier) {
    await client.query(
      'UPDATE teams SET current_tier = $1 WHERE id = $2',
      [newTier, teamId]
    );
  }
}
