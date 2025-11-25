import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Sponsors.css';

interface Sponsor {
  id: string;
  sponsor_name: string;
  sponsor_type: string;
  tier_level: number;
  required_tier: number;
  required_reputation: number;
  monthly_payment: number;
  bonus_condition: string;
  bonus_amount: number;
  logo_url: string;
  is_contracted: boolean;
}

interface CurrentSponsor {
  id: string;
  sponsor_name: string;
  sponsor_type: string;
  monthly_payment: number;
  bonus_condition: string;
  bonus_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  bonus_received: number;
}

const Sponsors: React.FC = () => {
  const { team, refreshAuth } = useAuth();
  const [availableSponsors, setAvailableSponsors] = useState<Sponsor[]>([]);
  const [currentSponsors, setCurrentSponsors] = useState<CurrentSponsor[]>([]);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [contractDuration, setContractDuration] = useState<number>(3);

  useEffect(() => {
    fetchAvailableSponsors();
    fetchCurrentSponsors();
  }, []);

  const fetchAvailableSponsors = async () => {
    try {
      const response = await api.get('/sponsors/available');
      setAvailableSponsors(response.data.sponsors);
    } catch (error) {
      console.error('스폰서 조회 실패:', error);
    }
  };

  const fetchCurrentSponsors = async () => {
    try {
      const response = await api.get('/sponsors/current');
      setCurrentSponsors(response.data.sponsors);
    } catch (error) {
      console.error('계약 스폰서 조회 실패:', error);
    }
  };

  const openContractModal = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setShowContractModal(true);
  };

  const handleContract = async () => {
    if (!selectedSponsor) return;

    try {
      const response = await api.post(`/sponsors/contract/${selectedSponsor.id}`, {
        durationMonths: contractDuration,
      });

      alert(`✅ ${response.data.message}\n💰 월 ${response.data.monthlyPayment.toLocaleString()}원`);

      setShowContractModal(false);
      setSelectedSponsor(null);
      await fetchAvailableSponsors();
      await fetchCurrentSponsors();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '계약에 실패했습니다');
    }
  };

  const cancelContract = async (contractId: string, sponsorName: string) => {
    if (!confirm(`${sponsorName}와의 계약을 해지하시겠습니까?\n계약을 해지하면 남은 기간의 금액을 받을 수 없습니다.`)) {
      return;
    }

    try {
      await api.post(`/sponsors/cancel/${contractId}`);
      alert('계약이 해지되었습니다');

      await fetchAvailableSponsors();
      await fetchCurrentSponsors();
    } catch (error: any) {
      alert(error.response?.data?.error || '계약 해지에 실패했습니다');
    }
  };

  const getTierBadgeColor = (tierLevel: number) => {
    if (tierLevel >= 7) return '#ff6b6b';
    if (tierLevel >= 5) return '#a29bfe';
    if (tierLevel >= 3) return '#74b9ff';
    return '#95a5a6';
  };

  const getTierName = (tierLevel: number) => {
    const tiers = ['', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
    return tiers[tierLevel] || 'BRONZE';
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      '게임 하드웨어': '💻',
      '에너지 드링크': '⚡',
      '의류': '👕',
      '통신사': '📱',
      '금융': '🏦',
      '자동차': '🚗',
      '스트리밍': '📺',
    };
    return icons[type] || '🏢';
  };

  const getRemainingDays = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="sponsors">
      <div className="sponsors-container">
        <div className="sponsors-header">
          <h1 className="sponsors-title">🏢 스폰서</h1>
          <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>
            ❓ 튜토리얼
          </button>
        </div>

        {team && (
          <div className="team-info-card">
            <div className="info-item">
              <span className="info-label">현재 티어</span>
              <span className="info-value">{team.current_tier}</span>
            </div>
            <div className="info-item">
              <span className="info-label">명성도</span>
              <span className="info-value">{team.reputation}</span>
            </div>
            <div className="info-item">
              <span className="info-label">계약 중인 스폰서</span>
              <span className="info-value">{currentSponsors.length}개</span>
            </div>
          </div>
        )}

        {currentSponsors.length > 0 && (
          <div className="current-sponsors-section">
            <h2 className="section-title">📋 현재 계약 중인 스폰서</h2>
            <div className="current-sponsors-grid">
              {currentSponsors.map((sponsor) => (
                <div key={sponsor.id} className="current-sponsor-card">
                  <div className="sponsor-card-header active">
                    <span className="sponsor-type">
                      {getTypeIcon(sponsor.sponsor_type)} {sponsor.sponsor_type}
                    </span>
                    <span className="contract-badge">계약 중</span>
                  </div>

                  <div className="sponsor-card-body">
                    <h3 className="sponsor-name">{sponsor.sponsor_name}</h3>

                    <div className="contract-info">
                      <div className="info-row">
                        <span className="label">월 수익</span>
                        <span className="value money">
                          {sponsor.monthly_payment.toLocaleString()}원
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">보너스 조건</span>
                        <span className="value">{sponsor.bonus_condition}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">보너스 금액</span>
                        <span className="value money">
                          {sponsor.bonus_amount.toLocaleString()}원
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">획득한 보너스</span>
                        <span className="value earned">
                          {sponsor.bonus_received.toLocaleString()}원
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">남은 기간</span>
                        <span className="value time">
                          {getRemainingDays(sponsor.contract_end_date)}일
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn-cancel"
                      onClick={() => cancelContract(sponsor.id, sponsor.sponsor_name)}
                    >
                      계약 해지
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="available-sponsors-section">
          <h2 className="section-title">🔍 계약 가능한 스폰서</h2>
          <div className="sponsors-grid">
            {availableSponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className={`sponsor-card ${sponsor.is_contracted ? 'contracted' : ''} ${
                  team && (getTierLevel(team.current_tier) < sponsor.required_tier || team.reputation < sponsor.required_reputation)
                    ? 'locked'
                    : ''
                }`}
              >
                <div className="sponsor-card-header">
                  <span className="sponsor-type">
                    {getTypeIcon(sponsor.sponsor_type)} {sponsor.sponsor_type}
                  </span>
                  <span
                    className="tier-badge"
                    style={{ backgroundColor: getTierBadgeColor(sponsor.tier_level) }}
                  >
                    {getTierName(sponsor.required_tier)}+
                  </span>
                </div>

                <div className="sponsor-card-body">
                  <h3 className="sponsor-name">{sponsor.sponsor_name}</h3>

                  <div className="sponsor-details">
                    <div className="detail-item">
                      <span className="detail-icon">💰</span>
                      <div className="detail-info">
                        <span className="detail-label">월 수익</span>
                        <span className="detail-value">
                          {sponsor.monthly_payment.toLocaleString()}원
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">🎯</span>
                      <div className="detail-info">
                        <span className="detail-label">보너스 조건</span>
                        <span className="detail-value">{sponsor.bonus_condition}</span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="detail-icon">🎁</span>
                      <div className="detail-info">
                        <span className="detail-label">보너스 금액</span>
                        <span className="detail-value">
                          {sponsor.bonus_amount.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sponsor-requirements">
                    <div className="requirement-item">
                      <span className="requirement-label">필요 티어</span>
                      <span className="requirement-value">
                        {getTierName(sponsor.required_tier)}
                      </span>
                    </div>
                    <div className="requirement-item">
                      <span className="requirement-label">필요 명성</span>
                      <span className="requirement-value">{sponsor.required_reputation}</span>
                    </div>
                  </div>

                  {sponsor.is_contracted ? (
                    <button className="btn-contract" disabled>
                      계약 중
                    </button>
                  ) : team && (getTierLevel(team.current_tier) < sponsor.required_tier || team.reputation < sponsor.required_reputation) ? (
                    <button className="btn-contract" disabled>
                      🔒 조건 미달
                    </button>
                  ) : (
                    <button
                      className="btn-contract"
                      onClick={() => openContractModal(sponsor)}
                    >
                      계약하기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contract Modal */}
      {showContractModal && selectedSponsor && (
        <div className="modal-overlay" onClick={() => setShowContractModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 스폰서 계약</h2>
              <button className="btn-close" onClick={() => setShowContractModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="contract-sponsor-info">
                <h3>{selectedSponsor.sponsor_name}</h3>
                <p>{getTypeIcon(selectedSponsor.sponsor_type)} {selectedSponsor.sponsor_type}</p>
              </div>

              <div className="contract-details">
                <div className="contract-detail-row">
                  <span>월 수익:</span>
                  <span className="highlight">
                    {selectedSponsor.monthly_payment.toLocaleString()}원
                  </span>
                </div>
                <div className="contract-detail-row">
                  <span>보너스 조건:</span>
                  <span>{selectedSponsor.bonus_condition}</span>
                </div>
                <div className="contract-detail-row">
                  <span>보너스 금액:</span>
                  <span className="highlight">
                    {selectedSponsor.bonus_amount.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>계약 기간 (개월)</label>
                <select
                  value={contractDuration}
                  onChange={(e) => setContractDuration(Number(e.target.value))}
                  className="select-input"
                >
                  <option value="1">1개월</option>
                  <option value="3">3개월 (추천)</option>
                  <option value="6">6개월</option>
                  <option value="12">12개월</option>
                </select>
                <p className="input-hint">
                  총 예상 수익: {(selectedSponsor.monthly_payment * contractDuration).toLocaleString()}원
                </p>
              </div>

              <button className="btn-submit" onClick={handleContract}>
                계약 체결
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
              <h2>📚 스폰서 시스템 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tutorial-section">
                <h3>🏢 스폰서 시스템</h3>
                <p>스폰서와 계약하여 매월 안정적인 수익을 얻으세요!</p>
              </div>
              <div className="tutorial-section">
                <h3>📋 계약 조건</h3>
                <p>• 각 스폰서마다 필요한 티어와 명성도가 다릅니다</p>
                <p>• 조건을 만족해야 계약할 수 있습니다</p>
                <p>• 같은 타입의 스폰서는 1개만 계약 가능합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>💰 수익 구조</h3>
                <p>• <strong>월 수익</strong>: 매월 자동으로 지급됩니다</p>
                <p>• <strong>보너스</strong>: 특정 조건 달성 시 추가 금액</p>
                <p>• 계약 기간은 1~12개월까지 선택 가능</p>
              </div>
              <div className="tutorial-section">
                <h3>🎁 보너스 조건 예시</h3>
                <p>• 승급 달성: 티어 승급 시 보너스</p>
                <p>• 연승 달성: 5연승 이상 시 보너스</p>
                <p>• 우승: 리그 우승 시 보너스</p>
              </div>
              <div className="tutorial-section">
                <h3>⚠️ 주의사항</h3>
                <p>• 계약을 중도 해지하면 남은 기간의 금액을 받을 수 없습니다</p>
                <p>• 명성도가 높을수록 더 좋은 스폰서를 유치할 수 있습니다</p>
                <p>• 업적을 달성하여 명성도를 올리세요!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function
function getTierLevel(tier: string): number {
  const tierMap: { [key: string]: number } = {
    'BRONZE': 1,
    'SILVER': 2,
    'GOLD': 3,
    'PLATINUM': 4,
    'DIAMOND': 5,
    'MASTER': 6,
    'GRANDMASTER': 7,
    'CHALLENGER': 8,
  };
  return tierMap[tier] || 1;
}

export default Sponsors;
