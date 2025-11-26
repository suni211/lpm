import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './AutoTransfersPage.css';

interface AutoTransfersPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function AutoTransfersPage({ userData }: AutoTransfersPageProps) {
  const [rules, setRules] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    from_account_id: '',
    to_account_number: '',
    amount: '',
    frequency: 'MONTHLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    day_of_week: 1,
    day_of_month: 1,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rulesRes, accountsRes] = await Promise.all([
        api.get('/api/auto-transfers'),
        api.get('/api/accounts/me'),
      ]);
      setRules(rulesRes.data.rules || []);
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
      await api.post('/api/auto-transfers', formData);
      setShowForm(false);
      setFormData({
        from_account_id: '',
        to_account_number: '',
        amount: '',
        frequency: 'MONTHLY',
        day_of_week: 1,
        day_of_month: 1,
        notes: '',
      });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '자동 이체 규칙 생성 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('자동 이체 규칙을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/auto-transfers/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제 실패');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/auto-transfers/${id}`, { is_active: !isActive });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '상태 변경 실패');
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
        <div className="auto-transfers-container">
          <div className="page-header">
            <h1>자동 이체</h1>
            <button onClick={() => setShowForm(!showForm)} className="add-button">
              + 규칙 추가
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="auto-transfer-form">
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

                <div className="form-group">
                  <label>주기</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    required
                  >
                    <option value="DAILY">매일</option>
                    <option value="WEEKLY">매주</option>
                    <option value="MONTHLY">매월</option>
                  </select>
                </div>
              </div>

              {formData.frequency === 'WEEKLY' && (
                <div className="form-group">
                  <label>요일</label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                  >
                    <option value="0">일요일</option>
                    <option value="1">월요일</option>
                    <option value="2">화요일</option>
                    <option value="3">수요일</option>
                    <option value="4">목요일</option>
                    <option value="5">금요일</option>
                    <option value="6">토요일</option>
                  </select>
                </div>
              )}

              {formData.frequency === 'MONTHLY' && (
                <div className="form-group">
                  <label>일자</label>
                  <input
                    type="number"
                    value={formData.day_of_month}
                    onChange={(e) => setFormData({ ...formData, day_of_month: Number(e.target.value) })}
                    min="1"
                    max="31"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label>메모 (선택)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">규칙 생성</button>
                <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                  취소
                </button>
              </div>
            </form>
          )}

          <div className="rules-list">
            {rules.length === 0 ? (
              <div className="empty-state">자동 이체 규칙이 없습니다</div>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-header">
                    <div>
                      <strong>{rule.from_account_number}</strong> → <strong>{rule.to_account_number}</strong>
                    </div>
                    <div className="rule-actions">
                      <button
                        onClick={() => handleToggle(rule.id, rule.is_active)}
                        className={`toggle-button ${rule.is_active ? 'active' : 'inactive'}`}
                      >
                        {rule.is_active ? '활성' : '비활성'}
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="delete-button">
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="rule-details">
                    <div>금액: {rule.amount.toLocaleString()} G</div>
                    <div>
                      주기: {rule.frequency === 'DAILY' ? '매일' : rule.frequency === 'WEEKLY' ? '매주' : '매월'}
                      {rule.frequency === 'WEEKLY' && ` (${['일', '월', '화', '수', '목', '금', '토'][rule.day_of_week]}요일)`}
                      {rule.frequency === 'MONTHLY' && ` (${rule.day_of_month}일)`}
                    </div>
                    <div>다음 실행: {new Date(rule.next_execution_date).toLocaleDateString('ko-KR')}</div>
                    {rule.last_execution_date && (
                      <div>마지막 실행: {new Date(rule.last_execution_date).toLocaleDateString('ko-KR')}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoTransfersPage;

