import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, team, login, logout } = useAuth();

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
            <Link to="/dashboard" className="navbar-link">대시보드</Link>
            <Link to="/cards" className="navbar-link">카드 컬렉션</Link>
            <Link to="/gacha" className="navbar-link">카드 뽑기</Link>
            <Link to="/roster" className="navbar-link">로스터</Link>
            <Link to="/match" className="navbar-link">경기</Link>
            <Link to="/ranked" className="navbar-link">랭크 리그</Link>
            <Link to="/solo-rank" className="navbar-link">솔랭</Link>
            <Link to="/auction" className="navbar-link">경매장</Link>
            <Link to="/guild" className="navbar-link">길드</Link>
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
