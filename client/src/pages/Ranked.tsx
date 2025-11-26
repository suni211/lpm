import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Ranked.css';

interface RankingEntry {
  team_id: string;
  team_name: string;
  team_logo: string | null;
  current_tier: string;
  lp: number;
  wins: number;
  losses: number;
  win_streak: number;
}

const Ranked: React.FC = () => {
  const navigate = useNavigate();
  const { team } = useAuth();
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await api.get('/match/rankings');
      setRankings(response.data.rankings);
    } catch (error) {
      console.error('랭킹 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatch = async () => {
    setQueueing(true);
    // Simulate matchmaking
    setTimeout(() => {
      navigate('/match');
    }, 1500);
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      BRONZE: '#CD7F32',
      SILVER: '#C0C0C0',
      GOLD: '#FFD700',
      PLATINUM: '#00CED1',
      DIAMOND: '#B9F2FF',
      MASTER: '#EE82EE',
      CHALLENGER: '#F4C430',
    };
    return colors[tier] || '#fff';
  };

  const getWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return ((wins / (wins + losses)) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="ranked-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="ranked">
      <div className="ranked-container">
        <div className="ranked-header">
          <h1 className="ranked-title">🏆 랭크 리그</h1>
          <div className="header-actions">
            <button className="btn-find-match" onClick={handleFindMatch} disabled={queueing}>
              {queueing ? '⏳ 매칭 중...' : '⚔️ 경기 찾기'}
            </button>
          </div>
        </div>

        {team && (
          <div className="my-rank-card">
            <div className="my-rank-header">
              <h2>내 랭크 정보</h2>
            </div>
            <div className="my-rank-content">
              <div className="rank-info">
                <div className="rank-tier" style={{ color: getTierColor(team.current_tier) }}>
                  {team.current_tier}
                </div>
                <div className="rank-lp">{team.lp} LP</div>
              </div>
              <div className="rank-stats">
                <div className="stat-item">
                  <span className="stat-label">전적</span>
                  <span className="stat-value">{team.wins}승 {team.losses}패</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">승률</span>
                  <span className="stat-value">{getWinRate(team.wins, team.losses)}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">연승</span>
                  <span className="stat-value win-streak">{team.win_streak}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rankings-section">
          <h2 className="section-title">순위표</h2>
          <div className="rankings-table">
            <div className="table-header">
              <div className="col-rank">순위</div>
              <div className="col-team">팀</div>
              <div className="col-tier">티어</div>
              <div className="col-lp">LP</div>
              <div className="col-record">전적</div>
              <div className="col-winrate">승률</div>
            </div>
            <div className="table-body">
              {rankings.length === 0 ? (
                <div className="no-rankings">아직 랭킹 데이터가 없습니다</div>
              ) : (
                rankings.map((entry, index) => (
                  <div
                    key={entry.team_id}
                    className={`ranking-row ${entry.team_id === team?.id ? 'my-team' : ''}`}
                  >
                    <div className="col-rank">
                      <span className="rank-number">{index + 1}</span>
                    </div>
                    <div className="col-team">
                      <div className="team-info">
                        {entry.team_logo ? (
                          <img src={entry.team_logo} alt={entry.team_name} className="team-logo" />
                        ) : (
                          <div className="team-logo-placeholder">🎮</div>
                        )}
                        <span className="team-name">{entry.team_name}</span>
                      </div>
                    </div>
                    <div className="col-tier">
                      <span className="tier-badge" style={{ color: getTierColor(entry.current_tier) }}>
                        {entry.current_tier}
                      </span>
                    </div>
                    <div className="col-lp">
                      <span className="lp-value">{entry.lp}</span>
                    </div>
                    <div className="col-record">
                      <span className="record-text">{entry.wins}승 {entry.losses}패</span>
                    </div>
                    <div className="col-winrate">
                      <span className="winrate-value">
                        {getWinRate(entry.wins, entry.losses)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="tier-info-section">
          <h2 className="section-title">티어 정보</h2>
          <div className="tier-grid">
            <div className="tier-card" style={{ borderColor: getTierColor('BRONZE') }}>
              <div className="tier-icon" style={{ color: getTierColor('BRONZE') }}>🥉</div>
              <h3 style={{ color: getTierColor('BRONZE') }}>BRONZE</h3>
              <p>0 ~ 99 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('SILVER') }}>
              <div className="tier-icon" style={{ color: getTierColor('SILVER') }}>🥈</div>
              <h3 style={{ color: getTierColor('SILVER') }}>SILVER</h3>
              <p>100 ~ 199 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('GOLD') }}>
              <div className="tier-icon" style={{ color: getTierColor('GOLD') }}>🥇</div>
              <h3 style={{ color: getTierColor('GOLD') }}>GOLD</h3>
              <p>200 ~ 299 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('PLATINUM') }}>
              <div className="tier-icon" style={{ color: getTierColor('PLATINUM') }}>💎</div>
              <h3 style={{ color: getTierColor('PLATINUM') }}>PLATINUM</h3>
              <p>300 ~ 399 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('DIAMOND') }}>
              <div className="tier-icon" style={{ color: getTierColor('DIAMOND') }}>💠</div>
              <h3 style={{ color: getTierColor('DIAMOND') }}>DIAMOND</h3>
              <p>400 ~ 499 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('MASTER') }}>
              <div className="tier-icon" style={{ color: getTierColor('MASTER') }}>👑</div>
              <h3 style={{ color: getTierColor('MASTER') }}>MASTER</h3>
              <p>500 ~ 599 LP</p>
            </div>
            <div className="tier-card" style={{ borderColor: getTierColor('CHALLENGER') }}>
              <div className="tier-icon" style={{ color: getTierColor('CHALLENGER') }}>⭐</div>
              <h3 style={{ color: getTierColor('CHALLENGER') }}>CHALLENGER</h3>
              <p>600+ LP</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ranked;
