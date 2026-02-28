import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './WalletInfoPage.css';

const WalletInfoPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 안내를 확인했다고 표시
    const markInfoShown = async () => {
      try {
        await api.post('/wallets/mark-info-shown');
      } catch (error) {
        console.error('안내 표시 플래그 업데이트 실패:', error);
      }
    };
    markInfoShown();
  }, []);

  const handleConfirm = () => {
    navigate('/');
  };

  return (
    <div className="wallet-info-page">
      <div className="wallet-info-container">
        <div className="info-card">
          <h1>🪙 LICO 지갑 안내</h1>
          <p className="description">
            LICO 거래소를 이용하기 위한 지갑 정보입니다.
          </p>

          <div className="info-section">
            <h2>지갑 주소 확인 방법</h2>
            <p>지갑 주소를 잊어버린 경우, 복구 단어를 사용하여 확인할 수 있습니다.</p>
            <button 
              onClick={() => navigate('/wallet-recovery')} 
              className="recovery-button"
            >
              복구 단어로 지갑 주소 확인
            </button>
          </div>

          <div className="info-section">
            <h2>BANK 연동</h2>
            <p>
              BANK 계좌와 LICO 지갑을 연동하여 자금을 이동할 수 있습니다.
              <br />
              <strong>참고:</strong> BANK와 LICO는 서로 다른 시스템입니다.
            </p>
            <a 
              href="https://bank.berrple.com/lico-connection" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bank-link-button"
            >
              BANK 연동 페이지로 이동
            </a>
          </div>

          <div className="warning-box">
            <h3>⚠️ 중요 안내</h3>
            <ul>
              <li>복구 단어를 안전하게 보관하세요. 잃어버리면 지갑 주소를 복구할 수 없습니다.</li>
              <li>지갑 주소는 한 번만 표시되므로 복구 단어를 반드시 저장해야 합니다.</li>
              <li>LICO 지갑 주소는 LICO 거래소에서만 사용됩니다.</li>
            </ul>
          </div>

          <button onClick={handleConfirm} className="confirm-button">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalletInfoPage;

