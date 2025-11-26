import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminDepositsPage.css';

interface AdminDepositsPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminDepositsPage({ setAuth }: AdminDepositsPageProps) {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const response = await api.get('/api/deposits/pending');
      // 서버는 requests를 반환하지만, 클라이언트는 deposits를 기대
      setDeposits(response.data.requests || response.data.deposits || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('입금 요청 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 입금 요청을 승인하시겠습니까?')) return;

    setProcessing(id);
    try {
      await api.post(`/api/deposits/${id}/approve`);
      alert('입금이 승인되었습니다.');
      fetchDeposits();
    } catch (error: any) {
      alert(error.response?.data?.error || '승인 실패');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거절 사유를 입력하세요:');
    if (!reason) return;

    setProcessing(id);
    try {
      await api.post(`/api/deposits/${id}/reject`, { notes: reason });
      alert('입금이 거절되었습니다.');
      fetchDeposits();
    } catch (error: any) {
      alert(error.response?.data?.error || '거절 실패');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← 뒤로
        </button>
        <h1>입금 승인 관리</h1>
      </div>

      {deposits.length === 0 ? (
        <div className="empty-state">
          <p>대기 중인 입금 요청이 없습니다</p>
        </div>
      ) : (
        <div className="deposits-list">
          {deposits.map((deposit) => (
            <div key={deposit.id} className="deposit-card">
              <div className="deposit-header">
                <div>
                  <div className="deposit-id">요청 ID: {deposit.id}</div>
                  <div className="deposit-account">계좌번호: {deposit.account_number}</div>
                  <div className="deposit-user">사용자: {deposit.minecraft_username || deposit.username}</div>
                </div>
                <div className="deposit-amount">
                  {Number(deposit.amount).toLocaleString()} G
                </div>
              </div>
              <div className="deposit-details">
                <div className="detail-item">
                  <span className="detail-label">요청 시간:</span>
                  <span className="detail-value">
                    {new Date(deposit.requested_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {deposit.notes && (
                  <div className="detail-item">
                    <span className="detail-label">메모:</span>
                    <span className="detail-value">{deposit.notes}</span>
                  </div>
                )}
              </div>
              <div className="deposit-actions">
                <button
                  onClick={() => handleApprove(deposit.id)}
                  disabled={processing === deposit.id}
                  className="approve-button"
                >
                  {processing === deposit.id ? '처리 중...' : '승인'}
                </button>
                <button
                  onClick={() => handleReject(deposit.id)}
                  disabled={processing === deposit.id}
                  className="reject-button"
                >
                  거절
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDepositsPage;

