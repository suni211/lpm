import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Facility.css';

interface Facility {
  id: number;
  facility_name: string;
  current_level: number;
  max_level: number;
  description: string;
  upgrade_cost: number;
  upgrade_duration_hours: number;
  bonus_type: string;
  bonus_value: number;
}

const Facility: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/facility/list');
      setFacilities(response.data.facilities || []);
    } catch (error) {
      console.error('시설 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (facilityId: number) => {
    if (!confirm('시설을 업그레이드하시겠습니까?')) return;

    try {
      await api.post('/facility/upgrade', { facilityId });
      alert('업그레이드가 시작되었습니다');
      fetchFacilities();
    } catch (error: any) {
      alert(error.response?.data?.error || '업그레이드에 실패했습니다');
    }
  };

  const getBonusLabel = (bonusType: string) => {
    const labels: { [key: string]: string } = {
      training_efficiency: '훈련 효율',
      player_recovery: '선수 회복',
      scouting_range: '스카우팅 범위',
      match_performance: '경기 퍼포먼스',
      team_morale: '팀 사기',
      sponsor_income: '스폰서 수입',
    };
    return labels[bonusType] || bonusType;
  };

  if (loading) {
    return (
      <div className="facility-page">
        <div className="loading-spinner">데이터 로딩중...</div>
      </div>
    );
  }

  return (
    <div className="facility-page">
      <div className="page-header">
        <h1 className="page-title">시설 관리</h1>
        <p className="page-subtitle">
          구단 시설을 업그레이드하여 팀 운영 효율을 높이세요
        </p>
      </div>

      <div className="facilities-grid">
        {facilities.map((facility) => (
          <div key={facility.id} className="facility-card">
            <div className="facility-header">
              <h2 className="facility-name">{facility.facility_name}</h2>
              <div className="facility-level">
                <span className="level-label">레벨</span>
                <span className="level-value">
                  {facility.current_level}/{facility.max_level}
                </span>
              </div>
            </div>

            <p className="facility-description">{facility.description}</p>

            <div className="facility-bonus">
              <div className="bonus-item">
                <span className="bonus-label">보너스:</span>
                <span className="bonus-value">
                  {getBonusLabel(facility.bonus_type)} +{facility.bonus_value}%
                </span>
              </div>
            </div>

            <div className="facility-level-bar">
              <div
                className="level-bar-fill"
                style={{
                  width: `${(facility.current_level / facility.max_level) * 100}%`,
                }}
              />
            </div>

            {facility.current_level < facility.max_level ? (
              <div className="facility-upgrade-section">
                <div className="upgrade-info">
                  <div className="upgrade-info-item">
                    <span className="info-label">업그레이드 비용:</span>
                    <span className="info-value cost">
                      {facility.upgrade_cost.toLocaleString()}원
                    </span>
                  </div>
                  <div className="upgrade-info-item">
                    <span className="info-label">소요 시간:</span>
                    <span className="info-value">
                      {facility.upgrade_duration_hours}시간
                    </span>
                  </div>
                  <div className="upgrade-info-item">
                    <span className="info-label">다음 레벨 보너스:</span>
                    <span className="info-value">
                      +{facility.bonus_value + 5}%
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-upgrade"
                  onClick={() => handleUpgrade(facility.id)}
                >
                  업그레이드
                </button>
              </div>
            ) : (
              <div className="facility-maxed">
                <span className="badge badge-success">최대 레벨</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="facility-tips">
        <h3 className="tips-title">시설 관리 팁</h3>
        <ul className="tips-list">
          <li>훈련소를 업그레이드하면 선수 육성 효율이 증가합니다</li>
          <li>의무실을 업그레이드하면 선수 회복 속도가 빨라집니다</li>
          <li>스카우팅 센터를 업그레이드하면 더 많은 선수를 스카우팅할 수 있습니다</li>
          <li>경기장을 업그레이드하면 홈 경기 퍼포먼스가 향상됩니다</li>
          <li>라커룸을 업그레이드하면 팀 사기가 올라갑니다</li>
          <li>스폰서 라운지를 업그레이드하면 스폰서 수입이 증가합니다</li>
        </ul>
      </div>
    </div>
  );
};

export default Facility;
