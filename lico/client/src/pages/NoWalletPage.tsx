import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './NoWalletPage.css';

const NoWalletPage = () => {
  const navigate = useNavigate();

  const handleGoToQuestionnaire = () => {
    navigate('/questionnaire');
  };

  return (
    <div className="no-wallet-page">
      <div className="no-wallet-container">
        <div className="info-card">
          <h1>🪙 LICO 지갑이 필요합니다</h1>
          <p className="description">
            LICO 거래소를 이용하려면 지갑이 필요합니다.
            <br />
            지갑은 <strong>설문조사 승인 후 자동으로 생성</strong>됩니다.
          </p>

          <div className="steps-section">
            <h2>지갑 생성 방법</h2>
            <ol className="steps-list">
              <li>
                <strong>BANK 계정 생성</strong>
                <p>먼저 <a href="https://bank.berrple.com" target="_blank" rel="noopener noreferrer">BANK</a>에서 계정을 생성하고 인증 코드를 발급받으세요.</p>
              </li>
              <li>
                <strong>LICO 로그인</strong>
                <p>LICO 로그인 페이지에서 BANK 인증 코드를 입력하여 로그인하세요.</p>
              </li>
              <li>
                <strong>설문조사 완료</strong>
                <p>설문조사에서 90점 이상을 획득하면 자동으로 지갑이 생성됩니다.</p>
              </li>
              <li>
                <strong>복구 단어 저장</strong>
                <p>지갑 생성 시 표시되는 복구 단어 6개를 안전한 곳에 저장하세요.</p>
              </li>
            </ol>
          </div>

          <div className="action-section">
            <button onClick={handleGoToQuestionnaire} className="questionnaire-button">
              설문조사 시작하기
            </button>
            <p className="help-text">
              이미 설문조사를 완료했다면 다시 로그인해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoWalletPage;

