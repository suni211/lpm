import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './League.css';

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
  start_date: string;
  end_date: string;
  status: string;
}

interface Standing {
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
  current_rank: number;
}

interface Match {
  id: string;
  match_week: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
  home_is_ai: boolean;
  away_is_ai: boolean;
}

const League: React.FC = () => {
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [myLeague, setMyLeague] = useState<any>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allLeagues, setAllLeagues] = useState<LeagueInfo[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      fetchLeagueData(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const fetchInitialData = async () => {
    try {
      // 유저 팀 정보 조회
      const teamResponse = await api.get('/team/my-team');
      const teamId = teamResponse.data.team.id;
      setUserTeamId(teamId);

      // 현재 시즌 정보 조회
      const seasonResponse = await api.get('/league/current-season');
      if (seasonResponse.data.success) {
        setSeason(seasonResponse.data.season);

        // 내 팀의 리그 정보 조회
        const myLeagueResponse = await api.get('/league/my-league', {
          params: { team_id: teamId },
        });

        if (myLeagueResponse.data.success) {
          setMyLeague(myLeagueResponse.data.league);
          setSelectedLeagueId(myLeagueResponse.data.league.league_id);
        }
      }

      // 모든 리그 조회
      const leaguesResponse = await api.get('/league/all-leagues');
      if (leaguesResponse.data.success) {
        setAllLeagues(leaguesResponse.data.leagues);
      }
    } catch (error) {
      console.error('초기 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueData = async (leagueId: number) => {
    try {
      // 순위표 조회
      const standingsResponse = await api.get(`/league/standings/${leagueId}`);
      if (standingsResponse.data.success) {
        setStandings(standingsResponse.data.standings);
      }

      // 경기 일정 조회
      const matchesResponse = await api.get(`/league/matches/${leagueId}`);
      if (matchesResponse.data.success) {
        setMatches(matchesResponse.data.matches);
      }
    } catch (error) {
      console.error('리그 데이터 조회 실패:', error);
    }
  };

  const getLeagueTierColor = (tierLevel: number) => {
    switch (tierLevel) {
      case 1: return '#F4C430'; // Challenger - Gold
      case 2: return '#EE82EE'; // Euroni - Violet
      case 3: return '#00CED1'; // Amateur - Cyan
      case 4: return '#C0C0C0'; // Beginner - Silver
      default: return '#95a5a6';
    }
  };

  const getMatchStatus = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return '예정';
      case 'IN_PROGRESS': return '진행 중';
      case 'FINISHED': return '종료';
      case 'CANCELLED': return '취소';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="league-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="league-no-season">
        <h2>진행 중인 시즌이 없습니다</h2>
        <p>새 시즌이 시작되면 리그에 참가할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="league">
      <div className="league-container">
        {/* 시즌 정보 */}
        <div className="season-header">
          <div className="season-info">
            <h1 className="season-title">🏆 {season.season_name}</h1>
            <div className="season-dates">
              {formatDate(season.start_date)} ~ {formatDate(season.end_date)}
            </div>
            <div className="season-status">{season.status === 'ONGOING' ? '진행 중' : season.status}</div>
          </div>

          {myLeague && (
            <div className="my-league-badge">
              <div className="badge-label">내 리그</div>
              <div
                className="badge-league"
                style={{ color: getLeagueTierColor(myLeague.tier_level) }}
              >
                {myLeague.league_display}
              </div>
              <div className="badge-rank">
                {myLeague.current_rank || 'N/A'}위 / {myLeague.max_teams}팀
              </div>
            </div>
          )}
        </div>

        {/* 리그 선택 탭 */}
        <div className="league-tabs">
          {allLeagues.map((league) => (
            <button
              key={league.id}
              className={`league-tab ${selectedLeagueId === league.id ? 'active' : ''}`}
              onClick={() => setSelectedLeagueId(league.id)}
              style={{
                borderColor: selectedLeagueId === league.id ? getLeagueTierColor(league.tier_level) : 'transparent',
              }}
            >
              <span className="tab-icon" style={{ color: getLeagueTierColor(league.tier_level) }}>
                {league.tier_level === 1 ? '👑' : league.tier_level === 2 ? '💎' : league.tier_level === 3 ? '⚔️' : '🛡️'}
              </span>
              <span className="tab-name">{league.league_display}</span>
              <span className="tab-teams">{league.max_teams}팀</span>
            </button>
          ))}
        </div>

        {/* 순위표 */}
        <div className="standings-section">
          <h2 className="section-title">순위표</h2>
          <div className="standings-table">
            <div className="table-header">
              <div className="col-rank">순위</div>
              <div className="col-team">팀명</div>
              <div className="col-record">전적</div>
              <div className="col-points">승점</div>
              <div className="col-gd">득실차</div>
            </div>
            <div className="table-body">
              {standings.length === 0 ? (
                <div className="no-data">순위 데이터가 없습니다</div>
              ) : (
                standings.map((team) => (
                  <div
                    key={team.id}
                    className={`standing-row ${team.team_id === userTeamId ? 'my-team' : ''} ${
                      team.current_rank <= 2 ? 'promotion-zone' : team.current_rank >= standings.length - 1 ? 'relegation-zone' : ''
                    }`}
                  >
                    <div className="col-rank">
                      <span className={`rank-number ${team.current_rank <= 3 ? `top-${team.current_rank}` : ''}`}>
                        {team.current_rank}
                      </span>
                    </div>
                    <div className="col-team">
                      <span className="team-name">
                        {team.team_name}
                        {!team.is_ai && team.team_id === userTeamId && <span className="badge-me">내 팀</span>}
                        {team.is_ai && <span className="badge-ai">AI</span>}
                      </span>
                    </div>
                    <div className="col-record">
                      <span className="record-wins">{team.wins}승</span>
                      <span className="record-draws">{team.draws}무</span>
                      <span className="record-losses">{team.losses}패</span>
                    </div>
                    <div className="col-points">
                      <span className="points-value">{team.points}</span>
                    </div>
                    <div className="col-gd">
                      <span className={`gd-value ${team.goal_difference > 0 ? 'positive' : team.goal_difference < 0 ? 'negative' : ''}`}>
                        {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="standings-legend">
            <div className="legend-item promotion">
              <div className="legend-color"></div>
              <span>승격 플레이오프 진출 (상위 2팀)</span>
            </div>
            <div className="legend-item relegation">
              <div className="legend-color"></div>
              <span>강등 플레이오프 (하위 2팀)</span>
            </div>
          </div>
        </div>

        {/* 경기 일정 */}
        <div className="matches-section">
          <h2 className="section-title">경기 일정</h2>
          <div className="matches-list">
            {matches.length === 0 ? (
              <div className="no-data">경기 일정이 없습니다</div>
            ) : (
              matches.map((match) => (
                <div key={match.id} className={`match-card ${match.status.toLowerCase()}`}>
                  <div className="match-week">Week {match.match_week}</div>
                  <div className="match-teams">
                    <div className="match-team home">
                      <span className="team-name">
                        {match.home_team_name}
                        {match.home_is_ai && <span className="badge-ai-small">AI</span>}
                      </span>
                      {match.status === 'FINISHED' && <span className="team-score">{match.home_score}</span>}
                    </div>
                    <div className="match-vs">VS</div>
                    <div className="match-team away">
                      {match.status === 'FINISHED' && <span className="team-score">{match.away_score}</span>}
                      <span className="team-name">
                        {match.away_team_name}
                        {match.away_is_ai && <span className="badge-ai-small">AI</span>}
                      </span>
                    </div>
                  </div>
                  <div className="match-info">
                    <span className="match-date">{formatDate(match.match_date)}</span>
                    <span className={`match-status ${match.status.toLowerCase()}`}>
                      {getMatchStatus(match.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 시스템 안내 */}
        <div className="info-banner">
          <div className="info-icon">ℹ️</div>
          <div className="info-content">
            <h3>리그 시스템 안내</h3>
            <ul>
              <li>각 리그에서 라운드 로빈(홈&어웨이) 방식으로 모든 팀과 대결합니다.</li>
              <li>시즌 종료 시, 상위 2팀은 승격 플레이오프에, 하위 2팀은 강등 플레이오프에 진출합니다.</li>
              <li>플레이오프에서 승리하면 승격/잔류, 패배하면 강등/잔류가 결정됩니다.</li>
              <li>새 유저는 비기너 리그에서 시작하며, 실력을 쌓아 상위 리그로 올라갈 수 있습니다!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default League;
