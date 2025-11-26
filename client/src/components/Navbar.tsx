import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

interface MenuItem {
  label: string;
  path?: string;
  icon: string;
  children?: MenuItem[];
}

const Navbar: React.FC = () => {
  const { user, team, login, logout } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  const menuItems: MenuItem[] = [
    {
      label: '홈',
      path: '/dashboard',
      icon: '🏠',
    },
    {
      label: '카드',
      icon: '🎴',
      children: [
        { label: '카드 뽑기', path: '/gacha', icon: '🎰' },
        { label: '카드 컬렉션', path: '/cards', icon: '📚' },
        { label: '카드 합성', path: '/fusion', icon: '⚗️' },
      ],
    },
    {
      label: '팀 관리',
      icon: '⚙️',
      children: [
        { label: '로스터 편성', path: '/roster', icon: '👥' },
        { label: '선수 육성', path: '/training', icon: '📈' },
        { label: '시설 관리', path: '/facility', icon: '🏢' },
      ],
    },
    {
      label: '경기',
      icon: '⚔️',
      children: [
        { label: '랭크 경기', path: '/match', icon: '🎯' },
        { label: '리그 시스템', path: '/league', icon: '🏆' },
        { label: '솔로 랭크', path: '/solo-rank', icon: '⭐' },
      ],
    },
    {
      label: '거래',
      icon: '💰',
      children: [
        { label: '경매장', path: '/auction', icon: '🔨' },
        { label: '이적 시장', path: '/posting', icon: '💸' },
      ],
    },
    {
      label: '구단 경영',
      icon: '💼',
      children: [
        { label: '스폰서', path: '/sponsors', icon: '🤝' },
        { label: '팬덤', path: '/fandom', icon: '❤️' },
        { label: '업적', path: '/achievements', icon: '🏅' },
      ],
    },
  ];

  // Admin 메뉴는 admin 유저만 표시
  if (user?.email === 'hisamking@gmail.com') {
    menuItems.push({
      label: '관리자',
      path: '/admin',
      icon: '🔧',
    });
  }

  const toggleMenu = (label: string) => {
    // 다른 드롭다운은 모두 닫고 선택한 것만 토글
    if (openMenus.has(label)) {
      setOpenMenus(new Set());
    } else {
      setOpenMenus(new Set([label]));
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          🎮 LPM
        </Link>

        {/* Navigation Links */}
        {user && team && (
          <div className="navbar-menu">
            {menuItems.map((item) => (
              <div key={item.label} className="navbar-menu-item">
                {item.children ? (
                  <>
                    <button
                      className={`navbar-dropdown-toggle ${openMenus.has(item.label) ? 'open' : ''}`}
                      onClick={() => toggleMenu(item.label)}
                    >
                      <span className="menu-icon">{item.icon}</span>
                      <span className="menu-label">{item.label}</span>
                      <span className="dropdown-arrow">{openMenus.has(item.label) ? '▼' : '▶'}</span>
                    </button>
                    {openMenus.has(item.label) && (
                      <div className="navbar-dropdown">
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path!}
                            className={`navbar-dropdown-link ${isActive(child.path!) ? 'active' : ''}`}
                          >
                            <span className="menu-icon">{child.icon}</span>
                            <span className="menu-label">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path!}
                    className={`navbar-link ${isActive(item.path!) ? 'active' : ''}`}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* User Info & Auth */}
        <div className="navbar-right">
          {user && team ? (
            <>
              <div className="navbar-team-info">
                <span className="team-name">{team.team_name}</span>
                <span className="team-balance">💰 {team.balance.toLocaleString()}원</span>
                <span className="team-tier">{team.current_tier} {team.lp} LP</span>
              </div>
              <div className="navbar-user">
                {user.profile_picture && (
                  <img src={user.profile_picture} alt={user.display_name} className="user-avatar" />
                )}
                <span className="user-name">{user.display_name}</span>
                <button onClick={logout} className="btn-logout">로그아웃</button>
              </div>
            </>
          ) : (
            <button onClick={login} className="btn-login">
              <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
              Google 로그인
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
