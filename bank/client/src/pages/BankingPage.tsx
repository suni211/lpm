import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './BankingPage.css';

interface BankingPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function BankingPage({ userData }: BankingPageProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/api/accounts/me');
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const account = accounts.find(a => a.account_type === 'BASIC');
      if (!account) {
        setError('기본 계좌가 없습니다. 먼저 계좌를 개설해주세요.');
        setLoading(false);
        return;
      }

      await api.post('/api/deposits', {
        account_id: account.id,
        amount: parseInt(depositAmount)
      });

      setSuccess('입금 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.');
      setDepositAmount('');
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || '입금 신청에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const account = accounts.find(a => a.id === withdrawAccount);
      if (!account) {
        setError('계좌를 선택해주세요.');
        setLoading(false);
        return;
      }

      await api.post('/api/withdrawals', {
        account_id: account.id,
        amount: parseInt(withdrawAmount)
      });

      setSuccess('출금 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.');
      setWithdrawAmount('');
      setWithdrawAccount('');
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || '출금 신청에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/transfers', {
        from_account_id: transferFrom,
        to_account_number: transferTo,
        amount: parseInt(transferAmount),
        notes: transferNotes
      });

      setSuccess('이체가 완료되었습니다!');
      setTransferAmount('');
      setTransferFrom('');
      setTransferTo('');
      setTransferNotes('');
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.error || '이체 신청에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="banking-container">
          <h1>입출금 및 이체</h1>

          <div className="banking-tabs">
            <button
              className={`tab ${activeTab === 'deposit' ? 'active' : ''}`}
              onClick={() => setActiveTab('deposit')}
            >
              💰 입금
            </button>
            <button
              className={`tab ${activeTab === 'withdraw' ? 'active' : ''}`}
              onClick={() => setActiveTab('withdraw')}
            >
              💸 출금
            </button>
            <button
              className={`tab ${activeTab === 'transfer' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfer')}
            >
              🔄 이체
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {activeTab === 'deposit' && (
            <form onSubmit={handleDeposit} className="banking-form">
              <div className="form-group">
                <label>입금 계좌</label>
                <select disabled>
                  {accounts.find(a => a.account_type === 'BASIC') ? (
                    <option>{accounts.find(a => a.account_type === 'BASIC')?.account_number}</option>
                  ) : (
                    <option>기본 계좌가 없습니다</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>입금 금액 (G)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="입금할 금액을 입력하세요"
                  required
                  min="1"
                />
              </div>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? '처리 중...' : '입금 신청'}
              </button>
            </form>
          )}

          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="banking-form">
              <div className="form-group">
                <label>출금 계좌</label>
                <select
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  required
                >
                  <option value="">계좌 선택</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} ({account.account_type === 'BASIC' ? '기본' : '주식'}) - {account.balance.toLocaleString()} G
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>출금 금액 (G)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="출금할 금액을 입력하세요"
                  required
                  min="1"
                />
              </div>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? '처리 중...' : '출금 신청'}
              </button>
            </form>
          )}

          {activeTab === 'transfer' && (
            <form onSubmit={handleTransfer} className="banking-form">
              <div className="form-group">
                <label>보내는 계좌</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  required
                >
                  <option value="">계좌 선택</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} ({account.account_type === 'BASIC' ? '기본' : '주식'}) - {account.balance.toLocaleString()} G
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>받는 계좌번호</label>
                <input
                  type="text"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  placeholder="01-XXXX-XXXX-XXXX 또는 02-XXXX-XXXX-XXXX"
                  required
                />
              </div>
              <div className="form-group">
                <label>이체 금액 (G)</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="이체할 금액을 입력하세요"
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>메모 (선택)</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="이체 메모를 입력하세요"
                />
              </div>
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? '처리 중...' : '이체 신청'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default BankingPage;

