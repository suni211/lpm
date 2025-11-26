import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDashboardPage.css';

interface AdminDashboardPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminDashboardPage({ setAuth }: AdminDashboardPageProps) {
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const dashboardRes = await api.get('/api/admin/dashboard');

      setStats(dashboardRes.data.stats);
      setRecentTransactions(dashboardRes.data.recentTransactions || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('대시보드 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/admin/logout');
      setAuth(false);
      navigate('/admin-login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <div className="admin-header">
        <div>
          <h1>관리자 대시보드</h1>
          <p>Bank 시스템 관리</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          로그아웃
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">전체 사용자</div>
            <div className="stat-value">{stats?.totalUsers || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <div className="stat-label">전체 계좌</div>
            <div className="stat-value">{stats?.totalAccounts || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">전체 잔액</div>
            <div className="stat-value">{Number(stats?.totalBalance || 0).toLocaleString()} G</div>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-label">대기 중인 요청</div>
            <div className="stat-value">
              {(stats?.pendingRequests?.deposits || 0) + 
               (stats?.pendingRequests?.withdrawals || 0) + 
               (stats?.pendingRequests?.transfers || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 대기 중인 요청 */}
      <div className="pending-requests-section">
        <h2>대기 중인 요청</h2>
        <div className="request-tabs">
          <button 
            className="tab-button active"
            onClick={() => navigate('/admin/deposits')}
          >
            입금 ({stats?.pendingRequests?.deposits || 0})
          </button>
          <button 
            className="tab-button"
            onClick={() => navigate('/admin/withdrawals')}
          >
            출금 ({stats?.pendingRequests?.withdrawals || 0})
          </button>
          <button 
            className="tab-button"
            onClick={() => navigate('/admin/transfers')}
          >
            이체 ({stats?.pendingRequests?.transfers || 0})
          </button>
        </div>
      </div>

      {/* 최근 거래 내역 */}
      <div className="recent-section">
        <div className="section-header">
          <h2>최근 거래 내역</h2>
          <button onClick={() => navigate('/admin/transactions')} className="view-all-button">
            전체 보기 →
          </button>
        </div>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>시간</th>
                <th>계좌번호</th>
                <th>사용자</th>
                <th>유형</th>
                <th>금액</th>
                <th>잔액</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">거래 내역이 없습니다</td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleString('ko-KR')}</td>
                    <td className="monospace">{tx.account_number}</td>
                    <td>{tx.minecraft_username}</td>
                    <td>
                      <span className={`type-badge ${tx.transaction_type.toLowerCase()}`}>
                        {tx.transaction_type === 'DEPOSIT' ? '입금' :
                         tx.transaction_type === 'WITHDRAWAL' ? '출금' :
                         tx.transaction_type === 'TRANSFER_OUT' ? '이체(송금)' : '이체(수신)'}
                      </span>
                    </td>
                    <td className={tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'TRANSFER_IN' ? 'positive' : 'negative'}>
                      {tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'TRANSFER_IN' ? '+' : '-'}
                      {Number(tx.amount).toLocaleString()} G
                    </td>
                    <td>{Number(tx.balance_after).toLocaleString()} G</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 빠른 메뉴 */}
      <div className="quick-menu-section">
        <h2>빠른 메뉴</h2>
        <div className="quick-menu-grid">
          <button onClick={() => navigate('/admin/deposits')} className="quick-menu-item">
            <div className="menu-icon">💰</div>
            <div className="menu-label">입금 승인</div>
          </button>
          <button onClick={() => navigate('/admin/withdrawals')} className="quick-menu-item">
            <div className="menu-icon">💸</div>
            <div className="menu-label">출금 승인</div>
          </button>
          <button onClick={() => navigate('/admin/transfers')} className="quick-menu-item">
            <div className="menu-icon">🔄</div>
            <div className="menu-label">이체 승인</div>
          </button>
          <button onClick={() => navigate('/admin/accounts')} className="quick-menu-item">
            <div className="menu-icon">💳</div>
            <div className="menu-label">계좌 관리</div>
          </button>
          <button onClick={() => navigate('/admin/users')} className="quick-menu-item">
            <div className="menu-icon">👥</div>
            <div className="menu-label">사용자 관리</div>
          </button>
          <button onClick={() => navigate('/admin/transactions')} className="quick-menu-item">
            <div className="menu-icon">📋</div>
            <div className="menu-label">거래 내역</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;

