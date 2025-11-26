import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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
  status: string;
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
  const { team, refreshAuth } = useAuth();
  const { showToast } = useToast();
  
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [myAuctions, setMyAuctions] = useState<Auction[]>([]);
  const [myCards, setMyCards] = useState<MyCard[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  // Form states
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [startingPrice, setStartingPrice] = useState<number>(1000000);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(5000000);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [bidAmount, setBidAmount] = useState<number>(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [rarityFilter, setRarityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('end_time_asc');


  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/posting/auctions');
      setAuctions(response.data.auctions);
    } catch (error) {
      console.error('경매 목록 조회 실패:', error);
      showToast('마켓 경매 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchMyAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/posting/my-auctions');
      setMyAuctions(response.data.auctions);
    } catch (error) {
      console.error('내 경매 목록 조회 실패:', error);
      showToast('내 경매 목록을 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'market') {
      fetchAuctions();
    } else {
      fetchMyAuctions();
    }
  }, [activeTab, fetchAuctions, fetchMyAuctions]);

  const fetchMyCards = async () => {
    try {
      const response = await api.get('/gacha/collection');
      const availableCards = response.data.playerCards.filter((card: MyCard) => !card.is_in_roster);
      setMyCards(availableCards);
    } catch (error) {
      showToast('등록 가능한 카드 목록을 불러오는데 실패했습니다.', 'error');
    }
  };

  const handleCreateAuction = async () => {
    if (!selectedCard) {
      showToast('카드를 선택해주세요!', 'error');
      return;
    }
    try {
      await api.post('/posting/create', { userCardId: selectedCard, startingPrice, buyoutPrice, durationHours });
      showToast('경매가 성공적으로 등록되었습니다!', 'success');
      setShowCreateModal(false);
      setSelectedCard('');
      fetchAuctions();
      if(activeTab === 'my') fetchMyAuctions();
      refreshAuth();
    } catch (error: any) {
      showToast(error.response?.data?.error || '경매 등록에 실패했습니다', 'error');
    }
  };

  const handleBid = async () => {
    if (!selectedAuction) return;
    try {
      const response = await api.post('/posting/bid', { auctionId: selectedAuction.id, bidAmount });
      if (response.data.isBuyout) {
        showToast('🎉 즉시 구매가 완료되었습니다!', 'success');
      } else {
        showToast('✅ 입찰이 완료되었습니다!', 'success');
      }
      setShowBidModal(false);
      fetchAuctions();
      refreshAuth();
    } catch (error: any) {
      showToast(error.response?.data?.error || '입찰에 실패했습니다', 'error');
    }
  };
  
  const handleCancelAuction = async (auctionId: string) => {
    if (!window.confirm('정말로 이 경매를 취소하시겠습니까?')) return;
    try {
        await api.post(`/posting/cancel/${auctionId}`);
        showToast('경매가 취소되었습니다.', 'success');
        fetchMyAuctions();
    } catch (error: any) {
        showToast(error.response?.data?.error || '경매 취소에 실패했습니다.', 'error');
    }
  };

  const openBidModal = (auction: Auction) => {
    if (auction.seller_team_name === team?.team_name) {
      showToast('자신의 경매에는 입찰할 수 없습니다.', 'error');
      return;
    }
    setSelectedAuction(auction);
    const minimumBid = auction.highest_bid ? auction.highest_bid + 100000 : auction.starting_price;
    setBidAmount(minimumBid);
    setShowBidModal(true);
  };

  const openCreateModal = async () => {
    await fetchMyCards();
    setShowCreateModal(true);
  };

  const getTimeRemaining = (endTime: string) => {
    const diff = new Date(endTime).getTime() - new Date().getTime();
    if (diff <= 0) return { text: '종료됨', ended: true, diff };
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return { text: `${hours}시간 ${minutes}분`, ended: false, diff };
    return { text: `${minutes}분`, ended: false, diff };
  };

  const getRarityColor = (rarity: string) => ({
    'LEGEND': '#ff6b6b', 'EPIC': '#a29bfe', 'RARE': '#74b9ff'
  }[rarity] || '#95a5a6');
  
  const filteredAuctions = useMemo(() => {
    let items = activeTab === 'market' ? auctions : myAuctions;

    if (activeTab === 'market') {
        items = items.filter(auc => {
            return (searchTerm === '' || auc.card_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
                   (positionFilter === 'ALL' || auc.position === positionFilter) &&
                   (rarityFilter === 'ALL' || auc.rarity === rarityFilter);
        });

        items.sort((a, b) => {
            const aPrice = a.highest_bid || a.starting_price;
            const bPrice = b.highest_bid || b.starting_price;
            const aTime = new Date(a.end_time).getTime();
            const bTime = new Date(b.end_time).getTime();

            switch (sortBy) {
                case 'end_time_asc': return aTime - bTime;
                case 'end_time_desc': return bTime - aTime;
                case 'price_asc': return aPrice - bPrice;
                case 'price_desc': return bPrice - aPrice;
                case 'power_desc': return b.power - a.power;
                default: return 0;
            }
        });
    }
    return items;
  }, [auctions, myAuctions, activeTab, searchTerm, positionFilter, rarityFilter, sortBy]);

  const renderAuctionCard = (auction: Auction) => {
    const time = getTimeRemaining(auction.end_time);
    const isMyAuction = auction.seller_team_name === team?.team_name;

    return (
      <div key={auction.id} className={`auction-card ${time.ended || auction.status !== 'active' ? 'ended' : ''}`}>
        <div className="auction-card-header">
          <span className="auction-rarity" style={{ backgroundColor: getRarityColor(auction.rarity) }}>{auction.rarity}</span>
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
          <div className="price-row"><span className="price-label">시작가</span><span className="price-value">{auction.starting_price.toLocaleString()}원</span></div>
          {auction.buyout_price > 0 && <div className="price-row"><span className="price-label">즉시구매</span><span className="price-value buyout">{auction.buyout_price.toLocaleString()}원</span></div>}
          {auction.highest_bid > 0 && <div className="price-row current-bid"><span className="price-label">현재가</span><span className="price-value">{auction.highest_bid.toLocaleString()}원</span></div>}
        </div>
        <div className="auction-card-info">
          <div className="info-row"><span className="info-label">판매자</span><span className="info-value">{auction.seller_team_name}</span></div>
          <div className="info-row"><span className="info-label">입찰 수</span><span className="info-value">{auction.bid_count}건</span></div>
          <div className="info-row"><span className="info-label">남은 시간</span><span className="info-value time">{time.text}</span></div>
        </div>
        {activeTab === 'my' || isMyAuction ? (
            <button className="btn-cancel" onClick={() => handleCancelAuction(auction.id)} disabled={time.ended || auction.bid_count > 0 || auction.status !== 'active'}>
                {auction.status !== 'active' ? auction.status.toUpperCase() : (auction.bid_count > 0 ? '입찰 존재' : '경매 취소')}
            </button>
        ) : (
            <button className="btn-bid" onClick={() => openBidModal(auction)} disabled={time.ended}>
                💰 입찰하기
            </button>
        )}
      </div>
    );
  };

  return (
    <div className="posting">
      <div className="posting-container">
        <div className="posting-header">
          <h1 className="posting-title">🏪 경매장</h1>
          <div className="header-actions">
            <button className="btn-tutorial" onClick={() => setShowTutorial(true)}>❓ 튜토리얼</button>
            <button className="btn-create" onClick={openCreateModal}>📤 경매 등록</button>
          </div>
        </div>

        <div className="tab-selector">
          <button className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`} onClick={() => setActiveTab('market')}>🏪 마켓</button>
          <button className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`} onClick={() => setActiveTab('my')}>📋 내 경매</button>
        </div>
        
        {activeTab === 'market' && (
          <div className="filter-bar">
              <input type="text" placeholder="선수 이름 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="filter-input"/>
              <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)} className="filter-select">
                  <option value="ALL">모든 포지션</option>
                  <option value="TOP">TOP</option><option value="JUNGLE">JUNGLE</option><option value="MID">MID</option>
                  <option value="ADC">ADC</option><option value="SUPPORT">SUPPORT</option>
              </select>
              <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value)} className="filter-select">
                  <option value="ALL">모든 등급</option>
                  <option value="NORMAL">NORMAL</option><option value="RARE">RARE</option>
                  <option value="EPIC">EPIC</option><option value="LEGEND">LEGEND</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
                  <option value="end_time_asc">마감 임박순</option>
                  <option value="end_time_desc">최신 등록순</option>
                  <option value="price_asc">낮은 가격순</option>
                  <option value="price_desc">높은 가격순</option>
                  <option value="power_desc">파워 높은순</option>
              </select>
          </div>
        )}

        <div className="auctions-grid">
          {loading ? <div className="spinner-container"><div className="spinner"></div></div> : (
            filteredAuctions.length === 0 ? (
              <div className="no-auctions"><p>현재 표시할 경매가 없습니다.</p></div>
            ) : (
              filteredAuctions.map(renderAuctionCard)
            )
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>📤 경매 등록</h2><button className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label>카드 선택</label><select value={selectedCard} onChange={(e) => setSelectedCard(e.target.value)} className="select-input"><option value="">선택하세요</option>{myCards.map((card) => <option key={card.id} value={card.id}>{card.card_name} ({card.position}) - 파워: {card.power}</option>)}</select></div>
              <div className="form-group"><label>시작가 (원)</label><input type="number" value={startingPrice} onChange={(e) => setStartingPrice(Number(e.target.value))} min="100000" step="100000" className="number-input"/></div>
              <div className="form-group"><label>즉시구매가 (원, 선택)</label><input type="number" value={buyoutPrice} onChange={(e) => setBuyoutPrice(Number(e.target.value))} min={startingPrice} step="100000" className="number-input"/></div>
              <div className="form-group"><label>경매 기간 (시간)</label><select value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value))} className="select-input"><option value="6">6시간</option><option value="12">12시간</option><option value="24">24시간</option><option value="48">48시간</option></select></div>
              <button className="btn-submit" onClick={handleCreateAuction}>경매 등록</button>
            </div>
          </div>
        </div>
      )}

      {showBidModal && selectedAuction && (
        <div className="modal-overlay" onClick={() => setShowBidModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>💰 입찰하기</h2><button className="btn-close" onClick={() => setShowBidModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="bid-card-info"><h3>{selectedAuction.card_name}</h3><p>{selectedAuction.position} | 파워: {selectedAuction.power}</p></div>
              <div className="bid-price-info">
                <div className="price-info-row"><span>{selectedAuction.highest_bid > 0 ? "현재 최고가" : "시작가"}:</span><span className="price-highlight">{(selectedAuction.highest_bid || selectedAuction.starting_price).toLocaleString()}원</span></div>
                {selectedAuction.buyout_price > 0 && <div className="price-info-row"><span>즉시구매가:</span><span className="price-buyout">{selectedAuction.buyout_price.toLocaleString()}원</span></div>}
              </div>
              <div className="form-group">
                <label>입찰 금액 (원)</label>
                <input type="number" value={bidAmount} onChange={(e) => setBidAmount(Number(e.target.value))} min={selectedAuction.highest_bid ? selectedAuction.highest_bid + 100000 : selectedAuction.starting_price} step="100000" className="number-input"/>
                <p className="input-hint">최소 입찰가: {(selectedAuction.highest_bid ? selectedAuction.highest_bid + 100000 : selectedAuction.starting_price).toLocaleString()}원</p>
              </div>
              <button className="btn-submit" onClick={handleBid}>입찰하기</button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="modal-content tutorial" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>📚 경매장 튜토리얼</h2><button className="btn-close" onClick={() => setShowTutorial(false)}>✕</button></div>
            <div className="modal-body">
              <div className="tutorial-section"><h3>🏪 경매 시스템</h3><p>선수 카드를 사고 팔 수 있는 경매장입니다.</p></div>
              <div className="tutorial-section"><h3>📤 경매 등록</h3><p>• 로스터에 배치되지 않은 카드만 등록 가능합니다</p><p>• 시작가와 즉시구매가를 설정할 수 있습니다</p><p>• 경매 기간은 6~48시간까지 선택 가능합니다</p></div>
              <div className="tutorial-section"><h3>💰 입찰</h3><p>• 현재 최고가 + 10만원부터 입찰 가능합니다</p><p>• 즉시구매가로 입찰하면 바로 카드를 획득합니다</p><p>• 입찰이 있는 경매는 취소할 수 없습니다</p></div>
              <div className="tutorial-section"><h3>⚠️ 주의사항</h3><p>• 자신의 경매에는 입찰할 수 없습니다</p><p>• 잔액이 부족하면 입찰할 수 없습니다</p><p>• 경매 시간이 종료되면 최고 입찰자가 카드를 획득합니다</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posting;
