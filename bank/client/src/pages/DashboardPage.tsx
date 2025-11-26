import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

interface DashboardPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function DashboardPage({ userData, setAuth }: DashboardPageProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/api/accounts/me');
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setAuth(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar userData={userData} />
        <div className="page-content">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="page-container">
        <Sidebar userData={userData} />
        <div className="page-content">
          <div className="loading">사용자 정보를 불러올 수 없습니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">대시보드</h1>
            <p style={{ color: '#666' }}>환영합니다, {userData.minecraft_username}님</p>
          </div>

          {accounts.length === 0 ? (
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '16px' }}>계좌가 없습니다</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>서비스를 이용하려면 계좌를 개설해주세요</p>
              <button 
                onClick={() => navigate('/create-account')}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                계좌 개설하기
              </button>
            </div>
          ) : (
            <>
              <div className="accounts-grid">
                {accounts.map((account: any) => (
                  <div key={account.id} className="account-card">
                    <div className="account-header">
                      <span className="account-type-badge">
                        {account.account_type === 'BASIC' ? '🏦 기본계좌' : '📈 주식계좌'}
                      </span>
                    </div>
                    <div className="account-number">{account.account_number}</div>
                    <div className="account-balance">{account.balance.toLocaleString()} G</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>빠른 메뉴</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      onClick={() => navigate('/banking')}
                      style={{
                        padding: '12px',
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      💰 입출금 및 이체
                    </button>
                    <button 
                      onClick={() => navigate('/transactions')}
                      style={{
                        padding: '12px',
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      📋 거래 내역
                    </button>
                    <button 
                      onClick={() => window.open('https://lico.berrple.com', '_blank')}
                      style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600'
                      }}
                    >
                      📈 주식 거래소 이동
                    </button>
                  </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>계좌 정보</h3>
                  <div style={{ display: 'grid', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <strong>아이디:</strong> {userData.username}
                    </div>
                    <div>
                      <strong>이메일:</strong> {userData.email}
                    </div>
                    <div>
                      <strong>마인크래프트:</strong> {userData.minecraft_username}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
