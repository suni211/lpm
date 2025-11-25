import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './CreateTeam.css';

const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamLogo, setTeamLogo] = useState('🎮');
  const [color1, setColor1] = useState('#8b5cf6');
  const [color2, setColor2] = useState('#6366f1');
  const [color3, setColor3] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logoOptions = ['🎮', '⚔️', '🔥', '⚡', '🏆', '👑', '🦁', '🐉', '🐺', '🦅', '⭐', '💎', '🎯', '🛡️', '🚀'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 팀 이름 검증
    if (!teamName.trim()) {
      setError('팀 이름을 입력해주세요');
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(teamName)) {
      setError('팀 이름은 영어와 숫자만 사용 가능합니다');
      return;
    }

    if (teamName.length > 20) {
      setError('팀 이름은 20자 이내여야 합니다');
      return;
    }

    // 팀 태그 검증
    if (!teamTag.trim()) {
      setError('팀 태그를 입력해주세요');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(teamTag)) {
      setError('팀 태그는 영어와 숫자만 사용 가능합니다');
      return;
    }

    if (teamTag.length < 2 || teamTag.length > 4) {
      setError('팀 태그는 2~4글자여야 합니다');
      return;
    }

    try {
      setLoading(true);
      await api.post('/team/create', {
        teamName: teamName.trim(),
        teamTag: teamTag.trim().toUpperCase(),
        teamLogo,
        color1,
        color2,
        color3,
      });
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
          {/* 팀 이름 */}
          <div className="form-group">
            <label htmlFor="teamName" className="form-label">
              팀 이름 (영어)
            </label>
            <input
              type="text"
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="T1, Gen.G, DRX..."
              className="form-input"
              maxLength={20}
              disabled={loading}
              autoFocus
            />
            <div className="form-hint">
              {teamName.length}/20 (영어, 숫자만 가능)
            </div>
          </div>

          {/* 팀 태그 */}
          <div className="form-group">
            <label htmlFor="teamTag" className="form-label">
              팀 태그 (2~4글자)
            </label>
            <input
              type="text"
              id="teamTag"
              value={teamTag}
              onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
              placeholder="T1, GEN, DRX..."
              className="form-input"
              maxLength={4}
              disabled={loading}
            />
            <div className="form-hint">
              {teamTag.length}/4 (영어, 숫자만 가능)
            </div>
          </div>

          {/* 팀 로고 */}
          <div className="form-group">
            <label className="form-label">팀 로고</label>
            <div className="logo-picker">
              {logoOptions.map((logo) => (
                <button
                  key={logo}
                  type="button"
                  className={`logo-option ${teamLogo === logo ? 'selected' : ''}`}
                  onClick={() => setTeamLogo(logo)}
                  disabled={loading}
                >
                  {logo}
                </button>
              ))}
            </div>
          </div>

          {/* 팀 색깔 */}
          <div className="form-group">
            <label className="form-label">팀 색깔 (3개)</label>
            <div className="color-picker-grid">
              <div className="color-picker-item">
                <label htmlFor="color1" className="color-label">색상 1</label>
                <input
                  type="color"
                  id="color1"
                  value={color1}
                  onChange={(e) => setColor1(e.target.value)}
                  className="color-input"
                  disabled={loading}
                />
                <span className="color-value">{color1}</span>
              </div>
              <div className="color-picker-item">
                <label htmlFor="color2" className="color-label">색상 2</label>
                <input
                  type="color"
                  id="color2"
                  value={color2}
                  onChange={(e) => setColor2(e.target.value)}
                  className="color-input"
                  disabled={loading}
                />
                <span className="color-value">{color2}</span>
              </div>
              <div className="color-picker-item">
                <label htmlFor="color3" className="color-label">색상 3</label>
                <input
                  type="color"
                  id="color3"
                  value={color3}
                  onChange={(e) => setColor3(e.target.value)}
                  className="color-input"
                  disabled={loading}
                />
                <span className="color-value">{color3}</span>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="team-preview">
            <div className="preview-label">미리보기</div>
            <div
              className="preview-card"
              style={{
                background: `linear-gradient(135deg, ${color1} 0%, ${color2} 50%, ${color3} 100%)`
              }}
            >
              <div className="preview-logo">{teamLogo}</div>
              <div className="preview-name">{teamName || 'Team Name'}</div>
              <div className="preview-tag">{teamTag || 'TAG'}</div>
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
            disabled={loading || !teamName.trim() || !teamTag.trim()}
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
