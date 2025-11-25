import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './CreateTeam.css';

const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('팀 이름을 입력해주세요');
      return;
    }

    if (teamName.length > 50) {
      setError('팀 이름은 50자 이내여야 합니다');
      return;
    }

    try {
      setLoading(true);
      await api.post('/team/create', { teamName: teamName.trim() });
      await refreshAuth(); // 팀 정보 새로고침
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || '팀 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-team">
      <div className="create-team-container">
        <div className="create-team-header">
          <h1 className="create-team-title">🎮 팀 생성</h1>
          <p className="create-team-subtitle">
            당신의 e스포츠 팀을 시작하세요!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="create-team-form">
          <div className="form-group">
            <label htmlFor="teamName" className="form-label">
              팀 이름
            </label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="예: T1, Gen.G, DRX..."
              className="form-input"
              maxLength={50}
              disabled={loading}
              autoFocus
            />
            <div className="form-hint">
              {teamName.length}/50
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-create-team"
            disabled={loading || !teamName.trim()}
          >
            {loading ? '생성 중...' : '팀 생성하기'}
          </button>
        </form>

        <div className="create-team-tips">
          <h3>💡 팀 생성 팁</h3>
          <ul>
            <li>팀 이름은 나중에 변경할 수 있습니다</li>
            <li>카드를 모아 최강의 로스터를 구성하세요</li>
            <li>전략적인 경기 운영으로 챌린저를 목표로!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateTeam;
