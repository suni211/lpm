import { query, getConnection } from '../database/db';

interface LeagueInfo {
  id: number;
  league_name: string;
  league_display: string;
  max_teams: number;
  tier_level: number;
}

interface SeasonInfo {
  id: number;
  season_number: number;
  season_name: string;
  start_date: Date;
  end_date: Date;
  status: string;
}

interface LeagueParticipant {
  id: string;
  team_id: string | null;
  team_name: string;
  is_ai: boolean;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  current_rank?: number;
}

// 현재 진행 중인 시즌 조회
export async function getCurrentSeason(): Promise<SeasonInfo | null> {
  const [result]: any = await query(
    `SELECT * FROM league_seasons WHERE status IN ('ONGOING', 'UPCOMING') ORDER BY season_number DESC LIMIT 1`
  );

  if (result.length === 0) return null;
  return result[0];
}

// 특정 팀이 속한 리그 조회
export async function getTeamLeague(teamId: string, seasonId: number): Promise<any> {
  const [result]: any = await query(
    `SELECT lp.*, l.league_name, l.league_display, l.tier_level
     FROM league_participants lp
     JOIN leagues l ON lp.league_id = l.id
     WHERE lp.team_id = ? AND lp.season_id = ?`,
    [teamId, seasonId]
  );

  if (result.length === 0) return null;
  return result[0];
}

// 특정 리그의 순위표 조회
export async function getLeagueStandings(leagueId: number, seasonId: number): Promise<LeagueParticipant[]> {
  const [result]: any = await query(
    `SELECT lp.*, t.team_name as user_team_name, t.logo_url
     FROM league_participants lp
     LEFT JOIN teams t ON lp.team_id = t.id
     WHERE lp.league_id = ? AND lp.season_id = ?
     ORDER BY lp.points DESC, lp.goal_difference DESC, lp.goals_for DESC`,
    [leagueId, seasonId]
  );

  // 순위 부여
  return result.map((participant: any, index: number) => ({
    ...participant,
    current_rank: index + 1,
    team_name: participant.user_team_name || participant.team_name, // 유저 팀 이름 우선
  }));
}

// 특정 리그의 경기 일정 조회
export async function getLeagueMatches(leagueId: number, seasonId: number) {
  const [result]: any = await query(
    `SELECT lm.*,
            hp.team_name as home_team_name, hp.is_ai as home_is_ai, home_team.logo_url as home_team_logo,
            ap.team_name as away_team_name, ap.is_ai as away_is_ai, away_team.logo_url as away_team_logo
     FROM league_matches lm
     JOIN league_participants hp ON lm.home_participant_id = hp.id
     JOIN league_participants ap ON lm.away_participant_id = ap.id
     LEFT JOIN teams home_team ON hp.team_id = home_team.id
     LEFT JOIN teams away_team ON ap.team_id = away_team.id
     WHERE lm.league_id = ? AND lm.season_id = ?
     ORDER BY lm.match_week ASC, lm.match_date ASC`,
    [leagueId, seasonId]
  );

  return result;
}

// 다음 경기 일정 조회
export async function getNextSchedule(seasonId: number) {
  const [result]: any = await query(
    `SELECT * FROM league_schedule
     WHERE season_id = ? AND is_completed = FALSE
     ORDER BY event_date ASC LIMIT 1`,
    [seasonId]
  );

  if (result.length === 0) return null;
  return result[0];
}

// AI 팀 생성
async function generateAITeam(leagueName: string, index: number): Promise<{ team_name: string }> {
  const aiTeamNames = [
    'Dragon Knights', 'Phoenix Rising', 'Thunder Strike', 'Iron Wolves',
    'Shadow Hunters', 'Storm Riders', 'Sky Warriors', 'Dark Legion',
    'Crystal Guards', 'Flame Titans', 'Ice Breakers', 'Wind Runners',
    'Star Seekers', 'Moon Shadows', 'Sun Blazers', 'Ocean Masters',
    'Mountain Kings', 'Forest Rangers', 'Desert Nomads', 'Arctic Foxes',
    'Neon Vipers', 'Cyber Panthers', 'Quantum Force', 'Nova Squad',
    'Astral Legends', 'Cosmic Heroes', 'Galaxy Defenders', 'Void Walkers',
    'Blitz Brigade', 'Elite Warriors', 'Prime Legion', 'Apex Predators',
    'Royal Guards', 'Noble Knights', 'Silver Hawks', 'Golden Eagles',
    'Ruby Dragons', 'Emerald Serpents', 'Sapphire Falcons', 'Diamond Tigers',
    'Mystic Mages', 'Ancient Spirits', 'Sacred Order', 'Divine Crusaders',
    'Eternal Champions', 'Immortal Heroes', 'Legendary Warriors', 'Epic Fighters',
    'Battle Mages', 'War Lords', 'Victory Squad', 'Glory Seekers',
  ];

  const randomName = aiTeamNames[Math.floor(Math.random() * aiTeamNames.length)];
  return {
    team_name: `${leagueName} ${randomName} #${index}`,
  };
}

// 새 시즌 초기화 (리그 배정 및 AI 팀 생성)
export async function initializeNewSeason(seasonNumber: number, seasonName: string, startDate: Date, endDate: Date) {
  const client = await getConnection();

  try {
    await client.beginTransaction();

    // 새 시즌 생성
    const [seasonResult]: any = await client.query(
      `INSERT INTO league_seasons (season_number, season_name, start_date, end_date, status)
       VALUES (?, ?, ?, ?, 'UPCOMING')`,
      [seasonNumber, seasonName, startDate, endDate]
    );

    const seasonId = seasonResult.insertId;

    // 모든 리그 조회
    const [leagues]: any = await client.query(`SELECT * FROM leagues ORDER BY tier_level ASC`);

    // 모든 유저 팀 조회
    const [userTeams]: any = await client.query(`SELECT id, team_name FROM teams`);

    // 유저 팀을 Beginner 리그에 배정
    const beginnerLeague = leagues.find((l: LeagueInfo) => l.league_name === 'BEGINNER');

    if (!beginnerLeague) {
      throw new Error('Beginner league not found');
    }

    // 각 리그에 팀 배정
    for (const league of leagues) {
      const participants: any[] = [];

      if (league.league_name === 'BEGINNER') {
        // Beginner 리그에 모든 유저 팀 추가
        for (const team of userTeams) {
          participants.push({
            team_id: team.id,
            team_name: team.team_name,
            is_ai: false,
          });
        }
      }

      // 부족한 슬롯을 AI 팀으로 채우기
      const remainingSlots = league.max_teams - participants.length;
      for (let i = 0; i < remainingSlots; i++) {
        const aiTeam = await generateAITeam(league.league_display, i + 1);
        participants.push({
          team_id: null,
          team_name: aiTeam.team_name,
          is_ai: true,
        });
      }

      // 참가 팀 저장
      for (const participant of participants) {
        await client.query(
          `INSERT INTO league_participants (season_id, team_id, league_id, team_name, is_ai)
           VALUES (?, ?, ?, ?, ?)`,
          [seasonId, participant.team_id, league.id, participant.team_name, participant.is_ai]
        );
      }
    }

    // 각 리그의 경기 일정 생성 (라운드 로빈)
    for (const league of leagues) {
      await generateRoundRobinSchedule(client, seasonId, league.id, startDate);
    }

    await client.commit();

    console.log(`✅ 시즌 ${seasonNumber} 초기화 완료`);
    return seasonId;
  } catch (error) {
    await client.rollback();
    console.error('❌ 시즌 초기화 오류:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 라운드 로빈 경기 일정 생성
async function generateRoundRobinSchedule(client: any, seasonId: number, leagueId: number, startDate: Date) {
  // 해당 리그의 모든 참가 팀 조회
  const [participants]: any = await client.query(
    `SELECT id FROM league_participants WHERE season_id = ? AND league_id = ?`,
    [seasonId, leagueId]
  );

  const teams = participants.map((p: any) => p.id);
  const numTeams = teams.length;

  if (numTeams < 2) {
    console.log(`⚠️  리그 ${leagueId}에 팀이 부족하여 일정을 생성하지 않습니다.`);
    return;
  }

  // 라운드 로빈 알고리즘
  const matches: any[] = [];
  let matchWeek = 1;

  // 홈 앤 어웨이 (2번씩 대결)
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < numTeams; i++) {
      for (let j = i + 1; j < numTeams; j++) {
        const homeTeam = round === 0 ? teams[i] : teams[j];
        const awayTeam = round === 0 ? teams[j] : teams[i];

        // 경기 날짜 계산 (1주일 간격)
        const matchDate = new Date(startDate);
        matchDate.setDate(matchDate.getDate() + (matchWeek - 1) * 7);

        matches.push({
          home_participant_id: homeTeam,
          away_participant_id: awayTeam,
          match_week: matchWeek,
          match_date: matchDate,
        });

        matchWeek++;
      }
    }
  }

  // 경기 저장
  for (const match of matches) {
    await client.query(
      `INSERT INTO league_matches (season_id, league_id, match_week, home_participant_id, away_participant_id, match_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
      [seasonId, leagueId, match.match_week, match.home_participant_id, match.away_participant_id, match.match_date]
    );
  }

  console.log(`✅ 리그 ${leagueId} 경기 일정 생성 완료: ${matches.length}경기`);
}

// 경기 시뮬레이션 (간단한 버전)
export async function simulateLeagueMatch(matchId: string) {
  const client = await getConnection();

  try {
    await client.beginTransaction();

    // 경기 정보 조회
    const [matchResult]: any = await client.query(
      `SELECT lm.*,
              hp.team_id as home_team_id, hp.team_name as home_team_name,
              ap.team_id as away_team_id, ap.team_name as away_team_name
       FROM league_matches lm
       JOIN league_participants hp ON lm.home_participant_id = hp.id
       JOIN league_participants ap ON lm.away_participant_id = ap.id
       WHERE lm.id = ?`,
      [matchId]
    );

    if (matchResult.length === 0) {
      throw new Error('경기를 찾을 수 없습니다');
    }

    const match = matchResult[0];

    // 간단한 랜덤 시뮬레이션 (나중에 matchEngine.ts 사용 가능)
    const homeScore = Math.floor(Math.random() * 4); // 0-3 골
    const awayScore = Math.floor(Math.random() * 4);

    // 경기 결과 업데이트
    await client.query(
      `UPDATE league_matches SET home_score = ?, away_score = ?, status = 'FINISHED' WHERE id = ?`,
      [homeScore, awayScore, matchId]
    );

    // 참가 팀 통계 업데이트
    const homeWin = homeScore > awayScore;
    const awayWin = awayScore > homeScore;
    const draw = homeScore === awayScore;

    // 홈 팀 업데이트
    await client.query(
      `UPDATE league_participants SET
        wins = wins + ?,
        losses = losses + ?,
        draws = draws + ?,
        points = points + ?,
        goals_for = goals_for + ?,
        goals_against = goals_against + ?,
        goal_difference = goal_difference + ?
       WHERE id = ?`,
      [
        homeWin ? 1 : 0,
        awayWin ? 1 : 0,
        draw ? 1 : 0,
        homeWin ? 3 : draw ? 1 : 0,
        homeScore,
        awayScore,
        homeScore - awayScore,
        match.home_participant_id,
      ]
    );

    // 어웨이 팀 업데이트
    await client.query(
      `UPDATE league_participants SET
        wins = wins + ?,
        losses = losses + ?,
        draws = draws + ?,
        points = points + ?,
        goals_for = goals_for + ?,
        goals_against = goals_against + ?,
        goal_difference = goal_difference + ?
       WHERE id = ?`,
      [
        awayWin ? 1 : 0,
        homeWin ? 1 : 0,
        draw ? 1 : 0,
        awayWin ? 3 : draw ? 1 : 0,
        awayScore,
        homeScore,
        awayScore - homeScore,
        match.away_participant_id,
      ]
    );

    await client.commit();

    return {
      homeScore,
      awayScore,
      homeTeamName: match.home_team_name,
      awayTeamName: match.away_team_name,
    };
  } catch (error) {
    await client.rollback();
    console.error('❌ 경기 시뮬레이션 오류:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 모든 리그 조회
export async function getAllLeagues(): Promise<LeagueInfo[]> {
  const [result]: any = await query(`SELECT * FROM leagues ORDER BY tier_level ASC`);
  return result;
}
