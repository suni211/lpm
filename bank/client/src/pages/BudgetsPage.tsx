import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './BudgetsPage.css';

interface BudgetsPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function BudgetsPage({ userData }: BudgetsPageProps) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    category: '',
    monthly_limit: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetsRes, accountsRes] = await Promise.all([
        api.get('/api/budgets'),
        api.get('/api/accounts/me'),
      ]);
      setBudgets(budgetsRes.data.budgets || []);
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
      await api.post('/api/budgets', {
        ...formData,
        monthly_limit: parseInt(formData.monthly_limit),
      });
      setShowForm(false);
      setFormData({ account_id: '', category: '', monthly_limit: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '예산 생성/수정 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('예산을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/budgets/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '삭제 실패');
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
        <div className="budgets-container">
          <div className="page-header">
            <h1>예산 관리</h1>
            <button onClick={() => setShowForm(!showForm)} className="add-button">
              + 예산 추가
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="budget-form">
              <div className="form-row">
                <div className="form-group">
                  <label>계좌</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    required
                  >
                    <option value="">선택</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_number} ({acc.account_type === 'BASIC' ? '기본' : '주식'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>카테고리</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="예: 식비, 교통비, 기타"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>월 예산 한도 (G)</label>
                  <input
                    type="number"
                    value={formData.monthly_limit}
                    onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">저장</button>
                <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                  취소
                </button>
              </div>
            </form>
          )}

          <div className="budgets-list">
            {budgets.length === 0 ? (
              <div className="empty-state">예산이 없습니다</div>
            ) : (
              budgets.map((budget) => {
                const percentage = (budget.current_spent / budget.monthly_limit) * 100;
                const isOver = budget.current_spent > budget.monthly_limit;

                return (
                  <div key={budget.id} className="budget-card">
                    <div className="budget-header">
                      <div>
                        <strong>{budget.category}</strong>
                        <span className="account-number">{budget.account_number}</span>
                      </div>
                      <button onClick={() => handleDelete(budget.id)} className="delete-button">
                        삭제
                      </button>
                    </div>
                    <div className="budget-progress">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${isOver ? 'over' : ''}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {budget.current_spent.toLocaleString()} / {budget.monthly_limit.toLocaleString()} G
                        <span className={`percentage ${isOver ? 'over' : ''}`}>
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="budget-details">
                      <div>남은 예산: {(budget.monthly_limit - budget.current_spent).toLocaleString()} G</div>
                      <div>월: {budget.month_year}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetsPage;

