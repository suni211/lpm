import { useState, useEffect } from 'react';
import { walletService } from '../services/coinService';
import api from '../services/api';
import './DepositWithdrawPage.css';

const DepositWithdrawPage = () => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setWalletAddress(response.data.user.wallet_address || '');
          setGoldBalance(response.data.user.gold_balance || 0);
          setBankBalance(response.data.user.bank_balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!walletAddress) {
      setMessage('지갑 정보를 불러올 수 없습니다');
      return;
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMessage('올바른 금액을 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'deposit') {
        await walletService.deposit(walletAddress, amt);
        setMessage('입금이 완료되었습니다!');
        // 잔액 새로고침
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setGoldBalance(response.data.user.gold_balance || 0);
          setBankBalance(response.data.user.bank_balance || 0);
        }
      } else {
        const result = await walletService.withdraw(walletAddress, amt);
        setMessage('출금이 완료되었습니다! (수수료: ' + result.fee + ' G)');
        // 잔액 새로고침
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setGoldBalance(response.data.user.gold_balance || 0);
          setBankBalance(response.data.user.bank_balance || 0);
        }
      }
      setAmount('');
    } catch (error: any) {
      setMessage(error.response?.data?.error || '처리 실패');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  if (userLoading) {
    return (
      <div className="deposit-withdraw-page">
        <div className="page-container">
          <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="deposit-withdraw-page">
      <div className="page-container">
        <h1 className="page-title">입출금</h1>

        <div className="balance-cards">
          <div className="balance-card">
            <div className="balance-label">Bank 잔액</div>
            <div className="balance-value">{formatNumber(bankBalance)} G</div>
          </div>
          <div className="balance-card">
            <div className="balance-label">LICO 잔액</div>
            <div className="balance-value">{formatNumber(goldBalance)} G</div>
          </div>
        </div>

        <div className="transaction-form-card">
          <div className="tab-buttons">
            <button
              className={'tab-btn ' + (activeTab === 'deposit' ? 'active' : '')}
              onClick={() => setActiveTab('deposit')}
            >
              입금 (Bank → LICO)
            </button>
            <button
              className={'tab-btn ' + (activeTab === 'withdraw' ? 'active' : '')}
              onClick={() => setActiveTab('withdraw')}
            >
              출금 (LICO → Bank)
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>금액 (GOLD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="금액을 입력하세요"
                required
              />
            </div>

            {activeTab === 'withdraw' && (
              <div className="fee-notice">
                출금 시 수수료 5%가 부과됩니다
              </div>
            )}

            {message && (
              <div className={'message ' + (message.includes('완료') ? 'success' : 'error')}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? '처리 중...' : activeTab === 'deposit' ? '입금하기' : '출금하기'}
            </button>
          </form>
        </div>

        <div className="info-section">
          <h3>안내사항</h3>
          <ul>
            <li>Bank에서 LICO로 입금은 즉시 처리됩니다</li>
            <li>LICO에서 Bank로 출금 시 5% 수수료가 부과됩니다</li>
            <li>최소 입출금 금액은 100 GOLD입니다</li>
            <li>출금은 최소 금액 100 GOLD 이상이어야 합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DepositWithdrawPage;
