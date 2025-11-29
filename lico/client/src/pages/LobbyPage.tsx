import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Coin } from '../types';
import './LobbyPage.css';

interface CoinWithStats extends Coin {
  profit_rate_24h?: number;
  trade_count_24h?: number;
  is_blacklisted?: boolean;
  creator_can_trade?: boolean;
  is_supply_limited?: boolean;
}

const LobbyPage = () => {
  const navigate = useNavigate();
  const [coins, setCoins] = useState<CoinWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'profit_rate' | 'volume' | 'market_cap'>('profit_rate');
  const [filterType, setFilterType] = useState<'ALL' | 'MAJOR' | 'MEME'>('ALL');

  useEffect(() => {
    fetchCoins();
    const interval = setInterval(fetchCoins, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchCoins = async () => {
    try {
      const response = await api.get('/coins', {
        params: { status: 'ACTIVE' }
      });
      const coinsData = response.data.coins || [];

      // 수익률 계산 및 정렬
      const coinsWithStats = coinsData.map((coin: CoinWithStats) => ({
        ...coin,
        profit_rate_24h: coin.price_change_24h || 0,
      }));

      setCoins(coinsWithStats);
    } catch (error) {
      console.error('Failed to fetch coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatPrice = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const handleCoinClick = (symbol: string) => {
    navigate(`/trading/${symbol}`);
  };

  // 필터링
  const filteredCoins = coins.filter(coin => {
    if (filterType === 'ALL') return true;
    return coin.coin_type === filterType;
  });

  // 정렬
  const sortedCoins = [...filteredCoins].sort((a, b) => {
    if (sortBy === 'profit_rate') {
      return (b.profit_rate_24h || 0) - (a.profit_rate_24h || 0);
    } else if (sortBy === 'volume') {
      const aVol = typeof a.volume_24h === 'string' ? parseFloat(a.volume_24h) : (a.volume_24h || 0);
      const bVol = typeof b.volume_24h === 'string' ? parseFloat(b.volume_24h) : (b.volume_24h || 0);
      return bVol - aVol;
    } else if (sortBy === 'market_cap') {
      const aMc = typeof a.market_cap === 'string' ? parseFloat(a.market_cap) : (a.market_cap || 0);
      const bMc = typeof b.market_cap === 'string' ? parseFloat(b.market_cap) : (b.market_cap || 0);
      return bMc - aMc;
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="lobby-page">
        <div className="loading-container">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h1>🏦 LICO 거래소</h1>
        <p>실시간 코인 시장 현황</p>
      </div>

      {/* 시장 현황판 */}
      <div className="market-overview">
        <div className="overview-card">
          <div className="card-label">총 코인 수</div>
          <div className="card-value">{coins.length}개</div>
        </div>
        <div className="overview-card">
          <div className="card-label">24시간 최고 수익률</div>
          <div className="card-value positive">
            {coins.length > 0 ? `+${Math.max(...coins.map(c => c.profit_rate_24h || 0)).toFixed(2)}%` : '0%'}
          </div>
        </div>
        <div className="overview-card">
          <div className="card-label">24시간 최저 수익률</div>
          <div className="card-value negative">
            {coins.length > 0 ? `${Math.min(...coins.map(c => c.profit_rate_24h || 0)).toFixed(2)}%` : '0%'}
          </div>
        </div>
        <div className="overview-card">
          <div className="card-label">MAJOR 코인</div>
          <div className="card-value">{coins.filter(c => c.coin_type === 'MAJOR').length}개</div>
        </div>
        <div className="overview-card">
          <div className="card-label">MEME 코인</div>
          <div className="card-value">{coins.filter(c => c.coin_type === 'MEME').length}개</div>
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="controls">
        <div className="filter-buttons">
          <button
            className={filterType === 'ALL' ? 'active' : ''}
            onClick={() => setFilterType('ALL')}
          >
            전체
          </button>
          <button
            className={filterType === 'MAJOR' ? 'active' : ''}
            onClick={() => setFilterType('MAJOR')}
          >
            MAJOR
          </button>
          <button
            className={filterType === 'MEME' ? 'active' : ''}
            onClick={() => setFilterType('MEME')}
          >
            MEME
          </button>
        </div>

        <div className="sort-buttons">
          <label>정렬:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="profit_rate">수익률 순</option>
            <option value="volume">거래량 순</option>
            <option value="market_cap">시가총액 순</option>
          </select>
        </div>
      </div>

      {/* 코인 목록 테이블 */}
      <div className="coins-table-container">
        <table className="coins-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>코인</th>
              <th>타입</th>
              <th>현재가</th>
              <th>24h 변동</th>
              <th>24h 거래량</th>
              <th>시가총액</th>
              <th>블랙리스트</th>
              <th>제작자 거래</th>
              <th>발행 제한</th>
              <th>거래</th>
            </tr>
          </thead>
          <tbody>
            {sortedCoins.map((coin, index) => {
              const currentPrice = typeof coin.current_price === 'string'
                ? parseFloat(coin.current_price)
                : (coin.current_price || 0);
              const volume24h = typeof coin.volume_24h === 'string'
                ? parseFloat(coin.volume_24h)
                : (coin.volume_24h || 0);
              const marketCap = typeof coin.market_cap === 'string'
                ? parseFloat(coin.market_cap)
                : (coin.market_cap || 0);
              const profitRate = coin.profit_rate_24h || 0;

              return (
                <tr key={coin.id} className="coin-row">
                  <td className="rank">{index + 1}</td>
                  <td className="coin-info">
                    <div className="coin-detail">
                      {coin.logo_url && (
                        <img src={coin.logo_url} alt={coin.symbol} className="coin-logo-small" />
                      )}
                      <div>
                        <div className="coin-symbol">{coin.symbol}</div>
                        <div className="coin-name">{coin.name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`type-badge ${coin.coin_type?.toLowerCase()}`}>
                      {coin.coin_type === 'MAJOR' ? 'MAJOR' : 'MEME'}
                    </span>
                  </td>
                  <td className="price">{formatPrice(currentPrice)} G</td>
                  <td className={profitRate >= 0 ? 'positive' : 'negative'}>
                    {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                  </td>
                  <td>{formatNumber(volume24h)}</td>
                  <td>{formatNumber(marketCap)} G</td>
                  <td>
                    <span className={`badge ${coin.is_blacklisted ? 'badge-no' : 'badge-yes'}`}>
                      {coin.is_blacklisted ? '예' : '아니요'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${coin.creator_can_trade === false ? 'badge-no' : 'badge-yes'}`}>
                      {coin.creator_can_trade === false ? '불가' : '가능'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${coin.is_supply_limited ? 'badge-yes' : 'badge-no'}`}>
                      {coin.is_supply_limited ? '예' : '아니요'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="trade-button"
                      onClick={() => handleCoinClick(coin.symbol)}
                      disabled={coin.is_blacklisted}
                    >
                      {coin.is_blacklisted ? '거래 불가' : '거래하기'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LobbyPage;
