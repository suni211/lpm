import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Match.css';

interface MatchPhase {
  phase: number;
  team1Score: number;
  team2Score: number;
  description: string;
}

interface MatchResult {
  matchId: string;
  winner: 'team1' | 'team2';
  phases: MatchPhase[];
  lpChange: number;
  newTier: string;
  newLp: number;
  opponent: {
    name: string;
    tier: string;
    lp: number;
  };
}

const Match: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [matchInProgress, setMatchInProgress] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [roster, setRoster] = useState<any>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkRoster();
  }, []);

  const checkRoster = async () => {
    try {
      const response = await api.get('/roster');
      setRoster(response.data.roster);
    } catch (error) {
      console.error('로스터 조회 실패:', error);
    }
  };

  const startMatch = async () => {
    if (!roster || roster.total_cost === 0) {
      alert('먼저 로스터를 구성해주세요!');
      return;
    }

    if (roster.total_cost > 48) {
      alert('로스터 코스트가 48을 초과합니다!');
      return;
    }

    setLoading(true);
    setMatchInProgress(true);
    setCurrentPhase(0);
    setMatchResult(null);

    try {
      const response = await api.post('/match/ranked/start');
      const result = response.data;

      // Phase 1 애니메이션
      setTimeout(() => {
        setCurrentPhase(1);
      }, 2000);

      // Phase 2 애니메이션
      setTimeout(() => {
        setCurrentPhase(2);
      }, 5000);

      // Phase 3 애니메이션
      setTimeout(() => {
        setCurrentPhase(3);
      }, 8000);

      // 최종 결과 표시
      setTimeout(() => {
        setMatchResult(result);
        setMatchInProgress(false);
        setLoading(false);
      }, 11000);
    } catch (error: any) {
      alert(error.response?.data?.error || '경기 시작에 실패했습니다');
      setLoading(false);
      setMatchInProgress(false);
    }
  };

  const getPhaseTitle = (phase: number) => {
    switch (phase) {
      case 1:
        return '⚔️ 라인전 페이즈';
      case 2:
        return '🐉 오브젝트 한타';
      case 3:
        return '🏆 최종 한타';
      default:
        return '경기 준비 중...';
    }
  };

  const getPhaseDescription = (phase: number) => {
    switch (phase) {
      case 1:
        return '라인전 능력, CS, 판단력으로 초반 우위를 점합니다!';
      case 2:
        return '한타력과 시야 능력으로 오브젝트를 선점합니다!';
      case 3:
        return '모든 능력치와 주사위로 승부를 가립니다!';
      default:
        return '';
    }
  };

  return (
    <div className="match">
      <div className="match-container">
        <div className="match-header">
          <h1 className="match-title">⚔️ 랭크 경기</h1>
          <button
            className="btn-tutorial"
            onClick={() => setShowTutorial(true)}
          >
            ❓ 튜토리얼
          </button>
        </div>

        {!matchInProgress && !matchResult && (
          <div className="match-lobby">
            <div className="lobby-info">
              <h2>경기 시작 준비</h2>
              {roster && (
                <div className="roster-status">
                  <div className="status-item">
                    <span className="status-label">로스터 상태:</span>
                    <span className={`status-value ${roster.total_cost > 0 ? 'ready' : 'not-ready'}`}>
                      {roster.total_cost > 0 ? '✅ 준비 완료' : '❌ 미구성'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">총 코스트:</span>
                    <span className={`status-value ${roster.total_cost > 48 ? 'over' : ''}`}>
                      {roster.total_cost} / 48
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              className="btn-start-match"
              onClick={startMatch}
              disabled={loading || !roster || roster.total_cost === 0 || roster.total_cost > 48}
            >
              {loading ? '매칭 중...' : '랭크 경기 시작'}
            </button>
          </div>
        )}

        {matchInProgress && (
          <div className="match-progress">
            <div className="phase-indicator">
              <h2 className="phase-title">{getPhaseTitle(currentPhase)}</h2>
              <p className="phase-description">{getPhaseDescription(currentPhase)}</p>
            </div>

            <div className="battle-animation">
              <div className="team team-left">
                <div className="team-icon">🛡️</div>
                <div className="team-label">MY TEAM</div>
              </div>

              <div className="versus">
                <div className="vs-text">VS</div>
                <div className="phase-number">Phase {currentPhase}/3</div>
              </div>

              <div className="team team-right">
                <div className="team-icon">⚔️</div>
                <div className="team-label">OPPONENT</div>
              </div>
            </div>

            <div className="phase-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(currentPhase / 3) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {matchResult && (
          <div className="match-result">
            <div className={`result-header ${matchResult.winner === 'team1' ? 'victory' : 'defeat'}`}>
              <h2 className="result-title">
                {matchResult.winner === 'team1' ? '🏆 승리!' : '💔 패배'}
              </h2>
            </div>

            <div className="result-opponent">
              <h3>상대팀 정보</h3>
              <div className="opponent-info">
                <span className="opponent-name">{matchResult.opponent.name}</span>
                <span className="opponent-tier">
                  {matchResult.opponent.tier} {matchResult.opponent.lp} LP
                </span>
              </div>
            </div>

            <div className="result-phases">
              <h3>경기 진행 과정</h3>
              {matchResult.phases.map((phase, index) => (
                <div key={index} className="phase-result">
                  <div className="phase-info">
                    <span className="phase-label">{getPhaseTitle(phase.phase)}</span>
                  </div>
                  <div className="phase-scores">
                    <span className="score team1">{phase.team1Score.toFixed(0)}</span>
                    <span className="score-divider">-</span>
                    <span className="score team2">{phase.team2Score.toFixed(0)}</span>
                  </div>
                  <div className="phase-desc">{phase.description}</div>
                </div>
              ))}
            </div>

            <div className="result-rewards">
              <h3>LP 변동</h3>
              <div className="lp-change">
                <span className={`lp-value ${matchResult.lpChange >= 0 ? 'positive' : 'negative'}`}>
                  {matchResult.lpChange >= 0 ? '+' : ''}{matchResult.lpChange} LP
                </span>
              </div>
              <div className="new-rank">
                <span className="rank-label">현재 랭크:</span>
                <span className="rank-value">{matchResult.newTier} {matchResult.newLp} LP</span>
              </div>
            </div>

            <button className="btn-new-match" onClick={() => {
              setMatchResult(null);
              checkRoster();
            }}>
              새 경기 시작
            </button>
          </div>
        )}
      </div>

      {showTutorial && (
        <div className="tutorial-modal" onClick={() => setShowTutorial(false)}>
          <div className="tutorial-content" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-header">
              <h2>📚 경기 시스템 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="tutorial-body">
              <div className="tutorial-section">
                <h3>🎯 경기 방식</h3>
                <p>랭크 경기는 3페이즈로 진행되며, 각 페이즈별로 다른 능력치가 중요합니다.</p>
              </div>
              <div className="tutorial-section">
                <h3>⚔️ Phase 1: 라인전</h3>
                <p>라인전, CS, 판단력 능력치가 중요합니다. 초반 우위를 점하세요!</p>
              </div>
              <div className="tutorial-section">
                <h3>🐉 Phase 2: 오브젝트 한타</h3>
                <p>한타력과 시야 능력치가 중요합니다. 드래곤과 바론을 선점하세요!</p>
              </div>
              <div className="tutorial-section">
                <h3>🏆 Phase 3: 최종 한타</h3>
                <p>모든 능력치 + 주사위(1-10)로 최종 승부가 결정됩니다!</p>
              </div>
              <div className="tutorial-section">
                <h3>📊 LP 시스템</h3>
                <p>승리하면 LP를 얻고, 패배하면 LP를 잃습니다. 100 LP마다 티어가 올라갑니다!</p>
              </div>
              <div className="tutorial-section">
                <h3>⚠️ 주의사항</h3>
                <ul>
                  <li>로스터 코스트는 반드시 48 이하여야 합니다</li>
                  <li>5개 포지션을 모두 채워야 경기를 시작할 수 있습니다</li>
                  <li>컨디션과 폼이 경기 결과에 영향을 줍니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Match;
