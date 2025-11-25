import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Roster.css';

const MAX_COST = 48;

const Roster: React.FC = () => {
  const [roster, setRoster] = useState<any>(null);
  const [players, setPlayers] = useState<any>({});
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoster();
  }, []);

  const fetchRoster = async () => {
    try {
      const response = await api.get('/roster');
      setRoster(response.data.roster);
      setPlayers(response.data.players);
    } catch (error) {
      console.error('로스터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePlayers = async (position: string) => {
    try {
      const response = await api.get(`/roster/available/${position}`);
      setAvailablePlayers(response.data.players);
      setSelectedPosition(position);
    } catch (error) {
      console.error('선수 목록 조회 실패:', error);
    }
  };

  const assignPlayer = async (userCardId: string) => {
    if (!selectedPosition) return;

    try {
      await api.post('/roster/assign', {
        position: selectedPosition,
        userCardId,
      });
      await fetchRoster();
      setSelectedPosition(null);
      setAvailablePlayers([]);
      alert('선수가 배치되었습니다!');
    } catch (error: any) {
      alert(error.response?.data?.error || '선수 배치에 실패했습니다');
    }
  };

  const removePlayer = async (position: string) => {
    if (!confirm('이 선수를 로스터에서 제거하시겠습니까?')) return;

    try {
      await api.post('/roster/remove', { position });
      await fetchRoster();
      alert('선수가 제거되었습니다');
    } catch (error: any) {
      alert(error.response?.data?.error || '선수 제거에 실패했습니다');
    }
  };

  if (loading) {
    return <div className="roster-loading"><div className="spinner"></div></div>;
  }

  const positions = [
    { key: 'top', label: 'TOP' },
    { key: 'jungle', label: 'JUNGLE' },
    { key: 'mid', label: 'MID' },
    { key: 'adc', label: 'ADC' },
    { key: 'support', label: 'SUPPORT' },
  ];

  return (
    <div className="roster">
      <div className="roster-container">
        <div className="roster-header">
          <h1 className="roster-title">⚙️ 로스터 편성</h1>
          <div className="cost-display">
            <span className="cost-label">총 코스트:</span>
            <span className={`cost-value ${roster.total_cost > MAX_COST ? 'over' : ''}`}>
              {roster.total_cost} / {MAX_COST}
            </span>
          </div>
        </div>

        <div className="roster-grid">
          {positions.map((pos) => {
            const player = players[pos.key];
            return (
              <div key={pos.key} className="position-card">
                <div className="position-header">
                  <h3>{pos.label}</h3>
                </div>
                {player ? (
                  <div className="player-info">
                    <div className="player-name">{player.card_name}</div>
                    <div className="player-stats">
                      <span className="player-cost">코스트: {player.cost}</span>
                      <span className="player-power">파워: {player.power}</span>
                    </div>
                    <div className="player-actions">
                      <button
                        className="btn-change"
                        onClick={() => fetchAvailablePlayers(pos.key)}
                      >
                        교체
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => removePlayer(pos.key)}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="player-empty">
                    <div className="empty-text">선수 없음</div>
                    <button
                      className="btn-add"
                      onClick={() => fetchAvailablePlayers(pos.key)}
                    >
                      추가
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedPosition && (
          <div className="player-selector-modal">
            <div className="modal-content">
              <div className="modal-header">
                <h2>{selectedPosition.toUpperCase()} 선수 선택</h2>
                <button
                  className="btn-close"
                  onClick={() => {
                    setSelectedPosition(null);
                    setAvailablePlayers([]);
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="player-list">
                {availablePlayers.length === 0 ? (
                  <div className="no-players">사용 가능한 선수가 없습니다</div>
                ) : (
                  availablePlayers.map((p) => (
                    <div key={p.id} className="player-item">
                      <div className="player-item-info">
                        <div className="player-item-name">{p.card_name}</div>
                        <div className="player-item-stats">
                          코스트: {p.cost} | 파워: {p.power}
                        </div>
                      </div>
                      <button
                        className="btn-select"
                        onClick={() => assignPlayer(p.id)}
                      >
                        선택
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roster;
