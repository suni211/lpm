import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './CreateAccountPage.css';

interface CreateAccountPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function CreateAccountPage({ userData, setAuth }: CreateAccountPageProps) {
  const [accountType, setAccountType] = useState<'BASIC' | 'STOCK'>('BASIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/accounts/create', { account_type: accountType });
      
      if (response.data.success) {
        alert(`${accountType === 'BASIC' ? '기본' : '주식'} 계좌가 생성되었습니다!\n계좌번호: ${response.data.account.account_number}`);
        navigate('/dashboard');
        window.location.reload(); // 계좌 목록 새로고침
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '계좌 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="create-account-container">
          <h1>계좌 개설</h1>
          
          <div className="account-type-selector">
            <div 
              className={`account-type-card ${accountType === 'BASIC' ? 'selected' : ''}`}
              onClick={() => setAccountType('BASIC')}
            >
              <div className="account-type-icon">🏦</div>
              <h3>기본 계좌</h3>
              <p>일반 입출금 및 이체용 계좌</p>
              <p className="account-prefix">계좌번호: 01-XXXX-XXXX-XXXX</p>
            </div>

            <div 
              className={`account-type-card ${accountType === 'STOCK' ? 'selected' : ''}`}
              onClick={() => setAccountType('STOCK')}
            >
              <div className="account-type-icon">📈</div>
              <h3>주식 계좌</h3>
              <p>주식 거래 전용 계좌</p>
              <p className="account-prefix">계좌번호: 02-XXXX-XXXX-XXXX</p>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            className="create-button"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? '생성 중...' : '계좌 개설하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateAccountPage;

