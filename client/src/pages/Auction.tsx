import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Auction.css';

interface Auction {
  id: string;
  card_name: string;
  position: string;
  cost: number;
  power: number;
  rarity: string;
  starting_price: number;
  buyout_price: number | null;
  current_price: number;
  end_time: string;
  seller_team_name: string;
  bid_count: number;
  highest_bidder_name: string | null;
  is_my_auction: boolean;
  is_my_bid: boolean;
}

interface MyBid {
  auction_id: string;
  card_name: string;
  bid_amount: number;
  is_winning: boolean;
  end_time: string;
}

const Auction: React.FC = () => {
  const { team, refreshAuth } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<MyBid[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'my-bids' | 'my-auctions'>('all');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [showBidModal, setShowBidModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
    fetchMyBids();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await api.get('/posting/auctions');
      setAuctions(response.data.auctions || []);
    } catch (error) {
      console.error('경매 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      const response = await api.get('/posting/my-bids');
      setMyBids(response.data.bids || []);
    } catch (error) {
      console.error('내 입찰 조회 실패:', error);
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
        alert('즉시 구매가 완료되었습니다!');
      } else {
        alert('입찰이 완료되었습니다!');
      }

      setShowBidModal(false);
      setSelectedAuction(null);
      setBidAmount(0);
      fetchAuctions();
      fetchMyBids();
      refreshAuth();
    } catch (error: any) {
      alert(error.response?.data?.error || '입찰에 실패했습니다');
    }
  };

  const openBidModal = (auction: Auction) => {
    setSelectedAuction(auction);
    const minimumBid = auction.current_price > 0
      ? auction.current_price + 1000000
      : auction.starting_price;
    setBidAmount(minimumBid);
    setShowBidModal(true);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'LEGEND': return '#ff6b6b';
      case 'EPIC': return '#a29bfe';
      case 'RARE': return '#74b9ff';
      default: return '#95a5a6';
    }
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

  const filteredAuctions = auctions.filter((auction) => {
    if (activeTab === 'my-auctions') return auction.is_my_auction;
    if (activeTab === 'my-bids') return auction.is_my_bid;
    return true;
  });

  if (loading) {
    return (
      <div className="auction-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="auction">
      <div className="auction-container">
        <div className="auction-header">
          <h1 className="auction-title">💰 경매장</h1>
          {team && (
            <div className="balance-display">
              <span className="balance-label">보유 자금:</span>
              <span className="balance-value">{team.balance.toLocaleString()}원</span>
            </div>
          )}
        </div>

        <div className="auction-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            🏪 전체 경매
          </button>
          <button
            className={`tab-btn ${activeTab === 'my-bids' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-bids')}
          >
            💵 내 입찰 ({myBids.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'my-auctions' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-auctions')}
          >
            📋 내 경매
          </button>
        </div>

        <div className="auctions-grid">
          {filteredAuctions.length === 0 ? (
            <div className="no-auctions">
              {activeTab === 'all' && '현재 진행 중인 경매가 없습니다'}
              {activeTab === 'my-bids' && '입찰한 경매가 없습니다'}
              {activeTab === 'my-auctions' && '등록한 경매가 없습니다'}
            </div>
          ) : (
            filteredAuctions.map((auction) => (
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

                <div className="auction-price-section">
                  <div className="price-row">
                    <span className="price-label">시작가</span>
                    <span className="price-value">
                      {auction.starting_price.toLocaleString()}원
                    </span>
                  </div>
                  {auction.current_price > 0 && (
                    <div className="price-row current">
                      <span className="price-label">현재가</span>
                      <span className="price-value highlight">
                        {auction.current_price.toLocaleString()}원
                      </span>
                    </div>
                  )}
                  {auction.buyout_price && (
                    <div className="price-row buyout">
                      <span className="price-label">즉구</span>
                      <span className="price-value buyout-price">
                        {auction.buyout_price.toLocaleString()}원
                      </span>
                    </div>
                  )}
                </div>

                <div className="auction-info-section">
                  <div className="info-row">
                    <span className="info-icon">👤</span>
                    <span className="info-text">{auction.seller_team_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-icon">📊</span>
                    <span className="info-text">{auction.bid_count}건 입찰</span>
                  </div>
                  <div className="info-row">
                    <span className="info-icon">⏰</span>
                    <span className="info-text">{getTimeRemaining(auction.end_time)}</span>
                  </div>
                  {auction.highest_bidder_name && (
                    <div className="info-row">
                      <span className="info-icon">🏆</span>
                      <span className="info-text">{auction.highest_bidder_name}</span>
                    </div>
                  )}
                </div>

                {!auction.is_my_auction && (
                  <button
                    className="btn-bid"
                    onClick={() => openBidModal(auction)}
                  >
                    💰 입찰하기
                  </button>
                )}

                {auction.is_my_auction && (
                  <div className="my-auction-badge">내 경매</div>
                )}

                {auction.is_my_bid && !auction.is_my_auction && (
                  <div className="my-bid-badge">
                    {auction.highest_bidder_name === team?.team_name ? '🏆 최고가' : '입찰 중'}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showBidModal && selectedAuction && (
        <div className="modal-overlay" onClick={() => setShowBidModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 입찰하기</h2>
              <button className="btn-close" onClick={() => setShowBidModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="bid-card-info">
                <h3>{selectedAuction.card_name}</h3>
                <div className="bid-card-details">
                  <span>{selectedAuction.position}</span>
                  <span>파워: {selectedAuction.power}</span>
                  <span
                    className="rarity-badge"
                    style={{ backgroundColor: getRarityColor(selectedAuction.rarity) }}
                  >
                    {selectedAuction.rarity}
                  </span>
                </div>
              </div>

              <div className="bid-price-info">
                <div className="price-info-row">
                  <span>시작가:</span>
                  <span className="price-highlight">
                    {selectedAuction.starting_price.toLocaleString()}원
                  </span>
                </div>
                {selectedAuction.current_price > 0 && (
                  <div className="price-info-row">
                    <span>현재 최고가:</span>
                    <span className="price-highlight">
                      {selectedAuction.current_price.toLocaleString()}원
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
                  min={
                    selectedAuction.current_price > 0
                      ? selectedAuction.current_price + 1000000
                      : selectedAuction.starting_price
                  }
                  step="1000000"
                  className="number-input"
                />
                <p className="input-hint">
                  최소 입찰가:{' '}
                  {(selectedAuction.current_price > 0
                    ? selectedAuction.current_price + 1000000
                    : selectedAuction.starting_price
                  ).toLocaleString()}
                  원
                </p>
              </div>

              <div className="quick-bid-buttons">
                <button
                  className="quick-bid-btn"
                  onClick={() =>
                    setBidAmount(
                      (selectedAuction.current_price || selectedAuction.starting_price) +
                        1000000
                    )
                  }
                >
                  +100만
                </button>
                <button
                  className="quick-bid-btn"
                  onClick={() =>
                    setBidAmount(
                      (selectedAuction.current_price || selectedAuction.starting_price) +
                        5000000
                    )
                  }
                >
                  +500만
                </button>
                <button
                  className="quick-bid-btn"
                  onClick={() =>
                    setBidAmount(
                      (selectedAuction.current_price || selectedAuction.starting_price) +
                        10000000
                    )
                  }
                >
                  +1000만
                </button>
                {selectedAuction.buyout_price && (
                  <button
                    className="quick-bid-btn buyout"
                    onClick={() => setBidAmount(selectedAuction.buyout_price!)}
                  >
                    즉시구매
                  </button>
                )}
              </div>

              <button className="btn-submit" onClick={handleBid}>
                입찰하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auction;
