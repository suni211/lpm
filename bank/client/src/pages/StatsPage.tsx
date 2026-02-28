import { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './StatsPage.css';

interface StatsPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

const COLORS = ['#667eea', '#764ba2', '#22c55e', '#f59e0b', '#ef4444'];

function StatsPage({ userData }: StatsPageProps) {
  const [stats, setStats] = useState<any>(null);
  const [budgetStats, setBudgetStats] = useState<any[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      const [statsRes, budgetRes] = await Promise.all([
        api.get(`/api/stats?period=${period}`),
        api.get('/api/stats/budget'),
      ]);
      setStats(statsRes.data);
      setBudgetStats(budgetRes.data.budgets || []);
    } catch (error) {
      console.error('통계 조회 실패:', error);
    } finally {
      setLoading(false);
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

  const typeData = stats?.byType
    ? Object.entries(stats.byType).map(([type, data]: [string, any]) => ({
        name: type === 'DEPOSIT' ? '입금' : type === 'WITHDRAWAL' ? '출금' : type === 'TRANSFER_IN' ? '이체 수신' : '이체 송금',
        value: data.total,
        count: data.count,
      }))
    : [];

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="stats-container">
          <div className="stats-header">
            <h1>통계 및 분석</h1>
            <div className="period-selector">
              <button
                className={period === 'week' ? 'active' : ''}
                onClick={() => setPeriod('week')}
              >
                주간
              </button>
              <button
                className={period === 'month' ? 'active' : ''}
                onClick={() => setPeriod('month')}
              >
                월간
              </button>
              <button
                className={period === 'year' ? 'active' : ''}
                onClick={() => setPeriod('year')}
              >
                연간
              </button>
            </div>
          </div>

          <div className="stats-summary">
            <div className="summary-card income">
              <div className="summary-label">총 수입</div>
              <div className="summary-value">{stats?.totalIncome.toLocaleString() || 0} G</div>
            </div>
            <div className="summary-card expense">
              <div className="summary-label">총 지출</div>
              <div className="summary-value">{stats?.totalExpense.toLocaleString() || 0} G</div>
            </div>
            <div className="summary-card net">
              <div className="summary-label">순수익</div>
              <div className="summary-value">{stats?.netAmount.toLocaleString() || 0} G</div>
            </div>
            <div className="summary-card count">
              <div className="summary-label">거래 건수</div>
              <div className="summary-value">{stats?.transactionCount || 0}건</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>월별 수입/지출 추이</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.monthlyData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#22c55e" name="수입" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" name="지출" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>거래 유형별 통계</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {budgetStats.length > 0 && (
            <div className="budget-stats">
              <h3>예산 현황</h3>
              <div className="budget-list">
                {budgetStats.map((budget: any) => {
                  const percentage = budget.percentage || 0;
                  return (
                    <div key={budget.id} className="budget-stat-card">
                      <div className="budget-stat-header">
                        <strong>{budget.category}</strong>
                        <span className={`percentage ${percentage > 100 ? 'over' : ''}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="budget-stat-bar">
                        <div
                          className={`budget-stat-fill ${percentage > 100 ? 'over' : ''}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="budget-stat-details">
                        사용: {budget.spent.toLocaleString()} G / 한도: {budget.monthly_limit.toLocaleString()} G
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StatsPage;

