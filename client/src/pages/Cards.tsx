import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Cards.css';

interface PlayerCard {
  id: number;
  card_name: string;
  position: string;
  power: number;
  rarity: string;
  mental: number;
  team_fight: number;
  cs_ability: number;
  vision: number;
  judgment: number;
  laning: number;
  level: number;
  current_team: string | null;
  in_roster: boolean;
}

const Cards: React.FC = () => {
  const [cards, setCards] = useState<PlayerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    position: 'ALL',
    rarity: 'ALL',
    status: 'ALL',
    search: '',
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.get('/roster/my-cards');
      setCards(response.data.cards || []);
    } catch (error) {
      console.error('카드 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter((card) => {
    if (filter.position !== 'ALL' && card.position !== filter.position) return false;
    if (filter.rarity !== 'ALL' && card.rarity !== filter.rarity) return false;
    if (filter.status === 'ROSTER' && !card.in_roster) return false;
    if (filter.status === 'BENCH' && card.in_roster) return false;
    if (filter.search && !card.card_name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      LEGEND: 'var(--color-legend)',
      EPIC: 'var(--color-epic)',
      RARE: 'var(--color-rare)',
      NORMAL: 'var(--color-normal)',
    };
    return colors[rarity] || 'var(--color-text-muted)';
  };

  if (loading) {
    return (
      <div className="cards-page">
        <div className="loading-spinner">데이터 로딩중...</div>
      </div>
    );
  }

  return (
    <div className="cards-page">
      <div className="page-header">
        <h1 className="page-title">선수 카드 컬렉션</h1>
        <div className="page-stats">
          <div className="stat-item">
            <span className="stat-label">총 보유</span>
            <span className="stat-value">{cards.length}장</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">로스터</span>
            <span className="stat-value">{cards.filter(c => c.in_roster).length}/5</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">벤치</span>
            <span className="stat-value">{cards.filter(c => !c.in_roster).length}장</span>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label className="filter-label">포지션</label>
          <select
            className="filter-select"
            value={filter.position}
            onChange={(e) => setFilter({ ...filter, position: e.target.value })}
          >
            <option value="ALL">전체</option>
            <option value="TOP">탑</option>
            <option value="JUNGLE">정글</option>
            <option value="MID">미드</option>
            <option value="ADC">원딜</option>
            <option value="SUPPORT">서포터</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">등급</label>
          <select
            className="filter-select"
            value={filter.rarity}
            onChange={(e) => setFilter({ ...filter, rarity: e.target.value })}
          >
            <option value="ALL">전체</option>
            <option value="LEGEND">레전드</option>
            <option value="EPIC">에픽</option>
            <option value="RARE">레어</option>
            <option value="NORMAL">일반</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">상태</label>
          <select
            className="filter-select"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="ALL">전체</option>
            <option value="ROSTER">로스터</option>
            <option value="BENCH">벤치</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <label className="filter-label">검색</label>
          <input
            type="text"
            className="filter-input"
            placeholder="선수 이름 검색..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
        </div>
      </div>

      <div className="cards-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>선수명</th>
              <th>포지션</th>
              <th>등급</th>
              <th>레벨</th>
              <th>파워</th>
              <th>멘탈</th>
              <th>한타</th>
              <th>CS</th>
              <th>시야</th>
              <th>판단력</th>
              <th>라인전</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filteredCards.length === 0 ? (
              <tr>
                <td colSpan={12} className="no-data">보유한 카드가 없습니다</td>
              </tr>
            ) : (
              filteredCards.map((card) => (
                <tr key={card.id} className="card-row">
                  <td className="player-name-cell">
                    <span className="player-name">{card.card_name}</span>
                  </td>
                  <td>
                    <span className="position-badge">{card.position}</span>
                  </td>
                  <td>
                    <span
                      className="rarity-badge"
                      style={{ color: getRarityColor(card.rarity) }}
                    >
                      {card.rarity}
                    </span>
                  </td>
                  <td>Lv.{card.level}</td>
                  <td className="stat-cell">{card.power}</td>
                  <td className="stat-cell">{card.mental}</td>
                  <td className="stat-cell">{card.team_fight}</td>
                  <td className="stat-cell">{card.cs_ability}</td>
                  <td className="stat-cell">{card.vision}</td>
                  <td className="stat-cell">{card.judgment}</td>
                  <td className="stat-cell">{card.laning}</td>
                  <td>
                    {card.in_roster ? (
                      <span className="badge badge-success">로스터</span>
                    ) : (
                      <span className="badge">벤치</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="cards-summary">
        <p className="summary-text">
          표시 중: {filteredCards.length}장 / 전체: {cards.length}장
        </p>
      </div>
    </div>
  );
};

export default Cards;
