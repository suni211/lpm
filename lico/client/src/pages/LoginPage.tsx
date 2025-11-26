import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [authCode, setAuthCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { auth_code: authCode });
      
      if (response.data.success) {
        // 설문조사 필요 여부 확인
        if (response.data.requires_questionnaire) {
          // 설문조사 미완료 시 설문조사 페이지로 이동
          navigate('/questionnaire');
          return;
        }
        
        // 지갑 생성 여부 확인
        if (response.data.wallet_created && response.data.wallet_address && response.data.recovery_words) {
          // 지갑이 방금 생성된 경우 복구 단어 표시 페이지로 이동
          // 세션 스토리지에 임시 저장 (한 번만 표시)
          sessionStorage.setItem('wallet_address', response.data.wallet_address);
          sessionStorage.setItem('recovery_words', JSON.stringify(response.data.recovery_words));
          navigate('/wallet-created');
          return;
        }
        
        // 설문조사 완료 시 이전 페이지로 이동 또는 홈으로
        const from = new URLSearchParams(window.location.search).get('from') || '/';
        navigate(from);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logo-container">
          <img 
            src="/cryptup-logo.png" 
            alt="CRYP-UP" 
            className="login-logo"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        <h1>LICO 거래소 로그인</h1>
        <p className="login-subtitle">BANK 인증 코드를 입력하세요</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>인증 코드 (32자)</label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="인증 코드를 입력하세요"
              maxLength={32}
              required
              className="auth-code-input"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-footer">
          <p>BANK 계정이 없으신가요?</p>
          <a href="https://bank.berrple.com" target="_blank" rel="noopener noreferrer">
            BANK에서 계정 생성하기
          </a>
        </div>

        <div className="wallet-info-box">
          <h3>🪙 LICO 지갑 생성 안내</h3>
          <p>LICO 지갑은 <strong>설문조사 승인 후 자동으로 생성</strong>됩니다.</p>
          <ol>
            <li>BANK에서 인증 코드 발급</li>
            <li>LICO 로그인 (인증 코드 입력)</li>
            <li>설문조사 완료 (90점 이상)</li>
            <li>지갑 자동 생성 → 복구 단어 표시</li>
          </ol>
          <p className="note">⚠️ 복구 단어를 안전하게 보관하세요. 지갑 주소는 한 번만 표시됩니다.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

