import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { team } = useAuth();

  if (!team) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  const tierColors: Record<string, string> = {
    BRONZE: '#CD7F32',
    SILVER: '#C0C0C0',
    GOLD: '#FFD700',
    PLATINUM: '#00CED1',
    DIAMOND: '#B9F2FF',
    MASTER: '#EE82EE',
    CHALLENGER: '#F4C430',
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Team Header */}
        <div className="team-header">
          <div className="team-logo-section">
            {team.team_logo ? (
              <img src={team.team_logo} alt={team.team_name} className="team-logo-img" />
            ) : (
              <div className="team-logo-placeholder">🎮</div>
            )}
            <div className="team-info">
              <h1 className="team-name-title">{team.team_name}</h1>
              {team.slogan && <p className="team-slogan">"{team.slogan}"</p>}
            </div>
          </div>

          <div className="team-stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <div className="stat-label">티어</div>
                <div className="stat-value" style={{ color: tierColors[team.current_tier] || '#fff' }}>
                  {team.current_tier}
                </div>
                <div className="stat-sub">{team.lp} LP</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">보유 자금</div>
                <div className="stat-value">{team.balance.toLocaleString()}</div>
                <div className="stat-sub">원</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-label">전적</div>
                <div className="stat-value">{team.wins}승 {team.losses}패</div>
                <div className="stat-sub">
                  승률 {team.wins + team.losses > 0
                    ? ((team.wins / (team.wins + team.losses)) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔥</div>
              <div className="stat-content">
                <div className="stat-label">연승</div>
                <div className="stat-value">{team.win_streak}</div>
                <div className="stat-sub">연속 승리</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-label">명성</div>
                <div className="stat-value">Lv.{team.reputation_level}</div>
                <div className="stat-sub">{team.reputation_points} P</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-label">팬덤</div>
                <div className="stat-value">{team.fans.toLocaleString()}</div>
                <div className="stat-sub">명</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2 className="section-title">빠른 실행</h2>
          <div className="actions-grid">
            <Link to="/gacha" className="action-card">
              <div className="action-icon">🎴</div>
              <h3>카드 뽑기</h3>
              <p>새로운 선수와 작전 카드를 획득하세요</p>
            </Link>

            <Link to="/roster" className="action-card">
              <div className="action-icon">⚙️</div>
              <h3>로스터 편성</h3>
              <p>최적의 팀 조합을 구성하세요</p>
            </Link>

            <Link to="/match" className="action-card">
              <div className="action-icon">⚔️</div>
              <h3>랭크 경기</h3>
              <p>실력을 겨루고 LP를 획득하세요</p>
            </Link>

            <Link to="/posting" className="action-card">
              <div className="action-icon">💸</div>
              <h3>경매장</h3>
              <p>카드를 거래하고 팀을 강화하세요</p>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h2 className="section-title">최근 활동</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon">🎉</div>
              <div className="activity-content">
                <div className="activity-text">팀이 생성되었습니다!</div>
                <div className="activity-time">방금 전</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">💰</div>
              <div className="activity-content">
                <div className="activity-text">초기 자금 1억원을 받았습니다</div>
                <div className="activity-time">방금 전</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
