import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    minecraft_username: '',
    security_answer_1: '',
    security_answer_2: '',
    security_answer_3: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
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
      const response = await api.post('/auth/register', formData);
      const data = response.data;

      if (data.auth_code) {
        setAuthCode(data.auth_code);
        setAccountNumber(data.user.account_number);
      } else {
        setError(data.error || '회원가입에 실패했습니다');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  if (authCode) {
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
            <h1 className="auth-title">✅ 회원가입 완료!</h1>
            <p className="auth-subtitle">아래 인증 코드를 안전하게 보관하세요</p>
          </div>

          <div className="success-message">
            회원가입이 완료되었습니다!
          </div>

          <div className="auth-code-display">
            <label className="form-label">인증 코드 (로그인 시 필요)</label>
            <div className="auth-code-value">{authCode}</div>
            <p style={{ marginTop: '12px', fontSize: '14px', color: '
              fff' }}>
              ⚠️ 이 코드는 다시 확인할 수 없습니다. 반드시 복사하여 안전한 곳에 보관하세요!
            </p>
          </div>

          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <p style={{ color: '#fff' }}><strong>계좌번호:</strong> {accountNumber}</p>
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
          <p className="auth-subtitle">회원가입</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">아이디 (4-20자, 영문+숫자)</label>
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
            <label className="form-label">비밀번호 (최소 8자, 복구용)</label>
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
            <label className="form-label">이메일</label>
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
            <label className="form-label">마인크래프트 닉네임 (정품 인증)</label>
            <input
              type="text"
              name="minecraft_username"
              className="form-input"
              value={formData.minecraft_username}
              onChange={handleChange}
              placeholder="정품 마인크래프트 닉네임"
              required
            />
          </div>

          <div style={{ background: '#2a2e3e', border: '1px solid #fff', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#fff' }}>보안 질문 (인증 코드 복구용)</h3>

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
            {loading ? '회원가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="form-links">
          <Link to="/login" className="form-link">이미 계정이 있으신가요?</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
