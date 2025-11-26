import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

interface TeamStats {
  total_players: number;
  active_players: number;
  total_matches: number;
  win_rate: number;
  ranking: number;
  balance: number;
  fans: number;
  sponsor_income: number;
}

const Dashboard: React.FC = () => {
  const { team } = useAuth();
  const [stats, setStats] = useState<TeamStats>({
    total_players: 0,
    active_players: 0,
    total_matches: 0,
    win_rate: 0,
    ranking: 0,
    balance: 0,
    fans: 0,
    sponsor_income: 0
  });

  useEffect(() => {
    if (team) {
      // API 호출 대신 임시 데이터
      setStats({
        total_players: 12,
        active_players: 5,
        total_matches: 24,
        win_rate: 65.5,
        ranking: 3,
        balance: team.balance || 10000000,
        fans: team.fans || 1250,
        sponsor_income: 500000
      });
    }
  }, [team]);

  if (!team) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>팀 정보를 불러오는 중...</p>
      </div>
    );
  }

  const quickActions = [
    { icon: '🎰', title: '카드 뽑기', desc: '새로운 선수 영입', link: '/gacha' },
    { icon: '⚔️', title: '경기 시작', desc: '랭크 매치 참가', link: '/match' },
    { icon: '👥', title: '로스터 편성', desc: '선발 라인업 설정', link: '/roster' },
    { icon: '💰', title: '경매장', desc: '선수 거래', link: '/auction' },
    { icon: '📈', title: '선수 훈련', desc: '능력치 향상', link: '/training' },
    { icon: '🏆', title: '리그 현황', desc: '시즌 순위 확인', link: '/league' }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-inner">
        {/* 팀 정보 헤더 */}
        <div className="team-header-section">
          <div className="team-identity">
            <div className="team-logo-wrapper">
              {team.team_logo ? (
                <img src={team.team_logo} alt={team.team_name} className="team-logo" />
              ) : (
                <div className="team-logo-default">
                  <span>🎮</span>
                </div>
              )}
            </div>
            <div className="team-details">
              <h1 className="team-name">{team.team_name}</h1>
              {team.slogan && <p className="team-slogan">"{team.slogan}"</p>}
              <div className="team-meta">
                <span className="tier-badge" data-tier={team.current_tier}>
                  {team.current_tier} • {team.lp} LP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 주요 지표 */}
        <div className="stats-overview">
          <div className="stat-box">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-label">보유 자금</div>
              <div className="stat-value">{stats.balance.toLocaleString()}</div>
              <div className="stat-change positive">+{stats.sponsor_income.toLocaleString()}/주</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-label">선수단</div>
              <div className="stat-value">{stats.active_players}/{stats.total_players}</div>
              <div className="stat-change">활성 선수</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-label">승률</div>
              <div className="stat-value">{stats.win_rate}%</div>
              <div className="stat-change">{stats.total_matches}경기</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <div className="stat-label">리그 순위</div>
              <div className="stat-value">#{stats.ranking}</div>
              <div className="stat-change">챌린저 리그</div>
            </div>
          </div>

          <div className="stat-box">
            <div className="stat-icon">❤️</div>
            <div className="stat-info">
              <div className="stat-label">팬덤</div>
              <div className="stat-value">{stats.fans.toLocaleString()}</div>
              <div className="stat-change positive">+125/일</div>
            </div>
          </div>
        </div>

        {/* 빠른 실행 */}
        <div className="quick-actions-section">
          <h2 className="section-title">빠른 실행</h2>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <Link to={action.link} key={action.link} className="action-card">
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <div className="action-title">{action.title}</div>
                  <div className="action-desc">{action.desc}</div>
                </div>
                <div className="action-arrow">→</div>
              </Link>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="recent-section">
          <h2 className="section-title">최근 활동</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-icon win">W</div>
              <div className="activity-content">
                <div className="activity-title">T1 전설을 상대로 승리</div>
                <div className="activity-time">2시간 전</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon new">+</div>
              <div className="activity-content">
                <div className="activity-title">새로운 선수 Faker 영입</div>
                <div className="activity-time">5시간 전</div>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon lose">L</div>
              <div className="activity-content">
                <div className="activity-title">Gen.G를 상대로 패배</div>
                <div className="activity-time">1일 전</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;