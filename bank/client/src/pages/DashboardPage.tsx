import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface DashboardPageProps {
  setAuth: (auth: boolean) => void;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  minecraft_username: string;
  minecraft_uuid: string;
  account_number: string;
  balance: number;
}

function DashboardPage({ setAuth }: DashboardPageProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        setUserData(response.data.user);
      } else {
        setAuth(false);
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
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
    return <div className="loading">로딩 중...</div>;
  }

  if (!userData) {
    return <div className="loading">사용자 정보를 불러올 수 없습니다</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">🏦 CRYPBANK</h1>
        <p style={{ color: '#666' }}>환영합니다, {userData.minecraft_username}님</p>
        <button onClick={handleLogout} className="logout-button">
          로그아웃
        </button>
      </div>

      <div className="account-info">
        <h2 style={{ marginBottom: '8px' }}>내 계좌</h2>
        <p style={{ opacity: 0.9 }}>계좌번호: {userData.account_number}</p>
        <div className="balance-display">
          {userData.balance.toLocaleString()} G
        </div>
        <p style={{ opacity: 0.9, fontSize: '14px' }}>
          마인크래프트: {userData.minecraft_username}
        </p>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '16px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>계좌 정보</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <strong>아이디:</strong> {userData.username}
          </div>
          <div>
            <strong>이메일:</strong> {userData.email}
          </div>
          <div>
            <strong>마인크래프트 UUID:</strong>
            <br />
            <code style={{ fontSize: '12px', background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px' }}>
              {userData.minecraft_uuid}
            </code>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '16px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '20px' }}>기능</h3>
        <p style={{ color: '#666' }}>
          입출금 및 이체 기능은 곧 추가될 예정입니다.
        </p>
      </div>
    </div>
  );
}

export default DashboardPage;
