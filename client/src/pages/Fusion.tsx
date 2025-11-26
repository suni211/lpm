import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Fusion.css';

interface PlayerCard {
  id: number;
  card_name: string;
  position: string;
  power: number;
  rarity: string;
  level: number;
  in_roster: boolean;
}

interface FusionRecipe {
  id: number;
  recipe_name: string;
  required_rarity: string;
  required_count: number;
  result_rarity: string;
  success_rate: number;
  cost: number;
}

const Fusion: React.FC = () => {
  const [cards, setCards] = useState<PlayerCard[]>([]);
  const [recipes, setRecipes] = useState<FusionRecipe[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<FusionRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [fusionResult, setFusionResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cardsRes, recipesRes] = await Promise.all([
        api.get('/roster/my-cards'),
        api.get('/fusion/recipes'),
      ]);

      setCards(cardsRes.data.cards || []);
      setRecipes(recipesRes.data.recipes || []);
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (cardId: number) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter((id) => id !== cardId));
    } else if (selectedRecipe && selectedCards.length < selectedRecipe.required_count) {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleFusion = async () => {
    if (!selectedRecipe || selectedCards.length !== selectedRecipe.required_count) {
      alert('필요한 카드를 모두 선택해주세요');
      return;
    }

    try {
      const response = await api.post('/fusion/fuse', {
        recipeId: selectedRecipe.id,
        cardIds: selectedCards,
      });

      setFusionResult(response.data);
      setSelectedCards([]);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || '합성에 실패했습니다');
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: { [key: string]: string } = {
      LEGEND: 'var(--color-legend)',
      EPIC: 'var(--color-epic)',
      RARE: 'var(--color-rare)',
      NORMAL: 'var(--color-normal)',
    };
    return colors[rarity] || 'var(--color-text-muted)';
  };

  const availableCards = selectedRecipe
    ? cards.filter((c) => c.rarity === selectedRecipe.required_rarity && !c.in_roster)
    : [];

  if (loading) {
    return (
      <div className="fusion-page">
        <div className="loading-spinner">데이터 로딩중...</div>
      </div>
    );
  }

  return (
    <div className="fusion-page">
      <div className="page-header">
        <h1 className="page-title">카드 합성</h1>
        <p className="page-subtitle">낮은 등급의 카드를 합성하여 높은 등급의 카드를 획득하세요</p>
      </div>

      <div className="fusion-content">
        <div className="recipes-section">
          <h2 className="section-title">합성 레시피</h2>
          <div className="recipes-list">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`recipe-card ${selectedRecipe?.id === recipe.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedRecipe(recipe);
                  setSelectedCards([]);
                }}
              >
                <div className="recipe-header">
                  <h3 className="recipe-name">{recipe.recipe_name}</h3>
                  <span
                    className="recipe-success-rate"
                    style={{ color: recipe.success_rate >= 70 ? 'var(--color-success)' : 'var(--color-warning)' }}
                  >
                    {recipe.success_rate}%
                  </span>
                </div>
                <div className="recipe-details">
                  <div className="recipe-requirement">
                    <span className="requirement-label">필요:</span>
                    <span
                      className="requirement-value"
                      style={{ color: getRarityColor(recipe.required_rarity) }}
                    >
                      {recipe.required_rarity} x{recipe.required_count}
                    </span>
                  </div>
                  <div className="recipe-result">
                    <span className="result-label">결과:</span>
                    <span
                      className="result-value"
                      style={{ color: getRarityColor(recipe.result_rarity) }}
                    >
                      {recipe.result_rarity}
                    </span>
                  </div>
                  <div className="recipe-cost">
                    <span className="cost-label">비용:</span>
                    <span className="cost-value">{recipe.cost.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fusion-workspace">
          <div className="selected-cards-section">
            <h2 className="section-title">
              선택된 카드 ({selectedCards.length}/{selectedRecipe?.required_count || 0})
            </h2>
            <div className="selected-cards-area">
              {selectedRecipe ? (
                <div className="selected-cards-grid">
                  {Array.from({ length: selectedRecipe.required_count }).map((_, index) => (
                    <div key={index} className="selected-card-slot">
                      {selectedCards[index] ? (
                        <div className="selected-card">
                          <span className="selected-card-name">
                            {cards.find((c) => c.id === selectedCards[index])?.card_name}
                          </span>
                          <button
                            className="btn-remove-card"
                            onClick={() => handleCardSelect(selectedCards[index])}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="empty-slot">빈 슬롯</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-recipe-selected">레시피를 선택해주세요</div>
              )}
            </div>

            {selectedRecipe && (
              <button
                className="btn btn-fusion"
                onClick={handleFusion}
                disabled={selectedCards.length !== selectedRecipe.required_count}
              >
                합성 실행 (비용: {selectedRecipe.cost.toLocaleString()}원)
              </button>
            )}
          </div>

          {selectedRecipe && (
            <div className="available-cards-section">
              <h2 className="section-title">사용 가능한 카드</h2>
              <div className="available-cards-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>선택</th>
                      <th>선수명</th>
                      <th>포지션</th>
                      <th>등급</th>
                      <th>레벨</th>
                      <th>파워</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableCards.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="no-data">
                          사용 가능한 카드가 없습니다
                        </td>
                      </tr>
                    ) : (
                      availableCards.map((card) => (
                        <tr
                          key={card.id}
                          className={`card-row ${selectedCards.includes(card.id) ? 'selected-row' : ''}`}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedCards.includes(card.id)}
                              onChange={() => handleCardSelect(card.id)}
                              disabled={!selectedCards.includes(card.id) && selectedCards.length >= selectedRecipe.required_count}
                            />
                          </td>
                          <td>{card.card_name}</td>
                          <td>
                            <span className="position-badge">{card.position}</span>
                          </td>
                          <td>
                            <span style={{ color: getRarityColor(card.rarity) }}>{card.rarity}</span>
                          </td>
                          <td>Lv.{card.level}</td>
                          <td>{card.power}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {fusionResult && (
        <div className="fusion-result-modal" onClick={() => setFusionResult(null)}>
          <div className="result-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="result-title">
              {fusionResult.success ? '합성 성공!' : '합성 실패'}
            </h2>
            {fusionResult.success && fusionResult.newCard && (
              <div className="result-card">
                <p className="result-card-name">{fusionResult.newCard.card_name}</p>
                <p
                  className="result-card-rarity"
                  style={{ color: getRarityColor(fusionResult.newCard.rarity) }}
                >
                  {fusionResult.newCard.rarity}
                </p>
                <p className="result-card-power">파워: {fusionResult.newCard.power}</p>
              </div>
            )}
            <button className="btn" onClick={() => setFusionResult(null)}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fusion;
