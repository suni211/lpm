import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Training.css';

interface PlayerCard {
  id: number;
  card_name: string;
  position: string;
  level: number;
  exp: number;
  next_level_exp: number;
  mental: number;
  team_fight: number;
  cs_ability: number;
  vision: number;
  judgment: number;
  laning: number;
}

interface TrainingProgram {
  id: number;
  program_name: string;
  stat_type: string;
  duration_hours: number;
  cost: number;
  exp_gain: number;
  stat_gain: number;
}

const Training: React.FC = () => {
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, programsRes] = await Promise.all([
        api.get('/roster/my-cards'),
        api.get('/training/programs'),
      ]);

      setPlayers(playersRes.data.cards || []);
      setPrograms(programsRes.data.programs || []);
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedPlayer || !selectedProgram) {
      alert('선수와 훈련 프로그램을 선택해주세요');
      return;
    }

    try {
      await api.post('/training/start', {
        playerCardId: selectedPlayer.id,
        programId: selectedProgram.id,
      });

      alert('훈련이 시작되었습니다');
      fetchData();
      setSelectedPlayer(null);
      setSelectedProgram(null);
    } catch (error: any) {
      alert(error.response?.data?.error || '훈련 시작에 실패했습니다');
    }
  };

  const getStatLabel = (statType: string) => {
    const labels: { [key: string]: string } = {
      mental: '멘탈',
      team_fight: '한타',
      cs_ability: 'CS',
      vision: '시야',
      judgment: '판단력',
      laning: '라인전',
    };
    return labels[statType] || statType;
  };

  if (loading) {
    return (
      <div className="training-page">
        <div className="loading-spinner">데이터 로딩중...</div>
      </div>
    );
  }

  return (
    <div className="training-page">
      <div className="page-header">
        <h1 className="page-title">선수 육성</h1>
        <p className="page-subtitle">훈련 프로그램을 통해 선수의 능력치를 향상시키세요</p>
      </div>

      <div className="training-content">
        <div className="players-section">
          <h2 className="section-title">선수 선택</h2>
          <div className="players-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>선택</th>
                  <th>선수명</th>
                  <th>포지션</th>
                  <th>레벨</th>
                  <th>경험치</th>
                  <th>멘탈</th>
                  <th>한타</th>
                  <th>CS</th>
                  <th>시야</th>
                  <th>판단력</th>
                  <th>라인전</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="no-data">보유한 선수가 없습니다</td>
                  </tr>
                ) : (
                  players.map((player) => (
                    <tr
                      key={player.id}
                      className={`player-row ${selectedPlayer?.id === player.id ? 'selected-row' : ''}`}
                      onClick={() => setSelectedPlayer(player)}
                    >
                      <td>
                        <input
                          type="radio"
                          name="selectedPlayer"
                          checked={selectedPlayer?.id === player.id}
                          onChange={() => setSelectedPlayer(player)}
                        />
                      </td>
                      <td className="player-name-cell">{player.card_name}</td>
                      <td>
                        <span className="position-badge">{player.position}</span>
                      </td>
                      <td>Lv.{player.level}</td>
                      <td>
                        <div className="exp-bar-container">
                          <div
                            className="exp-bar-fill"
                            style={{
                              width: `${(player.exp / player.next_level_exp) * 100}%`,
                            }}
                          />
                          <span className="exp-text">
                            {player.exp}/{player.next_level_exp}
                          </span>
                        </div>
                      </td>
                      <td className="stat-cell">{player.mental}</td>
                      <td className="stat-cell">{player.team_fight}</td>
                      <td className="stat-cell">{player.cs_ability}</td>
                      <td className="stat-cell">{player.vision}</td>
                      <td className="stat-cell">{player.judgment}</td>
                      <td className="stat-cell">{player.laning}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="programs-section">
          <h2 className="section-title">훈련 프로그램</h2>
          <div className="programs-grid">
            {programs.map((program) => (
              <div
                key={program.id}
                className={`program-card ${selectedProgram?.id === program.id ? 'selected' : ''}`}
                onClick={() => setSelectedProgram(program)}
              >
                <h3 className="program-name">{program.program_name}</h3>
                <div className="program-details">
                  <div className="program-detail-item">
                    <span className="detail-label">능력치:</span>
                    <span className="detail-value">{getStatLabel(program.stat_type)} +{program.stat_gain}</span>
                  </div>
                  <div className="program-detail-item">
                    <span className="detail-label">경험치:</span>
                    <span className="detail-value">+{program.exp_gain} EXP</span>
                  </div>
                  <div className="program-detail-item">
                    <span className="detail-label">소요 시간:</span>
                    <span className="detail-value">{program.duration_hours}시간</span>
                  </div>
                  <div className="program-detail-item">
                    <span className="detail-label">비용:</span>
                    <span className="detail-value cost">{program.cost.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedPlayer && selectedProgram && (
          <div className="training-summary">
            <h2 className="section-title">훈련 요약</h2>
            <div className="summary-content">
              <div className="summary-item">
                <span className="summary-label">선수:</span>
                <span className="summary-value">{selectedPlayer.card_name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">프로그램:</span>
                <span className="summary-value">{selectedProgram.program_name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">예상 효과:</span>
                <span className="summary-value">
                  {getStatLabel(selectedProgram.stat_type)} +{selectedProgram.stat_gain}, 경험치 +{selectedProgram.exp_gain}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">소요 시간:</span>
                <span className="summary-value">{selectedProgram.duration_hours}시간</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">비용:</span>
                <span className="summary-value cost">{selectedProgram.cost.toLocaleString()}원</span>
              </div>
              <button className="btn btn-start-training" onClick={handleStartTraining}>
                훈련 시작
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Training;
