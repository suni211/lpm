import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
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
      await authAPI.login({ username, password });
      onLogin();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>로그인</h1>

        {error && (
          <div style={{
            background: 'rgba(255,107,107,0.2)',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1rem',
            border: '1px solid rgba(255,107,107,0.5)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사용자명 또는 이메일</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="사용자명 또는 이메일을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.8 }}>
            계정이 없으신가요? <a href="/register" style={{ color: '#ffd700' }}>회원가입</a>
          </p>
        </form>
      </div>
    </div>
  );
}
