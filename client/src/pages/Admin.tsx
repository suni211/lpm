import React, { useState } from 'react';
import api from '../services/api';
import './Admin.css';

type CardType = 'player' | 'coach' | 'tactic' | 'support';

interface PlayerCardForm {
  card_name: string;
  position: string;
  cost: number;
  mental: number;
  team_fight: number;
  cs_ability: number;
  vision: number;
  judgment: number;
  laning: number;
  rarity: string;
  team_name: string;
  nationality: string;
}

interface CoachCardForm {
  card_name: string;
  specialty: string;
  effect_stat: string;
  effect_value: number;
  cost: number;
  rarity: string;
}

interface TacticCardForm {
  card_name: string;
  tactic_type: string;
  effect_description: string;
  phase: number;
  effect_value: number;
  cost: number;
  rarity: string;
}

interface SupportCardForm {
  card_name: string;
  support_type: string;
  effect_description: string;
  effect_value: number;
  duration_days: number;
  cost: number;
  rarity: string;
}

const Admin: React.FC = () => {
  const [selectedType, setSelectedType] = useState<CardType>('player');
  const [image, setImage] = useState<File | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Player Card Form
  const [playerForm, setPlayerForm] = useState<PlayerCardForm>({
    card_name: '',
    position: 'TOP',
    cost: 5,
    mental: 50,
    team_fight: 50,
    cs_ability: 50,
    vision: 50,
    judgment: 50,
    laning: 50,
    rarity: 'COMMON',
    team_name: '',
    nationality: 'KR',
  });

  // Coach Card Form
  const [coachForm, setCoachForm] = useState<CoachCardForm>({
    card_name: '',
    specialty: '',
    effect_stat: 'mental',
    effect_value: 5,
    cost: 5,
    rarity: 'COMMON',
  });

  // Tactic Card Form
  const [tacticForm, setTacticForm] = useState<TacticCardForm>({
    card_name: '',
    tactic_type: '공격형',
    effect_description: '',
    phase: 1,
    effect_value: 10,
    cost: 3,
    rarity: 'COMMON',
  });

  // Support Card Form
  const [supportForm, setSupportForm] = useState<SupportCardForm>({
    card_name: '',
    support_type: '컨디션',
    effect_description: '',
    effect_value: 10,
    duration_days: 7,
    cost: 2,
    rarity: 'COMMON',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const createPlayerCard = async () => {
    try {
      const response = await api.post('/admin/cards/player', playerForm);
      const cardId = response.data.card.id;

      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        await api.post(`/admin/cards/player/${cardId}/image`, formData);
      }

      alert('선수 카드가 생성되었습니다!');
      resetForms();
    } catch (error: any) {
      alert(error.response?.data?.error || '카드 생성에 실패했습니다');
    }
  };

  const createCoachCard = async () => {
    try {
      const response = await api.post('/admin/cards/coach', coachForm);
      const cardId = response.data.card.id;

      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        await api.post(`/admin/cards/coach/${cardId}/image`, formData);
      }

      alert('감독 카드가 생성되었습니다!');
      resetForms();
    } catch (error: any) {
      alert(error.response?.data?.error || '카드 생성에 실패했습니다');
    }
  };

  const createTacticCard = async () => {
    try {
      const response = await api.post('/admin/cards/tactic', tacticForm);
      const cardId = response.data.card.id;

      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        await api.post(`/admin/cards/tactic/${cardId}/image`, formData);
      }

      alert('작전 카드가 생성되었습니다!');
      resetForms();
    } catch (error: any) {
      alert(error.response?.data?.error || '카드 생성에 실패했습니다');
    }
  };

  const createSupportCard = async () => {
    try {
      const response = await api.post('/admin/cards/support', supportForm);
      const cardId = response.data.card.id;

      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        await api.post(`/admin/cards/support/${cardId}/image`, formData);
      }

      alert('서포트 카드가 생성되었습니다!');
      resetForms();
    } catch (error: any) {
      alert(error.response?.data?.error || '카드 생성에 실패했습니다');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    switch (selectedType) {
      case 'player':
        await createPlayerCard();
        break;
      case 'coach':
        await createCoachCard();
        break;
      case 'tactic':
        await createTacticCard();
        break;
      case 'support':
        await createSupportCard();
        break;
    }
  };

  const resetForms = () => {
    setImage(null);
    setPlayerForm({
      card_name: '',
      position: 'TOP',
      cost: 5,
      mental: 50,
      team_fight: 50,
      cs_ability: 50,
      vision: 50,
      judgment: 50,
      laning: 50,
      rarity: 'COMMON',
      team_name: '',
      nationality: 'KR',
    });
    setCoachForm({
      card_name: '',
      specialty: '',
      effect_stat: 'mental',
      effect_value: 5,
      cost: 5,
      rarity: 'COMMON',
    });
    setTacticForm({
      card_name: '',
      tactic_type: '공격형',
      effect_description: '',
      phase: 1,
      effect_value: 10,
      cost: 3,
      rarity: 'COMMON',
    });
    setSupportForm({
      card_name: '',
      support_type: '컨디션',
      effect_description: '',
      effect_value: 10,
      duration_days: 7,
      cost: 2,
      rarity: 'COMMON',
    });
  };

  return (
    <div className="admin">
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="admin-title">🔧 ADMIN 패널</h1>
          <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>
            ❓ 튜토리얼
          </button>
        </div>

        <div className="card-type-selector">
          <button
            className={`type-btn ${selectedType === 'player' ? 'active' : ''}`}
            onClick={() => setSelectedType('player')}
          >
            👤 선수 카드
          </button>
          <button
            className={`type-btn ${selectedType === 'coach' ? 'active' : ''}`}
            onClick={() => setSelectedType('coach')}
          >
            👔 감독 카드
          </button>
          <button
            className={`type-btn ${selectedType === 'tactic' ? 'active' : ''}`}
            onClick={() => setSelectedType('tactic')}
          >
            📋 작전 카드
          </button>
          <button
            className={`type-btn ${selectedType === 'support' ? 'active' : ''}`}
            onClick={() => setSelectedType('support')}
          >
            💊 서포트 카드
          </button>
        </div>

        <form className="card-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h2 className="section-title">카드 이미지</h2>
            <div className="image-upload">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="image-input"
                style={{ display: 'none' }}
              />
              <label htmlFor="image-input" className="upload-label">
                {image ? image.name : '📷 이미지 선택 (최대 5MB)'}
              </label>
            </div>
          </div>

          {selectedType === 'player' && (
            <div className="form-section">
              <h2 className="section-title">선수 카드 정보</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>카드 이름</label>
                  <input
                    type="text"
                    value={playerForm.card_name}
                    onChange={(e) => setPlayerForm({ ...playerForm, card_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>포지션</label>
                  <select
                    value={playerForm.position}
                    onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                  >
                    <option value="TOP">TOP</option>
                    <option value="JUNGLE">JUNGLE</option>
                    <option value="MID">MID</option>
                    <option value="ADC">ADC</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>코스트 (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={playerForm.cost}
                    onChange={(e) => setPlayerForm({ ...playerForm, cost: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>레어도</label>
                  <select
                    value={playerForm.rarity}
                    onChange={(e) => setPlayerForm({ ...playerForm, rarity: e.target.value })}
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGEND">LEGEND</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>팀 이름</label>
                  <input
                    type="text"
                    value={playerForm.team_name}
                    onChange={(e) => setPlayerForm({ ...playerForm, team_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>국적</label>
                  <input
                    type="text"
                    value={playerForm.nationality}
                    onChange={(e) => setPlayerForm({ ...playerForm, nationality: e.target.value })}
                  />
                </div>
              </div>

              <h3 className="subsection-title">능력치 (1-99)</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>멘탈</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.mental}
                    onChange={(e) => setPlayerForm({ ...playerForm, mental: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>한타력</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.team_fight}
                    onChange={(e) => setPlayerForm({ ...playerForm, team_fight: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>CS 능력</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.cs_ability}
                    onChange={(e) => setPlayerForm({ ...playerForm, cs_ability: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>시야</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.vision}
                    onChange={(e) => setPlayerForm({ ...playerForm, vision: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>판단력</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.judgment}
                    onChange={(e) => setPlayerForm({ ...playerForm, judgment: parseInt(e.target.value) })}
                  />
                </div>
                <div className="form-group">
                  <label>라인전</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={playerForm.laning}
                    onChange={(e) => setPlayerForm({ ...playerForm, laning: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedType === 'coach' && (
            <div className="form-section">
              <h2 className="section-title">감독 카드 정보</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>카드 이름</label>
                  <input
                    type="text"
                    value={coachForm.card_name}
                    onChange={(e) => setCoachForm({ ...coachForm, card_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>특기</label>
                  <input
                    type="text"
                    value={coachForm.specialty}
                    onChange={(e) => setCoachForm({ ...coachForm, specialty: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>효과 능력치</label>
                  <select
                    value={coachForm.effect_stat}
                    onChange={(e) => setCoachForm({ ...coachForm, effect_stat: e.target.value })}
                  >
                    <option value="mental">멘탈</option>
                    <option value="team_fight">한타력</option>
                    <option value="cs_ability">CS 능력</option>
                    <option value="vision">시야</option>
                    <option value="judgment">판단력</option>
                    <option value="laning">라인전</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>효과 값</label>
                  <input
                    type="number"
                    value={coachForm.effect_value}
                    onChange={(e) => setCoachForm({ ...coachForm, effect_value: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>코스트</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={coachForm.cost}
                    onChange={(e) => setCoachForm({ ...coachForm, cost: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>레어도</label>
                  <select
                    value={coachForm.rarity}
                    onChange={(e) => setCoachForm({ ...coachForm, rarity: e.target.value })}
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGEND">LEGEND</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedType === 'tactic' && (
            <div className="form-section">
              <h2 className="section-title">작전 카드 정보</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>카드 이름</label>
                  <input
                    type="text"
                    value={tacticForm.card_name}
                    onChange={(e) => setTacticForm({ ...tacticForm, card_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>작전 타입</label>
                  <select
                    value={tacticForm.tactic_type}
                    onChange={(e) => setTacticForm({ ...tacticForm, tactic_type: e.target.value })}
                  >
                    <option value="공격형">공격형</option>
                    <option value="수비형">수비형</option>
                    <option value="균형형">균형형</option>
                    <option value="라인전">라인전</option>
                    <option value="한타">한타</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>적용 페이즈 (1-3)</label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={tacticForm.phase}
                    onChange={(e) => setTacticForm({ ...tacticForm, phase: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>효과 값 (%)</label>
                  <input
                    type="number"
                    value={tacticForm.effect_value}
                    onChange={(e) => setTacticForm({ ...tacticForm, effect_value: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>코스트</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tacticForm.cost}
                    onChange={(e) => setTacticForm({ ...tacticForm, cost: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>레어도</label>
                  <select
                    value={tacticForm.rarity}
                    onChange={(e) => setTacticForm({ ...tacticForm, rarity: e.target.value })}
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGEND">LEGEND</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>효과 설명</label>
                  <textarea
                    value={tacticForm.effect_description}
                    onChange={(e) => setTacticForm({ ...tacticForm, effect_description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {selectedType === 'support' && (
            <div className="form-section">
              <h2 className="section-title">서포트 카드 정보</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>카드 이름</label>
                  <input
                    type="text"
                    value={supportForm.card_name}
                    onChange={(e) => setSupportForm({ ...supportForm, card_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>서포트 타입</label>
                  <select
                    value={supportForm.support_type}
                    onChange={(e) => setSupportForm({ ...supportForm, support_type: e.target.value })}
                  >
                    <option value="컨디션">컨디션</option>
                    <option value="폼">폼</option>
                    <option value="멘탈케어">멘탈케어</option>
                    <option value="훈련">훈련</option>
                    <option value="회복">회복</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>효과 값</label>
                  <input
                    type="number"
                    value={supportForm.effect_value}
                    onChange={(e) => setSupportForm({ ...supportForm, effect_value: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>지속 기간 (일)</label>
                  <input
                    type="number"
                    min="1"
                    value={supportForm.duration_days}
                    onChange={(e) => setSupportForm({ ...supportForm, duration_days: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>코스트</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={supportForm.cost}
                    onChange={(e) => setSupportForm({ ...supportForm, cost: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>레어도</label>
                  <select
                    value={supportForm.rarity}
                    onChange={(e) => setSupportForm({ ...supportForm, rarity: e.target.value })}
                  >
                    <option value="COMMON">COMMON</option>
                    <option value="RARE">RARE</option>
                    <option value="EPIC">EPIC</option>
                    <option value="LEGEND">LEGEND</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>효과 설명</label>
                  <textarea
                    value={supportForm.effect_description}
                    onChange={(e) => setSupportForm({ ...supportForm, effect_description: e.target.value })}
                    required
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit">
            🎴 카드 생성
          </button>
        </form>
      </div>

      {showTutorial && (
        <div className="tutorial-modal" onClick={() => setShowTutorial(false)}>
          <div className="tutorial-content" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-header">
              <h2>📚 ADMIN 패널 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="tutorial-body">
              <div className="tutorial-section">
                <h3>🎴 카드 생성 방법</h3>
                <p>1. 상단에서 생성할 카드 타입을 선택합니다 (선수/감독/작전/서포트)</p>
                <p>2. 카드 이미지를 업로드합니다 (선택사항, 최대 5MB)</p>
                <p>3. 카드 정보를 입력합니다</p>
                <p>4. '카드 생성' 버튼을 클릭합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>👤 선수 카드</h3>
                <p>• 코스트: 1-10 (높을수록 강력)</p>
                <p>• 능력치: 1-99 (포지션별 가중치 다름)</p>
                <p>• 파워는 능력치로 자동 계산됩니다</p>
              </div>
              <div className="tutorial-section">
                <h3>👔 감독 카드</h3>
                <p>• 특정 능력치에 보너스를 제공합니다</p>
                <p>• 특기와 효과 능력치를 설정하세요</p>
              </div>
              <div className="tutorial-section">
                <h3>📋 작전 카드</h3>
                <p>• 특정 페이즈에 효과를 발휘합니다</p>
                <p>• Phase 1(라인전), 2(오브젝트), 3(최종 한타)</p>
              </div>
              <div className="tutorial-section">
                <h3>💊 서포트 카드</h3>
                <p>• 선수의 컨디션, 폼 등을 향상시킵니다</p>
                <p>• 지속 기간을 설정할 수 있습니다</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
