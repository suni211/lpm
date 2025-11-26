import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './ScheduledTransfersPage.css';

interface ScheduledTransfersPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function ScheduledTransfersPage({ userData, setAuth }: ScheduledTransfersPageProps) {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_number: '',
    amount: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersRes, accountsRes] = await Promise.all([
        api.get('/api/scheduled-transfers'),
        api.get('/api/accounts/me'),
      ]);
      setTransfers(transfersRes.data.transfers || []);
      setAccounts(accountsRes.data.accounts || []);
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scheduled_datetime = `${formData.scheduled_date}T${formData.scheduled_time}:00`;
      await api.post('/api/scheduled-transfers', {
        ...formData,
        scheduled_date: scheduled_datetime,
      });
      setShowForm(false);
      setFormData({
        from_account_id: '',
        to_account_number: '',
        amount: '',
        scheduled_date: '',
        scheduled_time: '',
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '예약 이체 생성 실패');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('예약 이체를 취소하시겠습니까?')) return;

    try {
      await api.post(`/api/scheduled-transfers/${id}/cancel`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '취소 실패');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '대기 중';
      case 'COMPLETED': return '완료';
      case 'CANCELLED': return '취소됨';
      case 'FAILED': return '실패';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#f59e0b';
      case 'COMPLETED': return '#22c55e';
      case 'CANCELLED': return '#999';
      case 'FAILED': return '#ef4444';
      default: return '#666';
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

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="scheduled-transfers-container">
          <div className="page-header">
            <h1>예약 이체</h1>
            <button onClick={() => setShowForm(!showForm)} className="add-button">
              + 예약 추가
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="scheduled-transfer-form">
              <div className="form-row">
                <div className="form-group">
                  <label>보내는 계좌</label>
                  <select
                    value={formData.from_account_id}
                    onChange={(e) => setFormData({ ...formData, from_account_id: e.target.value })}
                    required
                  >
                    <option value="">선택</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number} ({acc.account_type === 'BASIC' ? '기본' : '주식'}) - {acc.balance.toLocaleString()} G
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>받는 계좌번호</label>
                  <input
                    type="text"
                    value={formData.to_account_number}
                    onChange={(e) => setFormData({ ...formData, to_account_number: e.target.value })}
                    placeholder="01-XXXX-XXXX-XXXX"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>이체 금액 (G)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="1"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>예약 날짜</label>
                    <input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>예약 시간</label>
                    <input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>메모 (선택)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">예약하기</button>
                <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                  취소
                </button>
              </div>
            </form>
          )}

          <div className="transfers-list">
            {transfers.length === 0 ? (
              <div className="empty-state">예약 이체가 없습니다</div>
            ) : (
              transfers.map((transfer) => (
                <div key={transfer.id} className="transfer-card">
                  <div className="transfer-header">
                    <div>
                      <strong>{transfer.from_account_number}</strong> → <strong>{transfer.to_account_number}</strong>
                    </div>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(transfer.status) }}
                    >
                      {getStatusLabel(transfer.status)}
                    </span>
                  </div>
                  <div className="transfer-details">
                    <div>금액: {transfer.amount.toLocaleString()} G</div>
                    <div>예약 시간: {new Date(transfer.scheduled_date).toLocaleString('ko-KR')}</div>
                    {transfer.executed_at && (
                      <div>실행 시간: {new Date(transfer.executed_at).toLocaleString('ko-KR')}</div>
                    )}
                    {transfer.notes && <div>메모: {transfer.notes}</div>}
                  </div>
                  {transfer.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancel(transfer.id)}
                      className="cancel-button"
                    >
                      예약 취소
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduledTransfersPage;

