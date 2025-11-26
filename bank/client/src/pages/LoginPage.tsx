import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface LoginPageProps {
  setAuth: (auth: boolean) => void;
}

function LoginPage({ setAuth }: LoginPageProps) {
  const [authCode, setAuthCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { auth_code: authCode });
      const data = response.data;

      if (data.success || data.user) {
        setAuth(true);
        navigate('/dashboard');
      } else {
        setError(data.error || '로그인에 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
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
          <p className="auth-subtitle">크립뱅크에 오신 것을 환영합니다</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">인증 코드 (32자)</label>
            <input
              type="text"
              className="form-input"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="32자 인증 코드를 입력하세요"
              maxLength={32}
              required
            />
            <small style={{ color: '#fff', fontSize: '14px' }}>
              {authCode.length}/32자
            </small>
          </div>

          <button type="submit" className="form-button" disabled={loading || authCode.length !== 32}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="form-links">
          <Link to="/register" className="form-link">회원가입</Link>
          <Link to="/recovery" className="form-link">인증 코드 복구</Link>
          <Link to="/admin-login" className="form-link" style={{ color: '#fff', fontWeight: 'bold' }}>관리자 로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
