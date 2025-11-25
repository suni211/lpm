import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home: React.FC = () => {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-hero">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">LPM</span>
            <br />
            LoL Pro Manager
          </h1>
          <p className="hero-subtitle">
            카드를 수집하고, 최강의 팀을 구성하여
            <br />
            <span className="highlight">챌린저</span>를 향해 나아가세요!
          </p>

          <div className="features">
            <div className="feature-card">
              <div className="feature-icon">🎴</div>
              <h3>카드 수집</h3>
              <p>선수, 감독, 작전 카드를 수집하세요</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚔️</div>
              <h3>전략 경기</h3>
              <p>3페이즈 경기 시뮬레이션</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>랭크 시스템</h3>
              <p>브론즈부터 챌린저까지</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>길드 전투</h3>
              <p>팀을 결성하고 함께 싸우세요</p>
            </div>
          </div>

          <button onClick={login} className="btn-start">
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" />
            Google로 시작하기
          </button>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">66+</div>
              <div className="stat-label">LCK 선수</div>
            </div>
            <div className="stat">
              <div className="stat-value">∞</div>
              <div className="stat-label">전략 조합</div>
            </div>
            <div className="stat">
              <div className="stat-value">실시간</div>
              <div className="stat-label">랭킹 시스템</div>
            </div>
          </div>
        </div>

        <div className="hero-background">
          <div className="floating-card card-1">🎴</div>
          <div className="floating-card card-2">⚔️</div>
          <div className="floating-card card-3">🏆</div>
          <div className="floating-card card-4">✨</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
