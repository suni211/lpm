import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authAPI } from './api/client';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import SongsPage from './pages/SongsPage';
import GamePage from './pages/GamePage';
import RankingsPage from './pages/RankingsPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import LadderPage from './pages/LadderPage';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <h2>로딩 중...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🎵 RMF
            </Link>
            <ul className="nav-menu">
              <li><Link to="/">홈</Link></li>
              <li><Link to="/songs">곡 목록</Link></li>
              <li><Link to="/rankings">랭킹</Link></li>
              <li><Link to="/ladder">⚔️ 레더</Link></li>
              {user ? (
                <>
                  <li><Link to="/profile">프로필</Link></li>
                  <li><Link to="/admin">관리자</Link></li>
                  <li>
                    <button onClick={handleLogout} className="btn-logout">
                      로그아웃 ({user.username})
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li><Link to="/login">로그인</Link></li>
                  <li><Link to="/register">회원가입</Link></li>
                </>
              )}
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/game/:songId" element={<GamePage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/login" element={<LoginPage onLogin={checkAuth} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <p style={{ marginBottom: '0.5rem' }}>
            DJMAX에서 영감받은 리듬 게임 • React + Express + MariaDB로 제작
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>
            비영리 팬 프로젝트 • DJMAX™ is a trademark of NEOWIZ • No affiliation or monetization
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
