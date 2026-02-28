import { useState, useEffect } from 'react';
import api from '../services/api';
import './WalletRecoveryPage.css';

const WalletRecoveryPage = () => {
  const [recoveryWordsList, setRecoveryWordsList] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>(['', '', '', '', '', '']);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecoveryWordsList();
  }, []);

  const fetchRecoveryWordsList = async () => {
    try {
      const response = await api.get('/wallets/recovery-words-list');
      setRecoveryWordsList(response.data.words);
    } catch (error) {
      console.error('복구 단어 목록 조회 실패:', error);
    }
  };

  const handleWordSelect = (index: number, word: string) => {
    const newSelectedWords = [...selectedWords];
    newSelectedWords[index] = word;
    setSelectedWords(newSelectedWords);
    setError('');
  };

  const handleRecover = async () => {
    if (selectedWords.some(word => !word)) {
      setError('모든 단어를 선택해주세요');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/wallets/recover-address', {
        recovery_words: selectedWords,
      });

      if (response.data.success) {
        setWalletAddress(response.data.wallet_address);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '복구 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    alert('지갑 주소가 복사되었습니다!');
  };

  return (
    <div className="wallet-recovery-page">
      <div className="wallet-recovery-container">
        <h1>지갑 주소 복구</h1>
        <p className="subtitle">복구 단어 6개를 순서대로 선택하여 지갑 주소를 확인하세요</p>

        {!walletAddress ? (
          <>
            <div className="recovery-words-input">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="word-select-group">
                  <label>단어 {index + 1}</label>
                  <select
                    value={selectedWords[index]}
                    onChange={(e) => handleWordSelect(index, e.target.value)}
                    className="word-select"
                  >
                    <option value="">선택하세요</option>
                    {recoveryWordsList.map((word) => (
                      <option key={word} value={word}>
                        {word}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              onClick={handleRecover}
              className="recover-button"
              disabled={loading || selectedWords.some(word => !word)}
            >
              {loading ? '확인 중...' : '지갑 주소 확인'}
            </button>
          </>
        ) : (
          <div className="recovered-address-section">
            <h2>지갑 주소</h2>
            <div className="address-display">
              <code className="wallet-address">{walletAddress}</code>
              <button onClick={handleCopyAddress} className="copy-button">
                복사
              </button>
            </div>
            <p className="info-text">
              이 주소를 <a href="https://bank.berrple.com/lico-connection" target="_blank" rel="noopener noreferrer">BANK 연동 페이지</a>에서 입력하여 연동할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletRecoveryPage;

