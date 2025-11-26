import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
  const { showToast } = useToast();
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [roster, setRoster] = useState<RosterSlot[]>([
    { position: 'TOP', player: null, maxCost: 10 },
    { position: 'JUNGLE', player: null, maxCost: 10 },
    { position: 'MID', player: null, maxCost: 10 },
    { position: 'ADC', player: null, maxCost: 9 },
    { position: 'SUPPORT', player: null, maxCost: 9 },
    { position: 'SUB1', player: null, maxCost: 11 }, // Subs can have any cost
    { position: 'SUB2', player: null, maxCost: 11 },
  ]);
  const [totalCost, setTotalCost] = useState(0);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const MAX_TOTAL_COST = 58;

  const initialRosterState = [
    { position: 'TOP', player: null, maxCost: 10 },
    { position: 'JUNGLE', player: null, maxCost: 10 },
    { position: 'MID', player: null, maxCost: 10 },
    { position: 'ADC', player: null, maxCost: 9 },
    { position: 'SUPPORT', player: null, maxCost: 9 },
    { position: 'SUB1', player: null, maxCost: 11 },
    { position: 'SUB2', player: null, maxCost: 11 },
  ];

  const fetchPlayers = useCallback(async () => {
    if (!team) return;
    try {
      const response = await api.get('/players/my-cards');
      const playersData = response.data.map((p: any) => ({
        ...p,
        overall: Math.floor((p.mental + p.teamfight + p.cs_ability + p.vision + p.judgement + p.laning) / 6)
      }));
      setPlayers(playersData);
    } catch (error) {
      console.error('Failed to fetch players:', error);
      showToast('선수 목록을 불러오는데 실패했습니다.', 'error');
    }
  }, [team, showToast]);

  const fetchRoster = useCallback(async () => {
    if (!team) return;
    try {
      const { data } = await api.get('/roster');
      if (data.roster && data.players) {
        const positionMap: { [key: string]: string } = {
          top: 'TOP', jungle: 'JUNGLE', mid: 'MID', adc: 'ADC', support: 'SUPPORT',
          sub1: 'SUB1', sub2: 'SUB2'
        };

        const newRoster: RosterSlot[] = JSON.parse(JSON.stringify(initialRosterState));
        
        Object.entries(data.players).forEach(([pos, player]) => {
          const position = positionMap[pos];
          const slotIndex = newRoster.findIndex(s => s.position === position);
          if (slotIndex !== -1 && player) {
            newRoster[slotIndex].player = player as PlayerCard;
          }
        });

        setRoster(newRoster);
        setTotalCost(data.roster.total_cost || 0);
      }
    } catch (error) {
      console.error('Failed to fetch roster:', error);
      showToast('저장된 로스터를 불러오는데 실패했습니다.', 'error');
    }
  }, [team, showToast]);

  useEffect(() => {
    if (team) {
      setLoading(true);
      Promise.all([fetchPlayers(), fetchRoster()]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [team, fetchPlayers, fetchRoster]);

  const assignPlayer = (player: PlayerCard, slotIndex: number) => {
    const newRoster = [...roster];
    const slot = newRoster[slotIndex];

    const isSubSlot = slot.position.startsWith('SUB');

    if (!isSubSlot && player.position !== slot.position) {
      showToast(`이 선수는 ${slot.position} 포지션이 아닙니다.`, 'error');
      return;
    }
    
    if (player.cost > slot.maxCost) {
      showToast(`이 포지션의 최대 코스트는 ${slot.maxCost}입니다.`, 'error');
      return;
    }

    newRoster.forEach(s => {
      if (s.player?.id === player.id) s.player = null;
    });

    slot.player = player;
    setRoster(newRoster);

    const newTotal = newRoster.reduce((sum, s) => sum + (s.player?.cost || 0), 0);
    setTotalCost(newTotal);

    if (newTotal > MAX_TOTAL_COST) {
      showToast(`총 코스트가 ${MAX_TOTAL_COST}를 초과했습니다!`, 'error');
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
      showToast(`총 코스트가 ${MAX_TOTAL_COST}을 초과하여 저장할 수 없습니다.`, 'error');
      return;
    }

    const mainRoster = roster.slice(0, 5);
    if (mainRoster.some(slot => slot.player === null)) {
      showToast('모든 주전 포지션에 선수를 배치해주세요.', 'error');
      return;
    }

    try {
      await api.post('/roster/save', {
        top_player_id: roster.find(s => s.position === 'TOP')?.player?.id,
        jungle_player_id: roster.find(s => s.position === 'JUNGLE')?.player?.id,
        mid_player_id: roster.find(s => s.position === 'MID')?.player?.id,
        adc_player_id: roster.find(s => s.position === 'ADC')?.player?.id,
        support_player_id: roster.find(s => s.position === 'SUPPORT')?.player?.id,
        sub1_player_id: roster.find(s => s.position === 'SUB1')?.player?.id || null,
        sub2_player_id: roster.find(s => s.position === 'SUB2')?.player?.id || null,
      });
      showToast('로스터가 저장되었습니다.', 'success');
      fetchRoster();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '로스터 저장에 실패했습니다.';
      showToast(errorMessage, 'error');
    }
  };

  const getConditionColor = (condition: string) => ({
    'RED': '#ef4444', 'ORANGE': '#f59e0b', 'YELLOW': '#eab308',
    'BLUE': '#3b82f6', 'PURPLE': '#8b5cf6'
  }[condition] || '#6b7280');

  const filteredPlayers = players.filter(player => 
    (selectedPosition === 'ALL' || player.position === selectedPosition) &&
    (!searchTerm || player.card_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mainRosterSlots = roster.slice(0, 5);
  const subRosterSlots = roster.slice(5);

  const renderRosterSlot = (slot: RosterSlot, index: number) => (
    <div key={slot.position} className="roster-slot">
      <div className="slot-header">
        <span className="slot-position">{slot.position.startsWith('SUB') ? '후보' : slot.position}</span>
        <span className="slot-cost">
          {slot.position.startsWith('SUB') ? `최대 ${slot.maxCost} 코스트` : `최대 ${slot.maxCost} 코스트`}
        </span>
      </div>
      {slot.player ? (
        <div className="assigned-player">
          <div className="player-info">
            <div className="player-name">{slot.player.card_name}</div>
            <div className="player-stats">
              <span className="player-level">Lv.{slot.player.level}</span>
              <span className="player-condition" style={{ color: getConditionColor(slot.player.condition) }}>{slot.player.condition}</span>
              <span className="player-cost">코스트: {slot.player.cost}</span>
            </div>
            <div className="player-overall"><span className="overall-label">종합</span><span className="overall-value">{slot.player.overall}</span></div>
          </div>
          <button className="remove-btn" onClick={() => removePlayer(index)}>제거</button>
        </div>
      ) : <div className="empty-slot">선수를 배치해주세요</div>}
    </div>
  );

  if (loading) return <div className="roster-loading"><div className="spinner"></div><p>로딩 중...</p></div>;

  return (
    <div className="roster">
      <div className="roster-container">
        <div className="roster-header">
          <h1>로스터 편성</h1>
          <div className="cost-display">
            <span className="cost-label">총 코스트</span>
            <span className={`cost-value ${totalCost > MAX_TOTAL_COST ? 'over' : ''}`}>{totalCost} / {MAX_TOTAL_COST}</span>
          </div>
        </div>

        <div className="main-roster">
          <h2 className="section-title">선발 라인업</h2>
          <div className="roster-slots">{mainRosterSlots.map((s, i) => renderRosterSlot(s, i))}</div>
        </div>

        <div className="sub-roster">
            <h2 className="section-title">후보 선수</h2>
            <div className="roster-slots">{subRosterSlots.map((s, i) => renderRosterSlot(s, i + 5))}</div>
        </div>

        <div className="roster-actions">
            <button className="save-roster-btn" onClick={saveRoster} disabled={totalCost > MAX_TOTAL_COST || mainRosterSlots.some(s => !s.player)}>로스터 저장</button>
        </div>
        
        <div className="player-pool">
          <h2 className="section-title">보유 선수</h2>
          <div className="player-filters">
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="position-filter">
              <option value="ALL">모든 포지션</option>
              <option value="TOP">TOP</option><option value="JUNGLE">JUNGLE</option><option value="MID">MID</option>
              <option value="ADC">ADC</option><option value="SUPPORT">SUPPORT</option>
            </select>
            <input type="text" placeholder="선수 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
          </div>
          <div className="player-grid">
            {filteredPlayers.map(player => {
              const isAssigned = roster.some(slot => slot.player?.id === player.id);
              return (
                <div key={player.id} className={`player-card ${isAssigned ? 'assigned' : ''}`}>
                  <div className="card-header"><span className="card-position">{player.position}</span><span className="card-cost">코스트 {player.cost}</span></div>
                  <div className="card-body">
                    <div className="card-name">{player.card_name}</div>
                    <div className="card-level">Lv.{player.level}</div>
                    <div className="card-condition" style={{ backgroundColor: getConditionColor(player.condition) }}>{player.condition}</div>
                    <div className="card-stats">
                      <div className="stat-row"><span className="stat-label">MET</span><span className="stat-value">{player.mental}</span></div>
                      <div className="stat-row"><span className="stat-label">TF</span><span className="stat-value">{player.teamfight}</span></div>
                      <div className="stat-row"><span className="stat-label">CS</span><span className="stat-value">{player.cs_ability}</span></div>
                      <div className="stat-row"><span className="stat-label">VIS</span><span className="stat-value">{player.vision}</span></div>
                      <div className="stat-row"><span className="stat-label">JUD</span><span className="stat-value">{player.judgement}</span></div>
                      <div className="stat-row"><span className="stat-label">LIN</span><span className="stat-value">{player.laning}</span></div>
                    </div>
                    <div className="card-overall"><span>종합</span><span className="overall-big">{player.overall}</span></div>
                    {player.traits && player.traits.length > 0 && (
                      <div className="card-traits">{player.traits.map((trait, i) => <span key={i} className="trait-badge">{trait}</span>)}</div>
                    )}
                  </div>
                  <div className="card-actions">
                    {roster.map((slot, index) => {
                      const isMainSlot = !slot.position.startsWith('SUB');
                      const canAssign = isMainSlot ? player.position === slot.position : true;
                      if (canAssign) {
                        return (
                          <button key={slot.position} className="assign-btn" onClick={() => assignPlayer(player, index)} disabled={isAssigned || player.cost > slot.maxCost}>
                            {slot.position.startsWith('SUB') ? '후보 지정' : `${slot.position} 지정`}
                          </button>
                        );
                      }
                      return null;
                    })}
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