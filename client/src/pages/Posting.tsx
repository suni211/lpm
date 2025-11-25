import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Posting.css';

interface Auction {
  id: string;
  card_name: string;
  position: string;
  cost: number;
  power: number;
  rarity: string;
  starting_price: number;
  buyout_price: number;
  end_time: string;
  seller_team_name: string;
  seller_name: string;
  bid_count: number;
  highest_bid: number;
}

interface MyCard {
  id: string;
  card_name: string;
  position: string;
  cost: number;
  power: number;
  rarity: string;
  is_in_roster: boolean;
}

const Posting: React.FC = () => {
  const { refreshAuth } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [myCards, setMyCards] = useState<MyCard[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');

  // Create auction form
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [startingPrice, setStartingPrice] = useState<number>(10000000);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(50000000);
  const [durationHours, setDurationHours] = useState<number>(24);

  // Bid form
  const [bidAmount, setBidAmount] = useState<number>(0);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await api.get('/posting/auctions');
      setAuctions(response.data.auctions);
    } catch (error) {
      console.error('경매 목록 조회 실패:', error);
    }
  };

  const fetchMyCards = async () => {
    try {
      const response = await api.get('/gacha/collection');
      const availableCards = response.data.playerCards.filter(
        (card: MyCard) => !card.is_in_roster
      );
      setMyCards(availableCards);
    } catch (error) {
      console.error('카드 목록 조회 실패:', error);
    }
  };

  const handleCreateAuction = async () => {
    if (!selectedCard) {
      alert('카드를 선택해주세요!');
      return;
    }

    try {
      await api.post('/posting/create', {
        userCardId: selectedCard,
        startingPrice,
        buyoutPrice,
        durationHours,
      });

      alert('경매가 등록되었습니다!');
      setShowCreateModal(false);
      setSelectedCard('');
      fetchAuctions();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '경매 등록에 실패했습니다');
    }
  };

  const handleBid = async () => {
    if (!selectedAuction) return;

    try {
      const response = await api.post('/posting/bid', {
        auctionId: selectedAuction.id,
        bidAmount,
      });

      if (response.data.isBuyout) {
        alert('🎉 즉시 구매가 완료되었습니다!');
      } else {
        alert('✅ 입찰이 완료되었습니다!');
      }

      setShowBidModal(false);
      setSelectedAuction(null);
      setBidAmount(0);
      fetchAuctions();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '입찰에 실패했습니다');
    }
  };

  const openBidModal = (auction: Auction) => {
    setSelectedAuction(auction);
    const minimumBid = auction.highest_bid
      ? auction.highest_bid + 1000000
      : auction.starting_price;
    setBidAmount(minimumBid);
    setShowBidModal(true);
  };

  const openCreateModal = async () => {
    await fetchMyCards();
    setShowCreateModal(true);
  };

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return '종료됨';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    return `${minutes}분`;
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGEND': return '#ff6b6b';
      case 'EPIC': return '#a29bfe';
      case 'RARE': return '#74b9ff';
      default: return '#95a5a6';
    }
  };

  return (
    <div className="posting">
      <div className="posting-container">
        <div className="posting-header">
          <h1 className="posting-title">🏪 경매장</h1>
          <div className="header-actions">
            <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>
              ❓ 튜토리얼
            </button>
            <button className="btn-create" onClick={openCreateModal}>
              📤 경매 등록
            </button>
          </div>
        </div>

        <div className="tab-selector">
          <button
            className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`}
            onClick={() => setActiveTab('market')}
          >
            🏪 마켓
          </button>
          <button
            className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
            onClick={() => setActiveTab('my')}
          >
            📋 내 경매
          </button>
        </div>

        <div className="auctions-grid">
          {auctions.length === 0 ? (
            <div className="no-auctions">
              <p>현재 진행 중인 경매가 없습니다</p>
            </div>
          ) : (
            auctions.map((auction) => (
              <div key={auction.id} className="auction-card">
                <div className="auction-card-header">
                  <span
                    className="auction-rarity"
                    style={{ backgroundColor: getRarityColor(auction.rarity) }}
                  >
                    {auction.rarity}
                  </span>
                  <span className="auction-position">{auction.position}</span>
                </div>

                <div className="auction-card-body">
                  <h3 className="auction-card-name">{auction.card_name}</h3>
                  <div className="auction-stats">
                    <span className="stat">코스트: {auction.cost}</span>
                    <span className="stat">파워: {auction.power}</span>
                  </div>
                </div>

                <div className="auction-card-prices">
                  <div className="price-row">
                    <span className="price-label">시작가</span>
                    <span className="price-value">
                      {auction.starting_price.toLocaleString()}원
                    </span>
                  </div>
                  {auction.buyout_price && (
                    <div className="price-row">
                      <span className="price-label">즉시구매</span>
                      <span className="price-value buyout">
                        {auction.buyout_price.toLocaleString()}원
                      </span>
                    </div>
                  )}
                  {auction.highest_bid > 0 && (
                    <div className="price-row current-bid">
                      <span className="price-label">현재가</span>
                      <span className="price-value">
                        {auction.highest_bid.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>

                <div className="auction-card-info">
                  <div className="info-row">
                    <span className="info-label">판매자</span>
                    <span className="info-value">{auction.seller_team_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">입찰 수</span>
                    <span className="info-value">{auction.bid_count}건</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">남은 시간</span>
                    <span className="info-value time">
                      {getTimeRemaining(auction.end_time)}
                    </span>
                  </div>
                </div>

                <button
                  className="btn-bid"
                  onClick={() => openBidModal(auction)}
                >
                  💰 입찰하기
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Auction Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 경매 등록</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>카드 선택</label>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="select-input"
                >
                  <option value="">선택하세요</option>
                  {myCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.card_name} ({card.position}) - 파워: {card.power}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>시작가 (원)</label>
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(Number(e.target.value))}
                  min="1000000"
                  step="1000000"
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label>즉시구매가 (원, 선택)</label>
                <input
                  type="number"
                  value={buyoutPrice}
                  onChange={(e) => setBuyoutPrice(Number(e.target.value))}
                  min="1000000"
                  step="1000000"
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label>경매 기간 (시간)</label>
                <select
                  value={durationHours}
                  onChange={(e) => setDurationHours(Number(e.target.value))}
                  className="select-input"
                >
                  <option value="6">6시간</option>
                  <option value="12">12시간</option>
                  <option value="24">24시간</option>
                  <option value="48">48시간</option>
                </select>
              </div>

              <button className="btn-submit" onClick={handleCreateAuction}>
                경매 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Modal */}
      {showBidModal && selectedAuction && (
        <div className="modal-overlay" onClick={() => setShowBidModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 입찰하기</h2>
              <button className="btn-close" onClick={() => setShowBidModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="bid-card-info">
                <h3>{selectedAuction.card_name}</h3>
                <p>{selectedAuction.position} | 파워: {selectedAuction.power}</p>
              </div>

              <div className="bid-price-info">
                {selectedAuction.highest_bid > 0 ? (
                  <div className="price-info-row">
                    <span>현재 최고가:</span>
                    <span className="price-highlight">
                      {selectedAuction.highest_bid.toLocaleString()}원
                    </span>
                  </div>
                ) : (
                  <div className="price-info-row">
                    <span>시작가:</span>
                    <span className="price-highlight">
                      {selectedAuction.starting_price.toLocaleString()}원
                    </span>
                  </div>
                )}
                {selectedAuction.buyout_price && (
                  <div className="price-info-row">
                    <span>즉시구매가:</span>
                    <span className="price-buyout">
                      {selectedAuction.buyout_price.toLocaleString()}원
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>입찰 금액 (원)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  min={selectedAuction.highest_bid
                    ? selectedAuction.highest_bid + 1000000
                    : selectedAuction.starting_price}
                  step="1000000"
                  className="number-input"
                />
                <p className="input-hint">
                  최소 입찰가: {(selectedAuction.highest_bid
                    ? selectedAuction.highest_bid + 1000000
                    : selectedAuction.starting_price).toLocaleString()}원
                </p>
              </div>

              <button className="btn-submit" onClick={handleBid}>
                입찰하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal-content tutorial" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📚 경매장 튜토리얼</h2>
              <button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tutorial-section">
                <h3>🏪 경매 시스템</h3>
                <p>선수 카드를 사고 팔 수 있는 경매장입니다.</p>
              </div>
              <div className="tutorial-section">
                <h3>📤 경매 등록</h3>
                <p>• 로스터에 배치되지 않은 카드만 등록 가능합니다</p>
                <p>• 시작가와 즉시구매가를 설정할 수 있습니다</p>
                <p>• 경매 기간은 6~48시간까지 선택 가능합니다</p>
              </div>
              <div className="tutorial-section">
                <h3>💰 입찰</h3>
                <p>• 현재 최고가 + 100만원부터 입찰 가능합니다</p>
                <p>• 즉시구매가로 입찰하면 바로 카드를 획득합니다</p>
                <p>• 입찰이 있는 경매는 취소할 수 없습니다</p>
              </div>
              <div className="tutorial-section">
                <h3>⚠️ 주의사항</h3>
                <p>• 자신의 경매에는 입찰할 수 없습니다</p>
                <p>• 잔액이 부족하면 입찰할 수 없습니다</p>
                <p>• 경매 시간이 종료되면 최고 입찰자가 카드를 획득합니다</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posting;
