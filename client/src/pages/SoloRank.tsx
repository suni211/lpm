import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './SoloRank.css';

interface PlayerRanking {
  player_card_id: number;
  card_name: string;
  position: string;
  power: number;
  rarity: string;
  team_name: string;
  solo_rating: number;
  current_rank: number;
  wins: number;
  losses: number;
}

const SoloRank: React.FC = () => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [nextMatchTime, setNextMatchTime] = useState<string>('');

  useEffect(() => {
    fetchRankings();
    calculateNextMatchTime();

    // 1분마다 다음 매칭 시간 업데이트
    const interval = setInterval(calculateNextMatchTime, 60000);
    return () => clearInterval(interval);
  }, [selectedPosition]);

  const calculateNextMatchTime = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);

    const diff = nextHour.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);

    setNextMatchTime(`${minutes}분 후`);
  };

  const fetchRankings = async () => {
    try {
      const response = await api.get('/solo-rank/leaderboard', {
        params: {
          position: selectedPosition !== 'ALL' ? selectedPosition : undefined,
          limit: 100
        }
      });
      setRankings(response.data.leaderboard || []);
    } catch (error) {
      console.error('솔로랭크 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (rating: number) => {
    if (rating >= 2500) return '#F4C430'; // CHALLENGER
    if (rating >= 2200) return '#EE82EE'; // MASTER
    if (rating >= 1900) return '#B9F2FF'; // DIAMOND
    if (rating >= 1600) return '#00CED1'; // PLATINUM
    if (rating >= 1300) return '#FFD700'; // GOLD
    if (rating >= 1000) return '#C0C0C0'; // SILVER
    return '#CD7F32'; // BRONZE
  };

  const getTierName = (rating: number) => {
    if (rating >= 2500) return 'CHALLENGER';
    if (rating >= 2200) return 'MASTER';
    if (rating >= 1900) return 'DIAMOND';
    if (rating >= 1600) return 'PLATINUM';
    if (rating >= 1300) return 'GOLD';
    if (rating >= 1000) return 'SILVER';
    return 'BRONZE';
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGEND': return '#ff6b6b';
      case 'EPIC': return '#a29bfe';
      case 'RARE': return '#74b9ff';
      default: return '#95a5a6';
    }
  };

  const getWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return ((wins / (wins + losses)) * 100).toFixed(1);
  };

  const positions = ['ALL', 'TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  if (loading) {
    return (
      <div className="solo-rank-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="solo-rank">
      <div className="solo-rank-container">
        <div className="solo-rank-header">
          <h1 className="solo-rank-title">⭐ 솔로 랭크</h1>
          <div className="next-match-timer">
            <div className="timer-label">다음 AI 매칭</div>
            <div className="timer-value">{nextMatchTime}</div>
          </div>
        </div>

        <div className="info-banner">
          <div className="info-icon">🤖</div>
          <div className="info-content">
            <h3>솔로 랭크 시스템</h3>
            <p>
              AI가 1시간마다 자동으로 비슷한 레이팅의 선수들을 매칭하여 1v1 경기를 진행합니다.
              <br />
              모든 선수는 자동으로 참가하며, 경기 결과에 따라 MMR이 변동됩니다!
            </p>
          </div>
        </div>

        <div className="rankings-section">
          <div className="rankings-header">
            <h2 className="section-title">선수 랭킹</h2>
            <div className="position-filter">
              {positions.map((pos) => (
                <button
                  key={pos}
                  className={`filter-btn ${selectedPosition === pos ? 'active' : ''}`}
                  onClick={() => setSelectedPosition(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="rankings-table">
            <div className="table-header">
              <div className="col-rank">순위</div>
              <div className="col-player">선수</div>
              <div className="col-position">포지션</div>
              <div className="col-tier">티어</div>
              <div className="col-points">MMR</div>
              <div className="col-record">전적</div>
              <div className="col-winrate">승률</div>
            </div>
            <div className="table-body">
              {rankings.length === 0 ? (
                <div className="no-rankings">랭킹 데이터가 없습니다</div>
              ) : (
                rankings.map((player, index) => (
                  <div key={player.player_card_id} className="ranking-row">
                    <div className="col-rank">
                      <span className={`rank-number ${index < 3 ? `top-${index + 1}` : ''}`}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="col-player">
                      <div className="player-info">
                        <span
                          className="player-rarity-dot"
                          style={{ backgroundColor: getRarityColor(player.rarity) }}
                        ></span>
                        <div className="player-details">
                          <span className="player-name-text">{player.card_name}</span>
                          <span className="player-team">{player.team_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-position">
                      <span className="position-badge">{player.position}</span>
                    </div>
                    <div className="col-tier">
                      <span className="tier-badge" style={{ color: getTierColor(player.solo_rating) }}>
                        {getTierName(player.solo_rating)}
                      </span>
                    </div>
                    <div className="col-points">
                      <span className="points-value">{player.solo_rating}</span>
                    </div>
                    <div className="col-record">
                      <span className="record-text">{player.wins}승 {player.losses}패</span>
                    </div>
                    <div className="col-winrate">
                      <span className="winrate-value">
                        {getWinRate(player.wins, player.losses)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="tier-rewards-section">
          <h2 className="section-title">시즌 종료 시 티어별 보상</h2>
          <div className="rewards-grid">
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor(2500) }}>
                CHALLENGER
              </div>
              <div className="reward-subtitle">2500+ MMR</div>
              <div className="reward-items">
                <div className="reward-item">💰 10,000,000원</div>
                <div className="reward-item">🎴 전설 카드팩 x5</div>
                <div className="reward-item">👑 챌린저 칭호</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor(2200) }}>
                MASTER
              </div>
              <div className="reward-subtitle">2200-2499 MMR</div>
              <div className="reward-items">
                <div className="reward-item">💰 5,000,000원</div>
                <div className="reward-item">🎴 에픽 카드팩 x3</div>
                <div className="reward-item">⭐ 마스터 칭호</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor(1900) }}>
                DIAMOND
              </div>
              <div className="reward-subtitle">1900-2199 MMR</div>
              <div className="reward-items">
                <div className="reward-item">💰 2,500,000원</div>
                <div className="reward-item">🎴 레어 카드팩 x2</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor(1600) }}>
                PLATINUM
              </div>
              <div className="reward-subtitle">1600-1899 MMR</div>
              <div className="reward-items">
                <div className="reward-item">💰 1,000,000원</div>
                <div className="reward-item">🎴 일반 카드팩 x1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloRank;
