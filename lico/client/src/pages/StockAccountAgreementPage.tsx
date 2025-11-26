import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './StockAccountAgreementPage.css';

const StockAccountAgreementPage = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      setError('약관에 동의해주세요');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 주식 계좌 생성 및 약관 동의 처리
      const response = await api.post('/auth/create-stock-account', {
        agreed: true,
      });
      
      if (response.data.success) {
        // 계좌 생성 성공 후 홈으로 이동
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '주식 계좌 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-agreement-page">
      <div className="agreement-container">
        <div className="agreement-header">
          <h1>📈 주식 계좌 자동 생성 약관</h1>
          <p className="subtitle">LICO 거래소 이용을 위해 주식 계좌가 필요합니다</p>
        </div>

        <div className="agreement-content">
          <div className="terms-section">
            <h2>제1조 (목적)</h2>
            <p>
              본 약관은 LICO 거래소 이용을 위한 BANK 주식 계좌 자동 생성에 관한 사항을 규정함을 목적으로 합니다.
            </p>

            <h2>제2조 (주식 계좌 자동 생성)</h2>
            <p>
              LICO 거래소 이용을 위해 BANK 주식 계좌(02-XXXX-XXXX-XXXX)가 자동으로 생성됩니다.
              주식 계좌는 LICO 거래소와 BANK 간의 자금 이동을 위해 사용됩니다.
            </p>

            <h2>제3조 (계좌 관리)</h2>
            <ul>
              <li>주식 계좌는 BANK에서 관리되며, LICO 거래소에서도 조회 가능합니다.</li>
              <li>주식 계좌의 잔액은 LICO 거래소의 입출금에 사용됩니다.</li>
              <li>주식 계좌는 BANK 웹사이트에서도 확인 및 관리할 수 있습니다.</li>
            </ul>

            <h2>제4조 (책임 및 면제)</h2>
            <ul>
              <li>주식 계좌 자동 생성에 동의한 경우, 계좌 생성에 대한 책임은 사용자에게 있습니다.</li>
              <li>LICO 거래소는 주식 계좌 생성 과정에서 발생할 수 있는 기술적 오류에 대해 책임을 지지 않습니다.</li>
              <li>주식 계좌 관련 문의는 BANK 고객센터로 연락해주세요.</li>
            </ul>

            <h2>제5조 (약관 변경)</h2>
            <p>
              본 약관은 사전 고지 없이 변경될 수 있으며, 변경된 약관은 LICO 거래소 웹사이트에 공지됩니다.
            </p>

            <h2>제6조 (동의 및 거부)</h2>
            <p>
              본 약관에 동의하지 않을 경우, LICO 거래소 이용이 제한될 수 있습니다.
              주식 계좌가 필요한 경우, BANK 웹사이트에서 직접 생성할 수 있습니다.
            </p>
          </div>

          <div className="agreement-checkbox">
            <label>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>위 약관을 모두 읽었으며, 주식 계좌 자동 생성에 동의합니다.</span>
            </label>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="agreement-actions">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="cancel-button"
            >
              취소
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!agreed || loading}
              className="agree-button"
            >
              {loading ? '처리 중...' : '동의하고 계좌 생성'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAccountAgreementPage;

