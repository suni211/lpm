import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Facilities.css';

interface FacilityData {
  id: string;
  team_id: string;
  tactic_lab_level: number;
  tactic_lab_next_cost: number;
  skill_lab_level: number;
  skill_lab_next_cost: number;
  skill_lab_last_claim: string | null;
  training_center_level: number;
  training_center_next_cost: number;
}

interface TeamData {
  id: string;
  balance: number;
}

const Facilities: React.FC = () => {
  const [facilities, setFacilities] = useState<FacilityData | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<any>(null);

  useEffect(() => {
    fetchFacilities();
    fetchClaimStatus();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/facilities');
      setFacilities(response.data.facilities);
      setTeam(response.data.team);
    } catch (error) {
      console.error('시설 정보 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimStatus = async () => {
    try {
      const response = await api.get('/facilities/skill-lab/claim-status');
      setClaimStatus(response.data);
    } catch (error) {
      console.error('스킬 카드 획득 가능 여부 확인 실패:', error);
    }
  };

  const handleUpgrade = async (facilityType: 'tactic-lab' | 'skill-lab' | 'training-center') => {
    if (!confirm('시설을 업그레이드하시겠습니까?')) return;

    try {
      const response = await api.post(`/facilities/upgrade/${facilityType}`);
      alert(response.data.message);
      fetchFacilities();
    } catch (error: any) {
      alert(error.response?.data?.error || '업그레이드에 실패했습니다');
    }
  };

  const handleClaimSkillCard = async () => {
    if (!confirm('스킬 카드를 획득하시겠습니까?')) return;

    try {
      const response = await api.post('/facilities/skill-lab/claim');
      alert(`${response.data.card.tactic_name} 카드를 획득했습니다!`);
      fetchFacilities();
      fetchClaimStatus();
    } catch (error: any) {
      alert(error.response?.data?.error || '스킬 카드 획득에 실패했습니다');
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}천만`;
    }
    return amount.toLocaleString();
  };

  if (loading) {
    return (
      <div className="facilities-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (!facilities || !team) {
    return (
      <div className="facilities-page">
        <div className="error">시설 정보를 불러올 수 없습니다</div>
      </div>
    );
  }

  return (
    <div className="facilities-page">
      <div className="facilities-header">
        <h1>🏢 시설 관리</h1>
        <div className="team-balance">
          <span>보유 자금:</span>
          <strong>{formatCurrency(team.balance)}원</strong>
        </div>
      </div>

      <div className="facilities-grid">
        {/* 작전 연구소 */}
        <div className="facility-card">
          <div className="facility-icon">🎯</div>
          <h2>작전 연구소</h2>
          <div className="facility-level">
            <span>Lv. {facilities.tactic_lab_level}</span>
            <span className="level-max">/ 5</span>
          </div>
          <p className="facility-description">
            작전 레벨당 3% 증가 (현재: {facilities.tactic_lab_level * 3}%)
          </p>
          <div className="facility-stats">
            <div className="stat">
              <span>현재 보너스</span>
              <strong>+{facilities.tactic_lab_level * 3}%</strong>
            </div>
            <div className="stat">
              <span>최대 보너스</span>
              <strong>+15%</strong>
            </div>
          </div>
          {facilities.tactic_lab_level < 5 && (
            <div className="upgrade-section">
              <div className="upgrade-cost">
                <span>업그레이드 비용:</span>
                <strong>{formatCurrency(facilities.tactic_lab_next_cost)}원</strong>
              </div>
              <button
                className="upgrade-button"
                onClick={() => handleUpgrade('tactic-lab')}
                disabled={team.balance < facilities.tactic_lab_next_cost}
              >
                업그레이드
              </button>
            </div>
          )}
          {facilities.tactic_lab_level >= 5 && (
            <div className="max-level">최대 레벨 달성!</div>
          )}
        </div>

        {/* 스킬 연구소 */}
        <div className="facility-card">
          <div className="facility-icon">🔬</div>
          <h2>스킬 연구소</h2>
          <div className="facility-level">
            <span>Lv. {facilities.skill_lab_level}</span>
            <span className="level-max">/ 5</span>
          </div>
          <p className="facility-description">
            스킬 카드 획득 (기본 7일, 레벨당 1일 단축)
          </p>
          <div className="facility-stats">
            <div className="stat">
              <span>획득 주기</span>
              <strong>
                {facilities.skill_lab_level === 0
                  ? '연구소 필요'
                  : `${Math.max(1, 7 - facilities.skill_lab_level)}일마다`}
              </strong>
            </div>
            <div className="stat">
              <span>최소 주기</span>
              <strong>1일</strong>
            </div>
          </div>

          {facilities.skill_lab_level > 0 && claimStatus && (
            <div className="claim-section">
              {claimStatus.canClaim ? (
                <button
                  className="claim-button"
                  onClick={handleClaimSkillCard}
                >
                  🎁 스킬 카드 획득
                </button>
              ) : (
                <div className="claim-timer">
                  ⏰ {claimStatus.daysRemaining}일 후 획득 가능
                </div>
              )}
            </div>
          )}

          {facilities.skill_lab_level < 5 && (
            <div className="upgrade-section">
              <div className="upgrade-cost">
                <span>업그레이드 비용:</span>
                <strong>{formatCurrency(facilities.skill_lab_next_cost)}원</strong>
              </div>
              <button
                className="upgrade-button"
                onClick={() => handleUpgrade('skill-lab')}
                disabled={team.balance < facilities.skill_lab_next_cost}
              >
                업그레이드
              </button>
            </div>
          )}
          {facilities.skill_lab_level >= 5 && (
            <div className="max-level">최대 레벨 달성!</div>
          )}
        </div>

        {/* 집중 훈련소 */}
        <div className="facility-card">
          <div className="facility-icon">💪</div>
          <h2>집중 훈련소</h2>
          <div className="facility-level">
            <span>Lv. {facilities.training_center_level}</span>
            <span className="level-max">/ 1</span>
          </div>
          <p className="facility-description">
            선수 특정 능력치 개선 및 특성 개방
          </p>
          <div className="facility-stats">
            <div className="stat">
              <span>상태</span>
              <strong>{facilities.training_center_level === 0 ? '미건설' : '완료'}</strong>
            </div>
          </div>
          {facilities.training_center_level === 0 && (
            <div className="upgrade-section">
              <div className="upgrade-cost">
                <span>건설 비용:</span>
                <strong>{formatCurrency(facilities.training_center_next_cost)}원</strong>
              </div>
              <button
                className="upgrade-button"
                onClick={() => handleUpgrade('training-center')}
                disabled={team.balance < facilities.training_center_next_cost}
              >
                건설하기
              </button>
            </div>
          )}
          {facilities.training_center_level >= 1 && (
            <div className="max-level">건설 완료!</div>
          )}
        </div>
      </div>

      <div className="facilities-info">
        <h3>📋 시설 정보</h3>
        <ul>
          <li>
            <strong>작전 연구소:</strong> 레벨당 작전 효과 3% 증가 (최대 15%)
            <br />
            업그레이드 비용: 5억 → 10억 → 15억 → 20억 → 50억
          </li>
          <li>
            <strong>스킬 연구소:</strong> 정기적으로 스킬(작전/서포트) 카드 획득
            <br />
            레벨당 획득 주기 1일 단축 (7일 → 2일)
            <br />
            업그레이드 비용: 10억 → 20억 → 30억 → 40억 → 50억
          </li>
          <li>
            <strong>집중 훈련소:</strong> 선수의 특정 능력치를 개선하거나 특성을 개방
            <br />
            건설 비용: 100억
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Facilities;
