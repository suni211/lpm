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
  coach_name: string;
  command: number;
  ban_pick: number;
  meta: number;
  cold: number;
  warm: number;
  rarity: string;
}

interface TacticCardForm {
  tactic_name: string;
  position: string | null;
  effect_description: string;
  effect_type: string;
  effect_value: number;
  rarity: string;
}

interface SupportCardForm {
  support_name: string;
  effect_description: string;
  effect_type: string;
  effect_value: number;
  rarity: string;
}

const Admin: React.FC = () => {
  const [selectedType, setSelectedType] = useState<CardType>('player');
  const [image, setImage] = useState<File | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [cardList, setCardList] = useState<any[]>([]);
  const [showCardList, setShowCardList] = useState(false);
  const [uploadingCardId, setUploadingCardId] = useState<number | null>(null);

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
    coach_name: '',
    command: 70,
    ban_pick: 70,
    meta: 70,
    cold: 70,
    warm: 70,
    rarity: 'RARE',
  });

  // Tactic Card Form
  const [tacticForm, setTacticForm] = useState<TacticCardForm>({
    tactic_name: '',
    position: null,
    effect_description: '',
    effect_type: '',
    effect_value: 3,
    rarity: 'RARE',
  });

  // Support Card Form
  const [supportForm, setSupportForm] = useState<SupportCardForm>({
    support_name: '',
    effect_description: '',
    effect_type: '',
    effect_value: 10,
    rarity: 'NORMAL',
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
      coach_name: '',
      command: 70,
      ban_pick: 70,
      meta: 70,
      cold: 70,
      warm: 70,
      rarity: 'RARE',
    });
    setTacticForm({
      tactic_name: '',
      position: null,
      effect_description: '',
      effect_type: '',
      effect_value: 3,
      rarity: 'RARE',
    });
    setSupportForm({
      support_name: '',
      effect_description: '',
      effect_type: '',
      effect_value: 10,
      rarity: 'NORMAL',
    });
  };

  const loadCards = async () => {
    try {
      const response = await api.get(`/admin/cards?type=${selectedType}`);
      setCardList(response.data.cards);
      setShowCardList(true);
    } catch (error: any) {
      alert(error.response?.data?.error || '카드 목록 조회에 실패했습니다');
    }
  };

  const uploadCardImage = async (cardId: number, file: File) => {
    try {
      setUploadingCardId(cardId);
      const formData = new FormData();
      formData.append('image', file);

      await api.post(`/admin/cards/${selectedType}/${cardId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('이미지가 업로드되었습니다!');
      loadCards(); // 목록 새로고침
    } catch (error: any) {
      alert(error.response?.data?.error || '이미지 업로드에 실패했습니다');
    } finally {
      setUploadingCardId(null);
    }
  };

  const handleCardImageUpload = (cardId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadCardImage(cardId, e.target.files[0]);
    }
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
                  <label>감독 이름</label>
                  <input
                    type="text"
                    value={coachForm.coach_name}
                    onChange={(e) => setCoachForm({ ...coachForm, coach_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>지휘 (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={coachForm.command}
                    onChange={(e) => setCoachForm({ ...coachForm, command: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>밴픽 (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={coachForm.ban_pick}
                    onChange={(e) => setCoachForm({ ...coachForm, ban_pick: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>메타력 (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={coachForm.meta}
                    onChange={(e) => setCoachForm({ ...coachForm, meta: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>냉정함 (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={coachForm.cold}
                    onChange={(e) => setCoachForm({ ...coachForm, cold: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>따뜻함 (1-99)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={coachForm.warm}
                    onChange={(e) => setCoachForm({ ...coachForm, warm: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>레어도</label>
                  <select
                    value={coachForm.rarity}
                    onChange={(e) => setCoachForm({ ...coachForm, rarity: e.target.value })}
                  >
                    <option value="NORMAL">NORMAL</option>
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
                  <label>작전 이름</label>
                  <input
                    type="text"
                    value={tacticForm.tactic_name}
                    onChange={(e) => setTacticForm({ ...tacticForm, tactic_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>포지션 (선택사항)</label>
                  <select
                    value={tacticForm.position || ''}
                    onChange={(e) => setTacticForm({ ...tacticForm, position: e.target.value || null })}
                  >
                    <option value="">없음 (전체)</option>
                    <option value="TOP">TOP</option>
                    <option value="JUNGLE">JUNGLE</option>
                    <option value="MID">MID</option>
                    <option value="ADC">ADC</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>효과 타입</label>
                  <input
                    type="text"
                    value={tacticForm.effect_type}
                    onChange={(e) => setTacticForm({ ...tacticForm, effect_type: e.target.value })}
                    placeholder="예: POWER_BOOST_VS_STRONGER"
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
                  <label>레어도</label>
                  <select
                    value={tacticForm.rarity}
                    onChange={(e) => setTacticForm({ ...tacticForm, rarity: e.target.value })}
                  >
                    <option value="NORMAL">NORMAL</option>
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
                  <label>서포트 이름</label>
                  <input
                    type="text"
                    value={supportForm.support_name}
                    onChange={(e) => setSupportForm({ ...supportForm, support_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>효과 타입</label>
                  <input
                    type="text"
                    value={supportForm.effect_type}
                    onChange={(e) => setSupportForm({ ...supportForm, effect_type: e.target.value })}
                    placeholder="예: TEAM_CONDITION_UP_1"
                    required
                  />
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
                  <label>레어도</label>
                  <select
                    value={supportForm.rarity}
                    onChange={(e) => setSupportForm({ ...supportForm, rarity: e.target.value })}
                  >
                    <option value="NORMAL">NORMAL</option>
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

        <div className="card-list-section">
          <button className="btn-load-cards" onClick={loadCards}>
            📋 기존 카드 목록 보기/이미지 업로드
          </button>

          {showCardList && cardList.length > 0 && (
            <div className="card-list">
              <h2 className="section-title">
                {selectedType === 'player' && '선수'}
                {selectedType === 'coach' && '감독'}
                {selectedType === 'tactic' && '작전'}
                {selectedType === 'support' && '서포트'} 카드 목록 ({cardList.length}개)
              </h2>
              <div className="card-grid">
                {cardList.map((card) => (
                  <div key={card.id} className="card-item">
                    <div className="card-image-preview">
                      {(card.card_image || card.coach_image || card.tactic_image || card.support_image) ? (
                        <img
                          src={card.card_image || card.coach_image || card.tactic_image || card.support_image}
                          alt={card.card_name || card.coach_name || card.tactic_name || card.support_name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="no-image">이미지 없음</div>
                      )}
                    </div>
                    <div className="card-info">
                      <h3>{card.card_name || card.coach_name || card.tactic_name || card.support_name}</h3>
                      {selectedType === 'player' && (
                        <p>
                          {card.position} | 코스트 {card.cost} | 파워 {card.power} | {card.rarity}
                        </p>
                      )}
                      {selectedType === 'coach' && (
                        <p>
                          지휘 {card.command} | 밴픽 {card.ban_pick} | 메타 {card.meta} | {card.rarity}
                        </p>
                      )}
                      {selectedType === 'tactic' && (
                        <p>
                          {card.position || '전체'} | 효과 {card.effect_value}% | {card.rarity}
                        </p>
                      )}
                      {selectedType === 'support' && (
                        <p>
                          효과 {card.effect_value} | {card.rarity}
                        </p>
                      )}
                      <div className="card-actions">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCardImageUpload(card.id, e)}
                          id={`upload-${card.id}`}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor={`upload-${card.id}`} className="btn-upload-image">
                          {uploadingCardId === card.id ? '업로드 중...' : '📷 이미지 업로드'}
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCardList && cardList.length === 0 && (
            <p className="no-cards">해당 타입의 카드가 없습니다.</p>
          )}
        </div>
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
