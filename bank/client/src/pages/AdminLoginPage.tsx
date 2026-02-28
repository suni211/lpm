import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminLoginPage.css';

interface AdminLoginPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminLoginPage({ setAuth }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/admin/login', { username, password });
      const data = response.data;

      if (data.success || data.admin) {
        setAuth(true);
        navigate('/admin');
      } else {
        setError(data.error || '로그인에 실패했습니다');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <img 
              src="/cryptbank-logo.png" 
              alt="CRYPBANK" 
              className="auth-logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.auth-logo-fallback') as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'block';
                }
              }}
            />
            <h1 className="auth-title auth-logo-fallback" style={{ display: 'none' }}>🏦 CRYPBANK</h1>
          </div>
          <h1 className="auth-title">관리자 로그인</h1>
          <p className="auth-subtitle">관리자 계정으로 로그인하세요</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">아이디</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="관리자 아이디"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="form-links">
          <Link to="/login" className="form-link">일반 로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;

