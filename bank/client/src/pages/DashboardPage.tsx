import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';

interface DashboardPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function DashboardPage({ userData }: DashboardPageProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/api/accounts/me');
      console.log('Accounts response:', response.data);
      setAccounts(response.data.accounts || []);
    } catch (error: any) {
      console.error('Failed to fetch accounts:', error);
      console.error('Error details:', error.response?.data);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <div className="page-container">
        <Sidebar userData={userData} />
        <div className="page-content">
          <div style={{ padding: '40px', background: 'white', borderRadius: '16px' }}>
            <h2>사용자 정보를 불러올 수 없습니다</h2>
            <p>로그인 페이지로 이동합니다...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="dashboard-container" style={{ padding: '40px', background: 'white', borderRadius: '16px', minHeight: '400px' }}>
          <div className="dashboard-header" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <img 
                src="/cryptbank-logo.png" 
                alt="CRYPBANK" 
                className="dashboard-header-logo"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="dashboard-title" style={{ fontSize: '32px', margin: '0 0 8px 0', color: '#333' }}>대시보드</h1>
                <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>
                  환영합니다, <strong>{userData.minecraft_username || userData.username || '사용자'}</strong>님
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>계좌 정보를 불러오는 중...</p>
            </div>
          ) : (

            <>
              {accounts.length === 0 ? (
                <div style={{ background: '#f9f9f9', padding: '40px', borderRadius: '16px', textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ marginBottom: '16px', color: '#333' }}>계좌가 없습니다</h2>
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
                <div className="accounts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  {accounts.map((account: any, index: number) => (
                    <div key={account.id} className="account-card stagger-item" style={{
                      animationDelay: `${index * 0.1}s`, 
                      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
                      padding: '24px',
                      borderRadius: '12px',
                      border: '2px solid #667eea'
                    }}>
                      <div className="account-header" style={{ marginBottom: '12px' }}>
                        <span className="account-type-badge" style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          background: account.account_type === 'BASIC' ? '#667eea' : '#22c55e',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {account.account_type === 'BASIC' ? '🏦 기본계좌' : '📈 주식계좌'}
                        </span>
                      </div>
                      <div className="account-number" style={{ 
                        fontFamily: 'monospace',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#333',
                        marginBottom: '8px'
                      }}>
                        {account.account_number}
                      </div>
                      <div className="account-balance" style={{ 
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#667eea'
                      }}>
                        {Number(account.balance || 0).toLocaleString()} G
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '16px', border: '1px solid #e0e0e0' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '20px', color: '#333' }}>빠른 메뉴</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      onClick={() => navigate('/banking')}
                      style={{
                        padding: '12px',
                        background: '#f0f0f0',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '14px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#e0e0e0'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#f0f0f0'}
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
                        textAlign: 'left',
                        fontSize: '14px',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#e0e0e0'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#f0f0f0'}
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
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                    >
                      📈 주식 거래소 이동
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '16px', border: '1px solid #e0e0e0' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '20px', color: '#333' }}>계좌 정보</h3>
                  <div style={{ display: 'grid', gap: '12px', fontSize: '14px', color: '#666' }}>
                    <div>
                      <strong style={{ color: '#333' }}>아이디:</strong> {userData.username || 'N/A'}
                    </div>
                    <div>
                      <strong style={{ color: '#333' }}>이메일:</strong> {userData.email || 'N/A'}
                    </div>
                    <div>
                      <strong style={{ color: '#333' }}>마인크래프트:</strong> {userData.minecraft_username || 'N/A'}
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
