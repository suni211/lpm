import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Fandom.css';

interface FandomInfo {
  teamName: string;
  fandom: number;
  fanSatisfaction: number;
  fanLevel: number;
  nextLevelFans: number;
  canHoldMeeting: boolean;
  lastMeeting: string;
}

interface FandomEvent {
  id: string;
  event_name: string;
  description: string;
  required_fandom: number;
  reward_fandom: number;
  reward_satisfaction: number;
  start_date: string;
  end_date: string;
  hasParticipated: boolean;
  daysRemaining: number;
}

interface Merchandise {
  id: string;
  item_name: string;
  description: string;
  price: number;
  required_fandom: number;
  fandom_gain: number;
  canPurchase: boolean;
}

const Fandom: React.FC = () => {
  const { refreshAuth } = useAuth();
  const [fandomInfo, setFandomInfo] = useState<FandomInfo | null>(null);
  const [events, setEvents] = useState<FandomEvent[]>([]);
  const [merchandise, setMerchandise] = useState<Merchandise[]>([]);
  const [activeTab, setActiveTab] = useState<'meeting' | 'events' | 'shop'>('meeting');
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedMerchandise, setSelectedMerchandise] = useState<Merchandise | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    fetchFandomInfo();
    fetchEvents();
    fetchMerchandise();
  }, []);

  const fetchFandomInfo = async () => {
    try {
      const response = await api.get('/fandom/info');
      setFandomInfo(response.data);
    } catch (error) {
      console.error('팬덤 정보 조회 실패:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await api.get('/fandom/events');
      setEvents(response.data.events);
    } catch (error) {
      console.error('이벤트 조회 실패:', error);
    }
  };

  const fetchMerchandise = async () => {
    try {
      const response = await api.get('/fandom/merchandise');
      setMerchandise(response.data.merchandise);
    } catch (error) {
      console.error('굿즈 조회 실패:', error);
    }
  };

  const holdMeeting = async (meetingType: string) => {
    const costs: { [key: string]: number } = {
      basic: 5000000,
      premium: 15000000,
      special: 30000000,
    };

    const typeNames: { [key: string]: string } = {
      basic: '기본',
      premium: '프리미엄',
      special: '스페셜',
    };

    if (!confirm(`${typeNames[meetingType]} 팬 미팅을 개최하시겠습니까?\n비용: ${costs[meetingType].toLocaleString()}원`)) {
      return;
    }

    try {
      const response = await api.post('/fandom/meeting', { meetingType });
      alert(`🎉 ${response.data.message}\n👥 팬 +${response.data.fansGained}\n😊 만족도 +${response.data.satisfactionGained}`);

      await fetchFandomInfo();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '팬 미팅 개최에 실패했습니다');
    }
  };

  const participateEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`${eventName} 이벤트에 참여하시겠습니까?`)) {
      return;
    }

    try {
      const response = await api.post(`/fandom/events/${eventId}/participate`);
      alert(`✅ ${response.data.message}\n👥 팬 +${response.data.rewards.fandom}\n😊 만족도 +${response.data.rewards.satisfaction}`);

      await fetchFandomInfo();
      await fetchEvents();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '이벤트 참여에 실패했습니다');
    }
  };

  const purchaseMerchandise = async () => {
    if (!selectedMerchandise) return;

    const totalCost = selectedMerchandise.price * quantity;

    if (!confirm(`${selectedMerchandise.item_name}을(를) ${quantity}개 구매하시겠습니까?\n총 비용: ${totalCost.toLocaleString()}원`)) {
      return;
    }

    try {
      const response = await api.post(`/fandom/merchandise/${selectedMerchandise.id}/purchase`, { quantity });
      alert(`🛍️ ${response.data.message}\n👥 팬 +${response.data.fandomGained}`);

      setSelectedMerchandise(null);
      setQuantity(1);
      await fetchFandomInfo();
      await fetchMerchandise();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '굿즈 구매에 실패했습니다');
    }
  };

  const getFanLevelName = (level: number) => {
    const levels = ['', '신생 팬덤', '성장 중', '인기', '대중적', '유명', '스타', '메가 스타', '레전드', '국민 팀', '세계적'];
    return levels[level] || '신생 팬덤';
  };

  const getFanLevelColor = (level: number) => {
    if (level >= 9) return '#ff6b6b';
    if (level >= 7) return '#a29bfe';
    if (level >= 5) return '#74b9ff';
    if (level >= 3) return '#55efc4';
    return '#95a5a6';
  };

  return (
    <div className="fandom">
      <div className="fandom-container">
        <div className="fandom-header">
          <h1 className="fandom-title">👥 팬덤</h1>
          <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>
            ❓ 튜토리얼
          </button>
        </div>

        {fandomInfo && (
          <div className="fandom-stats">
            <div className="stat-card main">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <div className="stat-label">팬덤 수</div>
                <div className="stat-value">{fandomInfo.fandom.toLocaleString()}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-label">팬덤 레벨</div>
                <div className="stat-value" style={{ color: getFanLevelColor(fandomInfo.fanLevel) }}>
                  Lv.{fandomInfo.fanLevel} {getFanLevelName(fandomInfo.fanLevel)}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">😊</div>
              <div className="stat-info">
                <div className="stat-label">팬 만족도</div>
                <div className="stat-value">{fandomInfo.fanSatisfaction}%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <div className="stat-label">다음 레벨까지</div>
                <div className="stat-value">
                  {(fandomInfo.nextLevelFans - fandomInfo.fandom).toLocaleString()}명
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="tab-selector">
          <button
            className={`tab-btn ${activeTab === 'meeting' ? 'active' : ''}`}
            onClick={() => setActiveTab('meeting')}
          >
            🎤 팬 미팅
          </button>
          <button
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            🎉 이벤트
          </button>
          <button
            className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
            onClick={() => setActiveTab('shop')}
          >
            🛍️ 굿즈 샵
          </button>
        </div>

        {/* 팬 미팅 탭 */}
        {activeTab === 'meeting' && fandomInfo && (
          <div className="meeting-section">
            <h2 className="section-title">🎤 팬 미팅 개최</h2>
            <p className="section-description">
              팬들과 소통하여 팬덤을 늘리고 만족도를 높이세요! (7일에 1번 개최 가능)
            </p>

            {!fandomInfo.canHoldMeeting && (
              <div className="cooldown-warning">
                ⏰ 다음 팬 미팅까지: {Math.ceil((new Date(fandomInfo.lastMeeting).getTime() + 7 * 24 * 60 * 60 * 1000 - new Date().getTime()) / (1000 * 60 * 60 * 24))}일
              </div>
            )}

            <div className="meeting-types">
              <div className="meeting-card">
                <div className="meeting-header basic">
                  <h3>기본 팬 미팅</h3>
                  <span className="meeting-cost">500만원</span>
                </div>
                <div className="meeting-body">
                  <p className="meeting-description">소규모 팬 미팅으로 팬들과 가깝게 소통하세요</p>
                  <div className="meeting-rewards">
                    <div className="reward">👥 팬 +100</div>
                    <div className="reward">😊 만족도 +5</div>
                  </div>
                  <button
                    className="btn-meeting"
                    onClick={() => holdMeeting('basic')}
                    disabled={!fandomInfo.canHoldMeeting}
                  >
                    개최하기
                  </button>
                </div>
              </div>

              <div className="meeting-card">
                <div className="meeting-header premium">
                  <h3>프리미엄 팬 미팅</h3>
                  <span className="meeting-cost">1,500만원</span>
                </div>
                <div className="meeting-body">
                  <p className="meeting-description">중규모 팬 미팅으로 더 많은 팬들과 만나세요</p>
                  <div className="meeting-rewards">
                    <div className="reward">👥 팬 +500</div>
                    <div className="reward">😊 만족도 +15</div>
                  </div>
                  <button
                    className="btn-meeting"
                    onClick={() => holdMeeting('premium')}
                    disabled={!fandomInfo.canHoldMeeting}
                  >
                    개최하기
                  </button>
                </div>
              </div>

              <div className="meeting-card">
                <div className="meeting-header special">
                  <h3>스페셜 팬 미팅</h3>
                  <span className="meeting-cost">3,000만원</span>
                </div>
                <div className="meeting-body">
                  <p className="meeting-description">대규모 팬 미팅으로 최고의 경험을 선사하세요</p>
                  <div className="meeting-rewards">
                    <div className="reward">👥 팬 +1,500</div>
                    <div className="reward">😊 만족도 +30</div>
                  </div>
                  <button
                    className="btn-meeting"
                    onClick={() => holdMeeting('special')}
                    disabled={!fandomInfo.canHoldMeeting}
                  >
                    개최하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 이벤트 탭 */}
        {activeTab === 'events' && (
          <div className="events-section">
            <h2 className="section-title">🎉 팬덤 이벤트</h2>
            <p className="section-description">
              기간 한정 이벤트에 참여하여 특별한 보상을 받으세요!
            </p>

            <div className="events-grid">
              {events.length === 0 ? (
                <div className="no-events">현재 진행 중인 이벤트가 없습니다</div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className={`event-card ${event.hasParticipated ? 'participated' : ''}`}
                  >
                    <div className="event-header">
                      <h3>{event.event_name}</h3>
                      {event.hasParticipated && <span className="badge-participated">참여 완료</span>}
                    </div>
                    <p className="event-description">{event.description}</p>

                    <div className="event-requirements">
                      <div className="requirement">
                        <span className="req-label">필요 팬덤:</span>
                        <span className="req-value">{event.required_fandom.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="event-rewards">
                      <div className="reward">👥 팬 +{event.reward_fandom}</div>
                      <div className="reward">😊 만족도 +{event.reward_satisfaction}</div>
                    </div>

                    <div className="event-footer">
                      <span className="event-time">
                        ⏰ {event.daysRemaining}일 남음
                      </span>
                      {!event.hasParticipated && (
                        <button
                          className="btn-participate"
                          onClick={() => participateEvent(event.id, event.event_name)}
                        >
                          참여하기
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 굿즈 샵 탭 */}
        {activeTab === 'shop' && (
          <div className="shop-section">
            <h2 className="section-title">🛍️ 굿즈 샵</h2>
            <p className="section-description">
              팀 굿즈를 제작하여 판매하면 팬덤이 증가합니다!
            </p>

            <div className="merchandise-grid">
              {merchandise.map((item) => (
                <div
                  key={item.id}
                  className={`merchandise-card ${!item.canPurchase ? 'locked' : ''}`}
                >
                  <div className="merchandise-header">
                    <h3>{item.item_name}</h3>
                    <span className="merchandise-price">
                      {item.price.toLocaleString()}원
                    </span>
                  </div>

                  <p className="merchandise-description">{item.description}</p>

                  <div className="merchandise-info">
                    <div className="info-row">
                      <span className="info-label">필요 팬덤:</span>
                      <span className="info-value">{item.required_fandom.toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">팬덤 증가:</span>
                      <span className="info-value gain">+{item.fandom_gain}</span>
                    </div>
                  </div>

                  {item.canPurchase ? (
                    <button
                      className="btn-purchase"
                      onClick={() => {
                        setSelectedMerchandise(item);
                        setQuantity(1);
                      }}
                    >
                      구매하기
                    </button>
                  ) : (
                    <button className="btn-purchase" disabled>
                      🔒 팬덤 부족
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedMerchandise && (
        <div className="modal-overlay" onClick={() => setSelectedMerchandise(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🛍️ 굿즈 구매</h2>
              <button className="btn-close" onClick={() => setSelectedMerchandise(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="purchase-item-info">
                <h3>{selectedMerchandise.item_name}</h3>
                <p>{selectedMerchandise.description}</p>
              </div>

              <div className="purchase-details">
                <div className="detail-row">
                  <span>개당 가격:</span>
                  <span className="highlight">{selectedMerchandise.price.toLocaleString()}원</span>
                </div>
                <div className="detail-row">
                  <span>개당 팬덤 증가:</span>
                  <span className="highlight">+{selectedMerchandise.fandom_gain}</span>
                </div>
              </div>

              <div className="form-group">
                <label>수량</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="number-input"
                />
                <p className="input-hint">
                  총 비용: {(selectedMerchandise.price * quantity).toLocaleString()}원 |
                  총 팬덤 증가: +{selectedMerchandise.fandom_gain * quantity}
                </p>
              </div>

              <button className="btn-submit" onClick={purchaseMerchandise}>
                구매하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 팬덤 시스템 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tutorial-section">
                <h3>👥 팬덤이란?</h3>
                <p>팀을 응원하는 팬의 수입니다. 팬이 많을수록 다양한 혜택을 받을 수 있습니다!</p>
              </div>
              <div className="tutorial-section">
                <h3>😊 팬 만족도</h3>
                <p>• 팬들의 만족도를 나타냅니다 (0-100%)</p>
                <p>• 승리하면 증가, 패배하면 감소</p>
                <p>• 만족도가 높으면 팬덤 증가율이 상승합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>🎤 팬 미팅</h3>
                <p>• 7일에 1번 개최 가능</p>
                <p>• 3가지 규모 선택 (기본/프리미엄/스페셜)</p>
                <p>• 비용을 지불하고 팬덤과 만족도를 올릴 수 있습니다</p>
              </div>
              <div className="tutorial-section">
                <h3>🎉 팬덤 이벤트</h3>
                <p>• 기간 한정 이벤트에 참여하세요</p>
                <p>• 팬덤 조건을 만족하면 참여 가능</p>
                <p>• 이벤트당 1번만 참여 가능합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>🛍️ 굿즈 샵</h3>
                <p>• 팀 굿즈를 제작하여 판매</p>
                <p>• 일정 팬덤 수가 있어야 제작 가능</p>
                <p>• 굿즈 판매로 팬덤이 증가합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>💡 팁</h3>
                <p>• 경기에서 승리하면 팬덤이 자동으로 증가합니다</p>
                <p>• 연승하면 보너스 팬덤을 획득합니다</p>
                <p>• 팬덤 레벨이 높을수록 명성도 보너스를 받습니다</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fandom;
