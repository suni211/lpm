import React, { useEffect, useState } from 'react';
import { scores } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './Leaderboard.css';

const Leaderboard: React.FC = () => {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const res = await scores.getRanking({ limit: 100 });
      setRankings(res.data.rankings);
      setLoading(false);
    } catch (error) {
      console.error('랭킹 로드 실패', error);
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      'HAMGU': '#00ffff',
      'YETTI': '#00ff00',
      'DAIN': '#ffaa00',
      'KBG': '#ff00ff',
      'MANGO': '#ff0000'
    };
    return colors[tier] || '#ffffff';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-container">
          <div className="loading-spinner-large"></div>
          <p>랭킹을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header fade-in">
        <button 
          onClick={() => navigate('/home')} 
          className="back-button"
        >
          ← 홈으로
        </button>
        <h1 className="leaderboard-title">글로벌 리더보드</h1>
        <p className="leaderboard-subtitle">최고의 플레이어들을 확인하세요</p>
      </div>

      <div className="leaderboard-content fade-in">
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>플레이어</th>
                <th>티어</th>
                <th>레이팅</th>
                <th>총 점수</th>
                <th>플레이 수</th>
              </tr>
            </thead>
            <tbody>
              {rankings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-row">
                    아직 랭킹 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                rankings.map((player, index) => (
                  <tr 
                    key={player.id} 
                    className={`rank-row ${index < 3 ? 'top-rank' : ''}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="rank-cell">
                      <span className="rank-number">{getRankIcon(index + 1)}</span>
                    </td>
                    <td className="player-cell">
                      <span className="player-name">{player.display_name || player.username}</span>
                    </td>
                    <td className="tier-cell">
                      <span 
                        className="tier-badge"
                        style={{ 
                          color: getTierColor(player.tier),
                          borderColor: getTierColor(player.tier)
                        }}
                      >
                        {player.tier}
                      </span>
                    </td>
                    <td className="rating-cell">{player.rating.toLocaleString()}</td>
                    <td className="score-cell">{player.total_score.toLocaleString()}</td>
                    <td className="plays-cell">{player.total_plays}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
