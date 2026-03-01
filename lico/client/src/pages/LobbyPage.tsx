import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Stock } from '../types';
import './LobbyPage.css';

interface StockWithStats extends Stock {
  profit_rate_24h?: number;
  trade_count_24h?: number;
  is_blacklisted?: boolean;
  founder_can_trade?: boolean;
  is_supply_limited?: boolean;
}

const LobbyPage = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<StockWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'profit_rate' | 'volume' | 'market_cap'>('profit_rate');

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const fetchStocks = async () => {
    try {
      const response = await api.get('/stocks', {
        params: { status: 'ACTIVE' }
      });
      const stocksData = response.data.stocks || [];

      // 수익률 계산 및 정렬
      const stocksWithStats = stocksData.map((stock: StockWithStats) => ({
        ...stock,
        profit_rate_24h: stock.price_change_24h || 0,
      }));

      setStocks(stocksWithStats);
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
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

  const handleStockClick = (symbol: string) => {
    navigate(`/trading/${symbol}`);
  };

  // 정렬
  const sortedStocks = [...stocks].sort((a, b) => {
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
        <div>
          <h1>LICO 증권거래소</h1>
          <p>실시간 주식 시장 현황</p>
        </div>
      </div>

      {/* 시장 현황판 */}
      <div className="market-overview">
        <div className="overview-card">
          <div className="card-label">총 종목 수</div>
          <div className="card-value">{stocks.length}개</div>
        </div>
        <div className="overview-card">
          <div className="card-label">24시간 최고 수익률</div>
          <div className="card-value positive">
            {stocks.length > 0 ? `+${Math.max(...stocks.map(c => c.profit_rate_24h || 0)).toFixed(2)}%` : '0%'}
          </div>
        </div>
        <div className="overview-card">
          <div className="card-label">24시간 최저 수익률</div>
          <div className="card-value negative">
            {stocks.length > 0 ? `${Math.min(...stocks.map(c => c.profit_rate_24h || 0)).toFixed(2)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* 정렬 */}
      <div className="controls">
        <div className="sort-buttons">
          <label>정렬:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="profit_rate">수익률 순</option>
            <option value="volume">거래량 순</option>
            <option value="market_cap">시가총액 순</option>
          </select>
        </div>
      </div>

      {/* 종목 목록 테이블 */}
      <div className="coins-table-container">
        <table className="coins-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>종목</th>
              <th>현재가</th>
              <th>24h 변동</th>
              <th>24h 거래량</th>
              <th>시가총액</th>
              <th>블랙리스트</th>
              <th>창업자 거래</th>
              <th>발행 제한</th>
              <th>거래</th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map((stock, index) => {
              const currentPrice = typeof stock.current_price === 'string'
                ? parseFloat(stock.current_price)
                : (stock.current_price || 0);
              const volume24h = typeof stock.volume_24h === 'string'
                ? parseFloat(stock.volume_24h)
                : (stock.volume_24h || 0);
              const marketCap = typeof stock.market_cap === 'string'
                ? parseFloat(stock.market_cap)
                : (stock.market_cap || 0);
              const profitRate = typeof stock.profit_rate_24h === 'string'
                ? parseFloat(stock.profit_rate_24h)
                : (stock.profit_rate_24h || 0);

              return (
                <tr key={stock.id} className="coin-row">
                  <td className="rank">{index + 1}</td>
                  <td className="coin-info">
                    <div className="coin-detail">
                      {stock.logo_url && (
                        <img src={stock.logo_url} alt={stock.symbol} className="coin-logo-small" />
                      )}
                      <div>
                        <div className="coin-symbol">{stock.symbol}</div>
                        <div className="coin-name">{stock.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="price">
                    <div>{formatPrice(currentPrice)} G</div>
                  </td>
                  <td className={profitRate >= 0 ? 'positive' : 'negative'}>
                    {profitRate >= 0 ? '+' : ''}{profitRate.toFixed(2)}%
                  </td>
                  <td>{formatNumber(volume24h)}</td>
                  <td>
                    {formatNumber(marketCap)} G
                  </td>
                  <td>
                    <span className={`badge ${stock.is_blacklisted ? 'badge-no' : 'badge-yes'}`}>
                      {stock.is_blacklisted ? '예' : '아니요'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${stock.founder_can_trade === false ? 'badge-no' : 'badge-yes'}`}>
                      {stock.founder_can_trade === false ? '불가' : '가능'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${stock.is_supply_limited ? 'badge-yes' : 'badge-no'}`}>
                      {stock.is_supply_limited ? '예' : '아니요'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="trade-button"
                      onClick={() => handleStockClick(stock.symbol)}
                      disabled={stock.is_blacklisted}
                    >
                      {stock.is_blacklisted ? '거래 불가' : '거래하기'}
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
