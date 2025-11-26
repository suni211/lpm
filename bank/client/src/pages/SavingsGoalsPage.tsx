import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './SavingsGoalsPage.css';

interface SavingsGoalsPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function SavingsGoalsPage({ userData }: SavingsGoalsPageProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    account_id: '',
    title: '',
    target_amount: '',
    target_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsRes, accountsRes] = await Promise.all([
        api.get('/api/savings-goals'),
        api.get('/api/accounts/me'),
      ]);
      setGoals(goalsRes.data.goals || []);
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
      await api.post('/api/savings-goals', {
        ...formData,
        target_amount: parseInt(formData.target_amount),
        target_date: formData.target_date || null,
      });
      setShowForm(false);
      setFormData({ account_id: '', title: '', target_amount: '', target_date: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '목표 저축 생성 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('목표 저축을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/savings-goals/${id}`);
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
        <div className="savings-goals-container">
          <div className="page-header">
            <h1>목표 저축</h1>
            <button onClick={() => setShowForm(!showForm)} className="add-button">
              + 목표 추가
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="goal-form">
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
                  <label>목표 이름</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="예: 여행 자금, 자동차 구매"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>목표 금액 (G)</label>
                  <input
                    type="number"
                    value={formData.target_amount}
                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                    required
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>목표 날짜 (선택)</label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
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

          <div className="goals-list">
            {goals.length === 0 ? (
              <div className="empty-state">목표 저축이 없습니다</div>
            ) : (
              goals.map((goal, index) => {
                const percentage = (goal.current_amount / goal.target_amount) * 100;
                const isCompleted = goal.is_completed;

                return (
                  <div key={goal.id} className={`goal-card stagger-item ${isCompleted ? 'completed' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="goal-header">
                      <div>
                        <h3>{goal.title}</h3>
                        <span className="account-number">{goal.account_number}</span>
                      </div>
                      {isCompleted && <span className="completed-badge">완료!</span>}
                    </div>
                    <div className="goal-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="progress-text">
                        {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()} G
                        <span className="percentage">({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="goal-details">
                      <div>남은 금액: {(goal.target_amount - goal.current_amount).toLocaleString()} G</div>
                      {goal.target_date && (
                        <div>목표 날짜: {new Date(goal.target_date).toLocaleDateString('ko-KR')}</div>
                      )}
                    </div>
                    <button onClick={() => handleDelete(goal.id)} className="delete-button">
                      삭제
                    </button>
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

export default SavingsGoalsPage;

