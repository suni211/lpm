import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SlotMachine from '../components/SlotMachine';
import './Gacha.css';

interface CardPack {
  type: string;
  name: string;
  price: number;
  description: string;
  icon: string;
}

interface GachaResult {
  card_type: 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT';
  card: any;
  is_duplicate: boolean;
  experience_gained?: number;
  user_card_id?: string;
}

const Gacha: React.FC = () => {
  const { team, refreshAuth } = useAuth();
  const [packs, setPacks] = useState<CardPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const response = await api.get('/gacha/packs');
      setPacks(response.data.packs);
    } catch (error) {
      console.error('카드팩 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawCard = async (packType: string, price: number) => {
    if (!team) return;

    if (team.balance < price) {
      alert('잔액이 부족합니다!');
      return;
    }

    if (drawing) return;

    try {
      setDrawing(true);
      setShowResult(false);
      setResult(null);

      const response = await api.post('/gacha/draw', { packType });

      // 슬롯머신 애니메이션 대기 (3초)
      setTimeout(() => {
        setResult(response.data);
        setShowResult(true);
        setDrawing(false);

        // 잔액 갱신
        refreshAuth();
      }, 3000);
    } catch (error: any) {
      setDrawing(false);
      alert(error.response?.data?.error || '카드 뽑기에 실패했습니다');
    }
  };

  const getCardTypeLabel = (type: string) => {
    switch (type) {
      case 'PLAYER': return '선수 카드';
      case 'COACH': return '감독 카드';
      case 'TACTIC': return '작전 카드';
      case 'SUPPORT': return '서포트 카드';
      default: return '카드';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'NORMAL': return '#999';
      case 'RARE': return '#4A9EFF';
      case 'EPIC': return '#A335EE';
      case 'LEGEND': return '#FF8000';
      default: return '#fff';
    }
  };

  if (loading) {
    return (
      <div className="gacha-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="gacha">
      <div className="gacha-container">
        <div className="gacha-header">
          <h1 className="gacha-title">🎴 카드 뽑기</h1>
          <p className="gacha-subtitle">
            당신의 팀을 강화할 최고의 선수를 찾아보세요!
          </p>
          {team && (
            <div className="balance-display">
              <span className="balance-label">보유 자금:</span>
              <span className="balance-value">{team.balance.toLocaleString()}원</span>
            </div>
          )}
        </div>

        {/* 카드팩 선택 */}
        {!drawing && !showResult && (
          <div className="packs-grid">
            {packs.map((pack) => (
              <div key={pack.type} className="pack-card">
                <div className="pack-icon">{pack.icon}</div>
                <h3 className="pack-name">{pack.name}</h3>
                <p className="pack-description">{pack.description}</p>
                <div className="pack-price">{pack.price.toLocaleString()}원</div>
                <button
                  className="btn-draw"
                  onClick={() => handleDrawCard(pack.type, pack.price)}
                  disabled={!!(team && team.balance < pack.price)}
                >
                  {team && team.balance < pack.price ? '잔액 부족' : '뽑기'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 슬롯머신 애니메이션 */}
        {drawing && (
          <div className="slot-machine-container">
            <SlotMachine />
            <p className="drawing-text">카드를 뽑는 중...</p>
          </div>
        )}

        {/* 결과 표시 */}
        {showResult && result && (
          <div className="result-container">
            <div className="result-card">
              <div className="result-header">
                {result.is_duplicate ? (
                  <>
                    <h2 className="result-title duplicate">중복 카드!</h2>
                    <p className="result-subtitle">
                      경험치 {result.experience_gained?.toLocaleString()}를 획득했습니다
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="result-title new">새로운 카드!</h2>
                    <p className="result-subtitle">{getCardTypeLabel(result.card_type)}</p>
                  </>
                )}
              </div>

              <div className="card-display">
                {result.card.card_image ? (
                  <img
                    src={result.card.card_image}
                    alt={result.card.card_name || result.card.coach_name}
                    className="card-image"
                  />
                ) : (
                  <div className="card-placeholder">
                    {result.card_type === 'PLAYER' && '👤'}
                    {result.card_type === 'COACH' && '🎓'}
                    {result.card_type === 'TACTIC' && '📋'}
                    {result.card_type === 'SUPPORT' && '🛡️'}
                  </div>
                )}

                <div className="card-info">
                  <h3
                    className="card-name"
                    style={{ color: getRarityColor(result.card.rarity) }}
                  >
                    {result.card.card_name ||
                     result.card.coach_name ||
                     result.card.tactic_name ||
                     result.card.support_name}
                  </h3>

                  {result.card_type === 'PLAYER' && (
                    <>
                      <div className="card-detail">
                        <span className="detail-label">포지션:</span>
                        <span className="detail-value">{result.card.position}</span>
                      </div>
                      <div className="card-detail">
                        <span className="detail-label">코스트:</span>
                        <span className="detail-value">{result.card.cost}</span>
                      </div>
                      <div className="card-detail">
                        <span className="detail-label">파워:</span>
                        <span className="detail-value power">{result.card.power}</span>
                      </div>
                      <div className="stats-grid">
                        <div className="stat">멘탈: {result.card.mental}</div>
                        <div className="stat">한타: {result.card.team_fight}</div>
                        <div className="stat">CS: {result.card.cs_ability}</div>
                        <div className="stat">시야: {result.card.vision}</div>
                        <div className="stat">판단: {result.card.judgment}</div>
                        <div className="stat">라인: {result.card.laning}</div>
                      </div>
                    </>
                  )}

                  {result.card_type === 'COACH' && (
                    <>
                      <div className="card-detail">
                        <span className="detail-label">파워:</span>
                        <span className="detail-value power">{result.card.power}</span>
                      </div>
                      <div className="stats-grid">
                        <div className="stat">지휘: {result.card.command}</div>
                        <div className="stat">밴픽: {result.card.ban_pick}</div>
                        <div className="stat">메타: {result.card.meta}</div>
                        <div className="stat">냉정: {result.card.cold}</div>
                        <div className="stat">따뜻: {result.card.warm}</div>
                      </div>
                    </>
                  )}

                  {(result.card_type === 'TACTIC' || result.card_type === 'SUPPORT') && (
                    <div className="card-effect">
                      <p>{result.card.effect_description}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                className="btn-continue"
                onClick={() => {
                  setShowResult(false);
                  setResult(null);
                }}
              >
                계속 뽑기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gacha;
