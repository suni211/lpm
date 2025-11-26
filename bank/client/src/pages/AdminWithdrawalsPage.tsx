import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminWithdrawalsPage.css';

interface AdminWithdrawalsPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminWithdrawalsPage({ setAuth }: AdminWithdrawalsPageProps) {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/api/withdrawals/pending');
      setWithdrawals(response.data.withdrawals || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('출금 요청 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 출금 요청을 승인하시겠습니까?')) return;

    setProcessing(id);
    try {
      await api.post(`/api/withdrawals/${id}/approve`);
      alert('출금이 승인되었습니다.');
      fetchWithdrawals();
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
      await api.post(`/api/withdrawals/${id}/reject`, { notes: reason });
      alert('출금이 거절되었습니다.');
      fetchWithdrawals();
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
        <h1>출금 승인 관리</h1>
      </div>

      {withdrawals.length === 0 ? (
        <div className="empty-state">
          <p>대기 중인 출금 요청이 없습니다</p>
        </div>
      ) : (
        <div className="withdrawals-list">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="withdrawal-card">
              <div className="withdrawal-header">
                <div>
                  <div className="withdrawal-id">요청 ID: {withdrawal.id}</div>
                  <div className="withdrawal-account">계좌번호: {withdrawal.account_number}</div>
                  <div className="withdrawal-user">사용자: {withdrawal.minecraft_username || withdrawal.username}</div>
                  <div className="withdrawal-balance">현재 잔액: {Number(withdrawal.current_balance || 0).toLocaleString()} G</div>
                </div>
                <div className="withdrawal-amount">
                  -{Number(withdrawal.amount).toLocaleString()} G
                </div>
              </div>
              <div className="withdrawal-details">
                <div className="detail-item">
                  <span className="detail-label">요청 시간:</span>
                  <span className="detail-value">
                    {new Date(withdrawal.requested_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {withdrawal.notes && (
                  <div className="detail-item">
                    <span className="detail-label">메모:</span>
                    <span className="detail-value">{withdrawal.notes}</span>
                  </div>
                )}
              </div>
              <div className="withdrawal-actions">
                <button
                  onClick={() => handleApprove(withdrawal.id)}
                  disabled={processing === withdrawal.id}
                  className="approve-button"
                >
                  {processing === withdrawal.id ? '처리 중...' : '승인'}
                </button>
                <button
                  onClick={() => handleReject(withdrawal.id)}
                  disabled={processing === withdrawal.id}
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

export default AdminWithdrawalsPage;

