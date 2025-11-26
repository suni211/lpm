import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './Roster.css';

interface PlayerCard {
  id: number;
  card_name: string;
  position: string;
  cost: number;
  condition: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'PURPLE';
  level: number;
  mental: number;
  teamfight: number;
  cs_ability: number;
  vision: number;
  judgement: number;
  laning: number;
  overall: number;
  in_roster: boolean;
  traits?: string[];
}

interface RosterSlot {
  position: string;
  player: PlayerCard | null;
  maxCost: number;
}

const Roster: React.FC = () => {
  const { team } = useAuth();
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [roster, setRoster] = useState<RosterSlot[]>([
    { position: 'TOP', player: null, maxCost: 10 },
    { position: 'JUNGLE', player: null, maxCost: 10 },
    { position: 'MID', player: null, maxCost: 10 },
    { position: 'ADC', player: null, maxCost: 9 },
    { position: 'SUPPORT', player: null, maxCost: 9 }
  ]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const MAX_TOTAL_COST = 48;

  useEffect(() => {
    fetchPlayers();
  }, [team]);

  const fetchPlayers = async () => {
    if (!team) return;

    setLoading(true);
    try {
      const response = await api.get('/players/my-cards');
      const playersData = response.data.map((p: any) => ({
        ...p,
        overall: Math.floor((p.mental + p.teamfight + p.cs_ability + p.vision + p.judgement + p.laning) / 6)
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignPlayer = (player: PlayerCard, slotIndex: number) => {
    const newRoster = [...roster];
    const slot = newRoster[slotIndex];

    // 코스트 체크
    if (player.cost > slot.maxCost) {
      alert(`이 포지션의 최대 코스트는 ${slot.maxCost}입니다.`);
      return;
    }

    // 이미 다른 포지션에 배치된 경우 제거
    newRoster.forEach(s => {
      if (s.player?.id === player.id) {
        s.player = null;
      }
    });

    // 새 포지션에 배치
    slot.player = player;
    setRoster(newRoster);

    // 총 코스트 계산
    const newTotal = newRoster.reduce((sum, s) => sum + (s.player?.cost || 0), 0);
    setTotalCost(newTotal);

    if (newTotal > MAX_TOTAL_COST) {
      alert(`총 코스트가 ${MAX_TOTAL_COST}를 초과했습니다!`);
    }
  };

  const removePlayer = (slotIndex: number) => {
    const newRoster = [...roster];
    newRoster[slotIndex].player = null;
    setRoster(newRoster);

    const newTotal = newRoster.reduce((sum, s) => sum + (s.player?.cost || 0), 0);
    setTotalCost(newTotal);
  };

  const saveRoster = async () => {
    if (totalCost > MAX_TOTAL_COST) {
      alert('총 코스트가 48을 초과하여 저장할 수 없습니다.');
      return;
    }

    const hasAllPositions = roster.every(slot => slot.player !== null);
    if (!hasAllPositions) {
      alert('모든 포지션에 선수를 배치해주세요.');
      return;
    }

    try {
      await api.post('/roster/save', {
        top_player_id: roster[0].player?.id,
        jungle_player_id: roster[1].player?.id,
        mid_player_id: roster[2].player?.id,
        adc_player_id: roster[3].player?.id,
        support_player_id: roster[4].player?.id,
        total_cost: totalCost
      });
      alert('로스터가 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save roster:', error);
      alert('로스터 저장에 실패했습니다.');
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'RED': return '#ef4444';
      case 'ORANGE': return '#f59e0b';
      case 'YELLOW': return '#eab308';
      case 'BLUE': return '#3b82f6';
      case 'PURPLE': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const filteredPlayers = players.filter(player => {
    if (selectedPosition !== 'ALL' && player.position !== selectedPosition) return false;
    if (searchTerm && !player.card_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="roster-loading">
        <div className="spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="roster">
      <div className="roster-container">
        {/* 헤더 */}
        <div className="roster-header">
          <h1>로스터 편성</h1>
          <div className="cost-display">
            <span className="cost-label">총 코스트</span>
            <span className={`cost-value ${totalCost > MAX_TOTAL_COST ? 'over' : ''}`}>
              {totalCost} / {MAX_TOTAL_COST}
            </span>
          </div>
        </div>

        {/* 메인 로스터 */}
        <div className="main-roster">
          <h2 className="section-title">선발 라인업</h2>
          <div className="roster-slots">
            {roster.map((slot, index) => (
              <div key={slot.position} className="roster-slot">
                <div className="slot-header">
                  <span className="slot-position">{slot.position}</span>
                  <span className="slot-cost">최대 {slot.maxCost} 코스트</span>
                </div>
                {slot.player ? (
                  <div className="assigned-player">
                    <div className="player-info">
                      <div className="player-name">{slot.player.card_name}</div>
                      <div className="player-stats">
                        <span className="player-level">Lv.{slot.player.level}</span>
                        <span
                          className="player-condition"
                          style={{ color: getConditionColor(slot.player.condition) }}
                        >
                          {slot.player.condition}
                        </span>
                        <span className="player-cost">코스트: {slot.player.cost}</span>
                      </div>
                      <div className="player-overall">
                        <span className="overall-label">종합</span>
                        <span className="overall-value">{slot.player.overall}</span>
                      </div>
                    </div>
                    <button
                      className="remove-btn"
                      onClick={() => removePlayer(index)}
                    >
                      제거
                    </button>
                  </div>
                ) : (
                  <div className="empty-slot">
                    선수를 배치해주세요
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            className="save-roster-btn"
            onClick={saveRoster}
            disabled={totalCost > MAX_TOTAL_COST}
          >
            로스터 저장
          </button>
        </div>

        {/* 선수 목록 */}
        <div className="player-pool">
          <h2 className="section-title">보유 선수</h2>

          {/* 필터 */}
          <div className="player-filters">
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="position-filter"
            >
              <option value="ALL">모든 포지션</option>
              <option value="TOP">TOP</option>
              <option value="JUNGLE">JUNGLE</option>
              <option value="MID">MID</option>
              <option value="ADC">ADC</option>
              <option value="SUPPORT">SUPPORT</option>
            </select>
            <input
              type="text"
              placeholder="선수 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* 선수 카드 그리드 */}
          <div className="player-grid">
            {filteredPlayers.map(player => {
              const isAssigned = roster.some(slot => slot.player?.id === player.id);
              return (
                <div
                  key={player.id}
                  className={`player-card ${isAssigned ? 'assigned' : ''}`}
                >
                  <div className="card-header">
                    <span className="card-position">{player.position}</span>
                    <span className="card-cost">코스트 {player.cost}</span>
                  </div>

                  <div className="card-body">
                    <div className="card-name">{player.card_name}</div>
                    <div className="card-level">Lv.{player.level}</div>

                    <div
                      className="card-condition"
                      style={{ backgroundColor: getConditionColor(player.condition) }}
                    >
                      {player.condition}
                    </div>

                    <div className="card-stats">
                      <div className="stat-row">
                        <span className="stat-label">MET</span>
                        <span className="stat-value">{player.mental}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">TF</span>
                        <span className="stat-value">{player.teamfight}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">CS</span>
                        <span className="stat-value">{player.cs_ability}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">VIS</span>
                        <span className="stat-value">{player.vision}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">JUD</span>
                        <span className="stat-value">{player.judgement}</span>
                      </div>
                      <div className="stat-row">
                        <span className="stat-label">LIN</span>
                        <span className="stat-value">{player.laning}</span>
                      </div>
                    </div>

                    <div className="card-overall">
                      <span>종합</span>
                      <span className="overall-big">{player.overall}</span>
                    </div>

                    {player.traits && player.traits.length > 0 && (
                      <div className="card-traits">
                        {player.traits.map((trait, i) => (
                          <span key={i} className="trait-badge">{trait}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    {roster.map((slot, index) => (
                      slot.position === player.position && (
                        <button
                          key={index}
                          className="assign-btn"
                          onClick={() => assignPlayer(player, index)}
                          disabled={isAssigned || player.cost > slot.maxCost}
                        >
                          {isAssigned ? '배치됨' : '배치'}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Roster;