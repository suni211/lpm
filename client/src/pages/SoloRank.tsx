import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './SoloRank.css';

interface PlayerRanking {
  id: string;
  card_name: string;
  position: string;
  power: number;
  rarity: string;
  team_name: string;
  solo_rank_points: number;
  solo_rank_tier: string;
  solo_wins: number;
  solo_losses: number;
}

const SoloRank: React.FC = () => {
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [myPlayers, setMyPlayers] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [queueing, setQueueing] = useState(false);

  useEffect(() => {
    fetchRankings();
    fetchMyPlayers();
  }, [selectedPosition]);

  const fetchRankings = async () => {
    try {
      const response = await api.get('/solo-rank/rankings', {
        params: { position: selectedPosition !== 'ALL' ? selectedPosition : undefined }
      });
      setRankings(response.data.rankings || []);
    } catch (error) {
      console.error('솔로랭크 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPlayers = async () => {
    try {
      const response = await api.get('/solo-rank/my-players');
      setMyPlayers(response.data.players || []);
    } catch (error) {
      console.error('내 선수 조회 실패:', error);
    }
  };

  const handleQueueSolo = async () => {
    if (myPlayers.length === 0) {
      alert('솔로랭크에 참가할 수 있는 선수가 없습니다!');
      return;
    }
    setQueueing(true);
    // Simulate queue
    setTimeout(() => {
      alert('솔로랭크 시스템은 곧 출시됩니다!');
      setQueueing(false);
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
    return colors[tier] || '#999';
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
          <div className="header-actions">
            <button className="btn-queue-solo" onClick={handleQueueSolo} disabled={queueing}>
              {queueing ? '⏳ 큐 대기 중...' : '🎯 솔로랭크 큐'}
            </button>
          </div>
        </div>

        <div className="info-banner">
          <div className="info-icon">💡</div>
          <div className="info-content">
            <h3>솔로 랭크란?</h3>
            <p>개별 선수들이 1v1로 실력을 겨루는 모드입니다. 선수의 개인 능력치가 승패를 좌우합니다!</p>
          </div>
        </div>

        {myPlayers.length > 0 && (
          <div className="my-players-section">
            <h2 className="section-title">내 선수들</h2>
            <div className="players-grid">
              {myPlayers.map((player) => (
                <div key={player.id} className="player-card">
                  <div className="player-card-header">
                    <span
                      className="player-rarity"
                      style={{ backgroundColor: getRarityColor(player.rarity) }}
                    >
                      {player.rarity}
                    </span>
                    <span className="player-position">{player.position}</span>
                  </div>
                  <div className="player-card-body">
                    <h3 className="player-name">{player.card_name}</h3>
                    <div className="player-stats">
                      <span className="stat">파워: {player.power}</span>
                    </div>
                  </div>
                  <div className="player-rank-info">
                    <div className="rank-tier" style={{ color: getTierColor(player.solo_rank_tier) }}>
                      {player.solo_rank_tier}
                    </div>
                    <div className="rank-points">{player.solo_rank_points} RP</div>
                    <div className="rank-record">
                      {player.solo_wins}승 {player.solo_losses}패
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <div className="col-points">RP</div>
              <div className="col-record">전적</div>
              <div className="col-winrate">승률</div>
            </div>
            <div className="table-body">
              {rankings.length === 0 ? (
                <div className="no-rankings">랭킹 데이터가 없습니다</div>
              ) : (
                rankings.map((player, index) => (
                  <div key={player.id} className="ranking-row">
                    <div className="col-rank">
                      <span className="rank-number">{index + 1}</span>
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
                      <span className="tier-badge" style={{ color: getTierColor(player.solo_rank_tier) }}>
                        {player.solo_rank_tier}
                      </span>
                    </div>
                    <div className="col-points">
                      <span className="points-value">{player.solo_rank_points}</span>
                    </div>
                    <div className="col-record">
                      <span className="record-text">{player.solo_wins}승 {player.solo_losses}패</span>
                    </div>
                    <div className="col-winrate">
                      <span className="winrate-value">
                        {getWinRate(player.solo_wins, player.solo_losses)}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="tier-rewards-section">
          <h2 className="section-title">티어별 보상</h2>
          <div className="rewards-grid">
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor('CHALLENGER') }}>
                CHALLENGER
              </div>
              <div className="reward-items">
                <div className="reward-item">5,000,000원</div>
                <div className="reward-item">전설 카드팩 x3</div>
                <div className="reward-item">특별 칭호</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor('MASTER') }}>
                MASTER
              </div>
              <div className="reward-items">
                <div className="reward-item">3,000,000원</div>
                <div className="reward-item">에픽 카드팩 x2</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor('DIAMOND') }}>
                DIAMOND
              </div>
              <div className="reward-items">
                <div className="reward-item">1,500,000원</div>
                <div className="reward-item">레어 카드팩 x2</div>
              </div>
            </div>
            <div className="reward-card">
              <div className="reward-tier" style={{ color: getTierColor('PLATINUM') }}>
                PLATINUM
              </div>
              <div className="reward-items">
                <div className="reward-item">800,000원</div>
                <div className="reward-item">일반 카드팩 x1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoloRank;
