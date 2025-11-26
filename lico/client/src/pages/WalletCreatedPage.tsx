import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './WalletCreatedPage.css';

const WalletCreatedPage = () => {
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // 세션 스토리지에서 지갑 정보 가져오기
    const storedAddress = sessionStorage.getItem('wallet_address');
    const storedWords = sessionStorage.getItem('recovery_words');
    
    if (storedAddress && storedWords) {
      setWalletAddress(storedAddress);
      setRecoveryWords(JSON.parse(storedWords));
    } else {
      // 세션 스토리지에 없으면 홈으로 이동
      navigate('/');
    }
  }, [navigate]);

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWords = () => {
    navigator.clipboard.writeText(recoveryWords.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (!confirmed) {
      setConfirmed(true);
      // 지갑 주소 표시 플래그 업데이트
      try {
        await api.post('/wallets/mark-address-shown');
        // 세션 스토리지에서 제거
        sessionStorage.removeItem('wallet_address');
        sessionStorage.removeItem('recovery_words');
      } catch (error) {
        console.error('플래그 업데이트 실패:', error);
      }
    } else {
      navigate('/');
    }
  };

  // props로 받은 경우 (로그인 시 지갑 생성된 경우)
  if (!walletAddress && !recoveryWords.length) {
    return (
      <div className="wallet-created-page">
        <div className="wallet-created-container">
          <h1>지갑 생성 중...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-created-page">
      <div className="wallet-created-container">
        <div className="warning-box">
          <h2>⚠️ 중요: 지갑 정보를 안전하게 보관하세요</h2>
          <p>이 정보는 <strong>한 번만</strong> 표시됩니다. 복구 단어를 잃어버리면 지갑을 복구할 수 없습니다.</p>
        </div>

        <div className="wallet-info-section">
          <h3>지갑 주소 (32자)</h3>
          <div className="address-display">
            <code className="wallet-address">{walletAddress}</code>
            <button onClick={handleCopyAddress} className="copy-button">
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>
          <p className="info-text">
            이 주소를 <a href="https://bank.berrple.com/lico-connection" target="_blank" rel="noopener noreferrer">BANK 연동 페이지</a>에서 입력하여 연동할 수 있습니다.
            <br />
            <strong>참고:</strong> BANK와 LICO는 서로 다른 시스템입니다. LICO 지갑 주소는 LICO 거래소에서만 사용됩니다.
          </p>
        </div>

        <div className="recovery-words-section">
          <h3>복구 단어 (6개)</h3>
          <p className="info-text">지갑 주소를 잊어버린 경우, 이 6개 단어를 순서대로 입력하면 지갑 주소를 확인할 수 있습니다.</p>
          <div className="recovery-words-grid">
            {recoveryWords.map((word, index) => (
              <div key={index} className="recovery-word-item">
                <span className="word-number">{index + 1}</span>
                <span className="word-text">{word}</span>
              </div>
            ))}
          </div>
          <button onClick={handleCopyWords} className="copy-button">
            {copied ? '복사됨!' : '복구 단어 복사'}
          </button>
        </div>

        <div className="confirmation-section">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>복구 단어를 안전한 곳에 저장했음을 확인했습니다</span>
          </label>
        </div>

        <button
          onClick={handleConfirm}
          className="confirm-button"
          disabled={!confirmed}
        >
          {confirmed ? '확인 완료' : '복구 단어를 저장한 후 확인해주세요'}
        </button>
      </div>
    </div>
  );
};

export default WalletCreatedPage;

