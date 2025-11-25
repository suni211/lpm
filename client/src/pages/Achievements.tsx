import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Achievements.css';

interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  category: string;
  requirement: number;
  progress: number;
  reward_money: number;
  reward_reputation: number;
  is_completed: boolean;
  is_claimed: boolean;
  claimed_at: string;
}

interface AchievementStats {
  total: number;
  completed: number;
  claimed: number;
  percentage: number;
  rewards: {
    money: number;
    reputation: number;
  };
}

const Achievements: React.FC = () => {
  const { refreshAuth } = useAuth();
  const [achievements, setAchievements] = useState<{ [key: string]: Achievement[] }>({});
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await api.get('/achievements');
      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('업적 조회 실패:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/achievements/stats');
      setStats(response.data);
    } catch (error) {
      console.error('통계 조회 실패:', error);
    }
  };

  const claimReward = async (achievementId: string) => {
    try {
      const response = await api.post(`/achievements/claim/${achievementId}`);
      alert(`🎉 ${response.data.message}\n💰 ${response.data.rewards.money.toLocaleString()}원\n⭐ 명성도 +${response.data.rewards.reputation}`);

      await fetchAchievements();
      await fetchStats();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '보상 수령에 실패했습니다');
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      '경기': '⚔️',
      '카드': '🎴',
      '승리': '🏆',
      '티어': '📈',
      '컬렉션': '📚',
      '경매': '💰',
      '명성': '⭐',
    };
    return icons[category] || '🎯';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      '경기': '#667eea',
      '카드': '#f093fb',
      '승리': '#48bb78',
      '티어': '#fa709a',
      '컬렉션': '#4facfe',
      '경매': '#fee140',
      '명성': '#a29bfe',
    };
    return colors[category] || '#95a5a6';
  };

  const categories = ['ALL', ...Object.keys(achievements)];

  const getFilteredAchievements = () => {
    if (selectedCategory === 'ALL') {
      return Object.entries(achievements).flatMap(([category, items]) =>
        items.map(item => ({ ...item, category }))
      );
    }
    return achievements[selectedCategory]?.map(item => ({ ...item, category: selectedCategory })) || [];
  };

  return (
    <div className="achievements">
      <div className="achievements-container">
        <div className="achievements-header">
          <h1 className="achievements-title">🏆 업적</h1>
          <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>
            ❓ 튜토리얼
          </button>
        </div>

        {stats && (
          <div className="achievements-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-label">달성률</div>
                <div className="stat-value">{stats.percentage}%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <div className="stat-label">완료한 업적</div>
                <div className="stat-value">{stats.completed} / {stats.total}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <div className="stat-label">획득한 보상</div>
                <div className="stat-value">{stats.rewards.money.toLocaleString()}원</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-label">획득한 명성</div>
                <div className="stat-value">{stats.rewards.reputation}</div>
              </div>
            </div>
          </div>
        )}

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'ALL' ? '전체' : `${getCategoryIcon(category)} ${category}`}
            </button>
          ))}
        </div>

        <div className="achievements-grid">
          {getFilteredAchievements().map((achievement) => (
            <div
              key={achievement.id}
              className={`achievement-card ${achievement.is_completed ? 'completed' : ''} ${achievement.is_claimed ? 'claimed' : ''}`}
            >
              <div
                className="achievement-header"
                style={{ backgroundColor: getCategoryColor(achievement.category) }}
              >
                <span className="achievement-category">
                  {getCategoryIcon(achievement.category)} {achievement.category}
                </span>
                {achievement.is_completed && !achievement.is_claimed && (
                  <span className="badge-new">NEW!</span>
                )}
                {achievement.is_claimed && (
                  <span className="badge-claimed">✓</span>
                )}
              </div>

              <div className="achievement-body">
                <h3 className="achievement-name">{achievement.achievement_name}</h3>
                <p className="achievement-description">{achievement.description}</p>

                <div className="achievement-progress">
                  <div className="progress-info">
                    <span className="progress-label">진행도</span>
                    <span className="progress-text">
                      {achievement.progress} / {achievement.requirement}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min((achievement.progress / achievement.requirement) * 100, 100)}%`,
                        backgroundColor: getCategoryColor(achievement.category),
                      }}
                    ></div>
                  </div>
                </div>

                <div className="achievement-rewards">
                  <div className="reward-item">
                    <span className="reward-icon">💰</span>
                    <span className="reward-value">
                      {achievement.reward_money.toLocaleString()}원
                    </span>
                  </div>
                  {achievement.reward_reputation > 0 && (
                    <div className="reward-item">
                      <span className="reward-icon">⭐</span>
                      <span className="reward-value">
                        명성도 +{achievement.reward_reputation}
                      </span>
                    </div>
                  )}
                </div>

                {achievement.is_completed && !achievement.is_claimed && (
                  <button
                    className="btn-claim"
                    onClick={() => claimReward(achievement.id)}
                  >
                    🎁 보상 받기
                  </button>
                )}

                {achievement.is_claimed && (
                  <div className="claimed-info">
                    <span className="claimed-text">수령 완료</span>
                    <span className="claimed-date">
                      {new Date(achievement.claimed_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 업적 시스템 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tutorial-section">
                <h3>🏆 업적 시스템</h3>
                <p>다양한 활동을 통해 업적을 달성하고 보상을 받으세요!</p>
              </div>
              <div className="tutorial-section">
                <h3>📊 업적 카테고리</h3>
                <p>⚔️ 경기: 경기 관련 업적 (경기 수, 연승 등)</p>
                <p>🎴 카드: 카드 수집 관련 업적</p>
                <p>🏆 승리: 승리 관련 업적</p>
                <p>📈 티어: 티어 승급 관련 업적</p>
                <p>📚 컬렉션: 선수 컬렉션 완성</p>
                <p>💰 경매: 경매 거래 관련</p>
                <p>⭐ 명성: 명성도 달성</p>
              </div>
              <div className="tutorial-section">
                <h3>🎁 보상</h3>
                <p>• 업적을 달성하면 보상을 받을 수 있습니다</p>
                <p>• 보상은 돈과 명성도로 제공됩니다</p>
                <p>• 보상은 직접 '보상 받기' 버튼을 눌러야 수령됩니다</p>
              </div>
              <div className="tutorial-section">
                <h3>💡 팁</h3>
                <p>• 진행도는 자동으로 업데이트됩니다</p>
                <p>• 카테고리별로 필터링하여 볼 수 있습니다</p>
                <p>• 명성도가 높을수록 더 좋은 스폰서를 유치할 수 있습니다</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;
