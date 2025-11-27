import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminTransfersPage.css';

interface AdminTransfersPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminTransfersPage({ setAuth }: AdminTransfersPageProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await api.get('/api/transfers/pending');
      setTransfers(response.data.transfers || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('이체 요청 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 이체 요청을 승인하시겠습니까?')) return;

    setProcessing(id);
    try {
      await api.post(`/api/transfers/${id}/approve`);
      alert('이체가 승인되었습니다.');
      fetchTransfers();
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
      await api.post(`/api/transfers/${id}/reject`, { notes: reason });
      alert('이체가 거절되었습니다.');
      fetchTransfers();
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
        <h1>이체 승인 관리</h1>
      </div>

      {transfers.length === 0 ? (
        <div className="empty-state">
          <p>대기 중인 이체 요청이 없습니다</p>
        </div>
      ) : (
        <div className="transfers-list">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="transfer-card">
              <div className="transfer-header">
                <div>
                  <div className="transfer-id">요청 ID: {transfer.id}</div>
                  <div className="transfer-from">보내는 계좌: {transfer.from_account_number}</div>
                  <div className="transfer-to">받는 계좌: {transfer.to_account_number}</div>
                  <div className="transfer-user">사용자: {transfer.minecraft_username || transfer.username}</div>
                </div>
                <div className="transfer-amount">
                  {Number(transfer.amount).toLocaleString()} G
                </div>
              </div>
              <div className="transfer-details">
                <div className="detail-item">
                  <span className="detail-label">요청 시간:</span>
                  <span className="detail-value">
                    {new Date(transfer.requested_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                {transfer.notes && (
                  <div className="detail-item">
                    <span className="detail-label">메모:</span>
                    <span className="detail-value">{transfer.notes}</span>
                  </div>
                )}
              </div>
              <div className="transfer-actions">
                <button
                  onClick={() => handleApprove(transfer.id)}
                  disabled={processing === transfer.id}
                  className="approve-button"
                >
                  {processing === transfer.id ? '처리 중...' : '승인'}
                </button>
                <button
                  onClick={() => handleReject(transfer.id)}
                  disabled={processing === transfer.id}
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

export default AdminTransfersPage;





