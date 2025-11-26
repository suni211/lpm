import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { team } = useAuth();

  if (!team) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    { label: '보유 자금', value: `${(team.balance || 0).toLocaleString()}원`, icon: '💰' },
    { label: '티어', value: `${team.current_tier} ${team.lp}LP`, icon: '🏆' },
    { label: '팬', value: (team.fans || 0).toLocaleString(), icon: '❤️' },
    { label: '선수', value: '12명', icon: '👥' },
  ];

  const menuItems = [
    { title: '카드 뽑기', desc: '새로운 선수 영입', link: '/gacha', icon: '🎰' },
    { title: '로스터', desc: '라인업 설정', link: '/roster', icon: '📋' },
    { title: '경기', desc: '랭크 매치', link: '/match', icon: '⚔️' },
    { title: '경매장', desc: '선수 거래', link: '/auction', icon: '💸' },
    { title: '훈련', desc: '선수 성장', link: '/training', icon: '📈' },
    { title: '시설', desc: '구단 업그레이드', link: '/facility', icon: '🏢' },
    { title: '스폰서', desc: '후원 계약', link: '/sponsors', icon: '🤝' },
    { title: '리그', desc: '시즌 현황', link: '/league', icon: '🏅' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="team-info">
          <h1>{team.team_name}</h1>
          {team.slogan && <p className="team-slogan">{team.slogan}</p>}
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <span className="stat-icon">{stat.icon}</span>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="menu-grid">
        {menuItems.map(item => (
          <Link key={item.link} to={item.link} className="menu-card">
            <span className="menu-icon">{item.icon}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;