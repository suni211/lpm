import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function RecoveryPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    minecraft_uuid: '',
    security_answer_1: '',
    security_answer_2: '',
    security_answer_3: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAuthCode, setNewAuthCode] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/recover-auth-code', formData);
      const data = response.data;

      if (data.auth_code) {
        setNewAuthCode(data.auth_code);
      } else {
        setError(data.error || '인증 코드 복구에 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (newAuthCode) {
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
                }}
              />
            </div>
            <h1 className="auth-title">✅ 인증 코드 재발급 완료!</h1>
            <p className="auth-subtitle">새로운 인증 코드를 안전하게 보관하세요</p>
          </div>

          <div className="success-message">
            인증 코드가 재발급되었습니다!
          </div>

          <div className="auth-code-display">
            <label className="form-label">새 인증 코드</label>
            <div className="auth-code-value">{newAuthCode}</div>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '#666' }}>
              ⚠️ 이 코드는 다시 확인할 수 없습니다. 반드시 복사하여 안전한 곳에 보관하세요!
            </p>
          </div>

          <button
            className="form-button"
            onClick={() => navigate('/login')}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

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
          <h1 className="auth-title">🔐 인증 코드 복구</h1>
          <p className="auth-subtitle">모든 정보를 정확히 입력해주세요</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">1. 이메일</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">2. 아이디</label>
            <input
              type="text"
              name="username"
              className="form-input"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">3. 비밀번호</label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">4. 마인크래프트 UUID</label>
            <input
              type="text"
              name="minecraft_uuid"
              className="form-input"
              value={formData.minecraft_uuid}
              onChange={handleChange}
              placeholder="예: 069a79f444e94726a5befca90e38aaf5"
              required
            />
            <small style={{ color: '#666', fontSize: '14px' }}>
              UUID는 <a href="https://mcuuid.net/" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>mcuuid.net</a>에서 확인 가능합니다
            </small>
          </div>

          <div style={{ background: '#f0f0f0', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>5. 보안 질문 답변</h3>

            <div className="form-group">
              <label className="form-label">다니는/다녔던 학교는?</label>
              <input
                type="text"
                name="security_answer_1"
                className="form-input"
                value={formData.security_answer_1}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">좋아하는 동물은?</label>
              <input
                type="text"
                name="security_answer_2"
                className="form-input"
                value={formData.security_answer_2}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">좋아하는 선수는?</label>
              <input
                type="text"
                name="security_answer_3"
                className="form-input"
                value={formData.security_answer_3}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <button type="submit" className="form-button" disabled={loading}>
            {loading ? '복구 처리 중...' : '인증 코드 복구'}
          </button>
        </form>

        <div className="form-links">
          <Link to="/login" className="form-link">로그인 페이지로</Link>
          <Link to="/register" className="form-link">회원가입</Link>
        </div>
      </div>
    </div>
  );
}

export default RecoveryPage;
