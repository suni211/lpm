import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './Dashboard.css';

interface DashboardStats {
  team: {
    name: string;
    balance: number;
    tier: string;
    lp: number;
    fandom: number;
    fanSatisfaction: number;
    reputation: number;
  };
  stats: {
    playerCount: number;
    rosterCount: number;
    avgPower: number;
    recentWins: number;
    recentLosses: number;
    winRate: number;
  };
}

interface MoneyTrend {
  date: string;
  balance: number;
}

interface FanStats {
  current: {
    fandom: number;
    satisfaction: number;
  };
  trend: Array<{
    date: string;
    fans: number;
    satisfaction: number;
  }>;
}

interface PlayerStats {
  positionDistribution: Array<{
    position: string;
    count: number;
    avgPower: number;
  }>;
  rarityDistribution: Array<{
    rarity: string;
    count: number;
  }>;
}

const RARITY_COLORS: { [key: string]: string } = {
  LEGEND: '#ff6b6b',
  EPIC: '#a29bfe',
  RARE: '#74b9ff',
  COMMON: '#95a5a6',
};

const Dashboard: React.FC = () => {
  const { team } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [moneyTrend, setMoneyTrend] = useState<MoneyTrend[]>([]);
  const [fanStats, setFanStats] = useState<FanStats | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, moneyRes, fanRes, playerRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/money-trend'),
        api.get('/dashboard/fan-stats'),
        api.get('/dashboard/player-stats'),
      ]);

      setStats(statsRes.data);
      setMoneyTrend(moneyRes.data.trend);
      setFanStats(fanRes.data);
      setPlayerStats(playerRes.data);
    } catch (error) {
      console.error('대시보드 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const quickActions = [
    { title: '카드 뽑기', icon: '🎰', link: '/gacha', color: '#667eea' },
    { title: '랭크 경기', icon: '⚔️', link: '/match', color: '#f093fb' },
    { title: '로스터', icon: '📋', link: '/roster', color: '#4facfe' },
    { title: '경매장', icon: '💸', link: '/auction', color: '#facc15' },
  ];

  return (
    <div className="dashboard-new">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header-new">
          <div>
            <h1 className="dashboard-title">{stats.team.name}</h1>
            <p className="dashboard-subtitle">팀 대시보드</p>
          </div>
          <div className="tier-badge">
            <span className="tier-icon">🏆</span>
            <div>
              <div className="tier-name">{stats.team.tier}</div>
              <div className="tier-lp">{stats.team.lp} LP</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card balance">
            <div className="metric-icon">💰</div>
            <div className="metric-content">
              <div className="metric-label">보유 자금</div>
              <div className="metric-value">{stats.team.balance.toLocaleString()}원</div>
            </div>
          </div>

          <div className="metric-card fandom">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-label">팬덤</div>
              <div className="metric-value">{stats.team.fandom.toLocaleString()}</div>
              <div className="metric-sub">만족도 {stats.team.fanSatisfaction}%</div>
            </div>
          </div>

          <div className="metric-card players">
            <div className="metric-icon">🎴</div>
            <div className="metric-content">
              <div className="metric-label">선수 카드</div>
              <div className="metric-value">{stats.stats.playerCount}장</div>
              <div className="metric-sub">로스터 {stats.stats.rosterCount}/7</div>
            </div>
          </div>

          <div className="metric-card reputation">
            <div className="metric-icon">⭐</div>
            <div className="metric-content">
              <div className="metric-label">명성도</div>
              <div className="metric-value">{stats.team.reputation}</div>
            </div>
          </div>

          <div className="metric-card winrate">
            <div className="metric-icon">🏅</div>
            <div className="metric-content">
              <div className="metric-label">최근 전적</div>
              <div className="metric-value">{stats.stats.recentWins}승 {stats.stats.recentLosses}패</div>
              <div className="metric-sub">승률 {stats.stats.winRate}%</div>
            </div>
          </div>

          <div className="metric-card power">
            <div className="metric-icon">⚡</div>
            <div className="metric-content">
              <div className="metric-label">평균 파워</div>
              <div className="metric-value">{stats.stats.avgPower}</div>
              <div className="metric-sub">로스터 평균</div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          {/* Money Trend Chart */}
          <div className="chart-card money-chart">
            <h3 className="chart-title">
              <span className="chart-icon">💰</span>
              자금 추이
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={moneyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                <YAxis
                  stroke="#a3a3a3"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `${(value / 100000000).toFixed(1)}억`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                  formatter={(value: any) => [`${value.toLocaleString()}원`, '자금']}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#facc15"
                  strokeWidth={3}
                  dot={{ fill: '#facc15', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Fan Trend Chart */}
          <div className="chart-card fan-chart">
            <h3 className="chart-title">
              <span className="chart-icon">👥</span>
              팬덤 추이
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={fanStats?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fans"
                  stroke="#4a9eff"
                  strokeWidth={2}
                  name="팬 수"
                  dot={{ fill: '#4a9eff', r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="satisfaction"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="만족도"
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Position Distribution */}
          <div className="chart-card position-chart">
            <h3 className="chart-title">
              <span className="chart-icon">📊</span>
              포지션별 선수 분포
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={playerStats?.positionDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="position" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
                <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rarity Distribution */}
          <div className="chart-card rarity-chart">
            <h3 className="chart-title">
              <span className="chart-icon">🎴</span>
              레어도 분포
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={playerStats?.rarityDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ rarity, count }) => `${rarity} (${count})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {playerStats?.rarityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RARITY_COLORS[entry.rarity] || '#95a5a6'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f1f1f',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h3 className="section-title">빠른 실행</h3>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <Link
                key={action.link}
                to={action.link}
                className="quick-action-card"
                style={{ borderColor: action.color }}
              >
                <div className="action-icon" style={{ background: `${action.color}20` }}>
                  {action.icon}
                </div>
                <div className="action-title">{action.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
