import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './League.css';
import { useToast } from '../contexts/ToastContext';

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
  logo_url?: string;
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
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  home_team_logo?: string;
  away_team_logo?: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  status: string;
}

const TeamLogo: React.FC<{ logoUrl?: string, teamName: string }> = ({ logoUrl, teamName }) => (
    <img src={logoUrl || '/default-logo.png'} alt={`${teamName} logo`} className="team-logo" onError={(e) => (e.currentTarget.src = '/default-logo.png')} />
);

const League: React.FC = () => {
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [myLeague, setMyLeague] = useState<any>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [allLeagues, setAllLeagues] = useState<LeagueInfo[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string>('');
  const { showToast } = useToast();

  const fetchLeagueData = useCallback(async (leagueId: number) => {
    try {
      const [standingsResponse, matchesResponse] = await Promise.all([
        api.get(`/league/standings/${leagueId}`),
        api.get(`/league/matches/${leagueId}`)
      ]);
      if (standingsResponse.data.success) setStandings(standingsResponse.data.standings);
      if (matchesResponse.data.success) setMatches(matchesResponse.data.matches);
    } catch (error) {
      showToast('리그 정보를 불러오는데 실패했습니다.', 'error');
    }
  }, [showToast]);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const teamResponse = await api.get('/team/my-team');
      const teamId = teamResponse.data.team.id;
      setUserTeamId(teamId);

      const [seasonResponse, myLeagueResponse, leaguesResponse] = await Promise.all([
        api.get('/league/current-season'),
        api.get('/league/my-league', { params: { team_id: teamId } }),
        api.get('/league/all-leagues')
      ]);

      if (seasonResponse.data.success) setSeason(seasonResponse.data.season);
      if (leaguesResponse.data.success) setAllLeagues(leaguesResponse.data.leagues);
      
      if (myLeagueResponse.data.success) {
        setMyLeague(myLeagueResponse.data.league);
        setSelectedLeagueId(myLeagueResponse.data.league.league_id);
      } else if (leaguesResponse.data.success && leaguesResponse.data.leagues.length > 0) {
        setSelectedLeagueId(leaguesResponse.data.leagues[0].id);
      }
    } catch (error) {
      showToast('초기 리그 정보를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
  useEffect(() => { if (selectedLeagueId) fetchLeagueData(selectedLeagueId); }, [selectedLeagueId, fetchLeagueData]);

  const getLeagueTierColor = (tierLevel: number) => ({1: '#F4C430', 2: '#EE82EE', 3: '#00CED1', 4: '#C0C0C0'}[tierLevel] || '#95a5a6');
  const getMatchStatus = (status: string) => ({'SCHEDULED': '예정', 'IN_PROGRESS': '진행 중', 'FINISHED': '종료', 'CANCELLED': '취소'}[status] || status);
  const formatDate = (dateString: string) => dateString ? new Date(dateString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const renderMatchResultBadge = (match: Match) => {
    if (match.status !== 'FINISHED' || (match.home_team_id !== userTeamId && match.away_team_id !== userTeamId)) return null;
    
    let result: 'WIN' | 'LOSE' | 'DRAW' | null = null;
    if(match.home_score === match.away_score) result = 'DRAW';
    else if ((match.home_team_id === userTeamId && match.home_score! > match.away_score!) || (match.away_team_id === userTeamId && match.away_score! > match.home_score!)) {
        result = 'WIN';
    } else {
        result = 'LOSE';
    }

    return <div className={`match-result-badge ${result.toLowerCase()}`}>{result}</div>;
  };

  if (loading && !season) return <div className="league-loading"><div className="spinner"></div><p>리그 정보를 불러오는 중...</p></div>;
  if (!season) return <div className="league-no-season"><h2>진행 중인 시즌이 없습니다</h2><p>새 시즌이 시작되면 리그에 참가할 수 있습니다.</p></div>;

  return (
    <div className="league">
      <div className="league-container">
        <div className="season-header">
          <div className="season-info">
            <h1 className="season-title">🏆 {season.season_name}</h1>
            <div className="season-dates">{formatDate(season.start_date)} ~ {formatDate(season.end_date)}</div>
            <div className="season-status">{season.status === 'ONGOING' ? '진행 중' : season.status}</div>
          </div>
          {myLeague && <div className="my-league-badge"><div className="badge-label">내 리그</div><div className="badge-league" style={{ color: getLeagueTierColor(myLeague.tier_level) }}>{myLeague.league_display}</div><div className="badge-rank">{myLeague.current_rank || 'N/A'}위 / {myLeague.max_teams}팀</div></div>}
        </div>

        <div className="league-tabs">{allLeagues.map((league) => <button key={league.id} className={`league-tab ${selectedLeagueId === league.id ? 'active' : ''}`} onClick={() => setSelectedLeagueId(league.id)} style={{'--active-color': getLeagueTierColor(league.tier_level)} as React.CSSProperties}><span className="tab-icon">{['👑', '💎', '⚔️', '🛡️'][league.tier_level-1] || '🛡️'}</span><span className="tab-name">{league.league_display}</span></button>)}</div>
        
        <div className="league-content">
          <div className="standings-section">
            <h2 className="section-title">순위표</h2>
            <div className="standings-table">
              <div className="table-header"><div className="col-rank">#</div><div className="col-team">팀</div><div className="col-record">전적</div><div className="col-points">승점</div><div className="col-gd">득실</div></div>
              <div className="table-body">
                {standings.length === 0 ? <div className="no-data">순위 데이터가 없습니다</div> : standings.map((team) => (
                  <div key={team.id} className={`standing-row ${team.team_id === userTeamId ? 'my-team' : ''} ${team.current_rank <= 2 ? 'promotion-zone' : team.current_rank >= standings.length - 1 ? 'relegation-zone' : ''}`}>
                    <div className="col-rank"><span className={`rank-number top-${team.current_rank}`}>{team.current_rank}</span></div>
                    <div className="col-team"><TeamLogo logoUrl={team.logo_url} teamName={team.team_name} /><span className="team-name">{team.team_name}</span></div>
                    <div className="col-record"><span>{team.wins}승</span><span>{team.draws}무</span><span>{team.losses}패</span></div>
                    <div className="col-points">{team.points}</div>
                    <div className={`col-gd ${team.goal_difference > 0 ? 'positive' : team.goal_difference < 0 ? 'negative' : ''}`}>{team.goal_difference > 0 ? '+' : ''}{team.goal_difference}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="standings-legend"><div className="legend-item promotion"><div className="legend-color"></div><span>승격 PO</span></div><div className="legend-item relegation"><div className="legend-color"></div><span>강등 PO</span></div></div>
          </div>

          <div className="matches-section">
            <h2 className="section-title">경기 일정</h2>
            <div className="matches-list">
              {matches.length === 0 ? <div className="no-data">경기 일정이 없습니다</div> : matches.map((match) => (
                <div key={match.id} className={`match-card status-${match.status.toLowerCase()}`}>
                  {renderMatchResultBadge(match)}
                  <div className="match-week">W{match.match_week}</div>
                  <div className="match-teams">
                    <div className="team-info home"><TeamLogo logoUrl={match.home_team_logo} teamName={match.home_team_name} /> {match.home_team_name}</div>
                    <div className="team-score">{match.status === 'FINISHED' ? `${match.home_score} : ${match.away_score}` : 'VS'}</div>
                    <div className="team-info away">{match.away_team_name} <TeamLogo logoUrl={match.away_team_logo} teamName={match.away_team_name} /></div>
                  </div>
                  <div className="match-details"><span className="match-date">{formatDate(match.match_date)}</span><span className={`match-status-badge status-${match.status.toLowerCase()}`}>{getMatchStatus(match.status)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="info-banner"><div className="info-icon">ℹ️</div><div className="info-content"><h3>리그 시스템 안내</h3><ul><li>각 리그는 라운드 로빈(홈&어웨이) 방식으로 진행됩니다.</li><li>시즌 종료 후, 상위 2팀은 승격 플레이오프, 하위 2팀은 강등 플레이오프에 진출합니다.</li><li>플레이오프 결과에 따라 승격, 잔류, 강등이 결정됩니다.</li></ul></div></div>
      </div>
    </div>
  );
};

export default League;
