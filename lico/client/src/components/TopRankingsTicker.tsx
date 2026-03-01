import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Stock } from '../types';
import './TopRankingsTicker.css';

interface RankingData {
  topGainers: Stock[];
  topLosers: Stock[];
  topActive: Stock[];
}

const TopRankingsTicker = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<RankingData>({
    topGainers: [],
    topLosers: [],
    topActive: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await api.get('/stocks/rankings/top5');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch rankings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
    // 10초마다 업데이트
    const interval = setInterval(fetchRankings, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '0';
    return numPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatChange = (change: number | string | null | undefined) => {
    const numChange = typeof change === 'string' ? parseFloat(change) : (change || 0);
    if (isNaN(numChange)) return '+0.00%';
    const sign = numChange >= 0 ? '+' : '';
    return `${sign}${numChange.toFixed(2)}%`;
  };

  const handleStockClick = (symbol: string) => {
    navigate(`/trading/${symbol}`);
  };

  if (loading) {
    return (
      <div className="top-rankings-ticker">
        <div className="ticker-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="top-rankings-ticker">
      <div className="ticker-section">
        <div className="ticker-label gainers">
          <span className="label-icon">📈</span>
          <span className="label-text">상승</span>
        </div>
        <div className="ticker-items">
          {data.topGainers.map((stock) => (
            <div
              key={stock.id}
              className="ticker-item gainer"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <span className="coin-symbol">{stock.symbol}</span>
              <span className="coin-price">{formatPrice(stock.current_price)} G</span>
              <span className="coin-change positive">{formatChange(stock.price_change_24h)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker-section">
        <div className="ticker-label losers">
          <span className="label-icon">📉</span>
          <span className="label-text">하락</span>
        </div>
        <div className="ticker-items">
          {data.topLosers.map((stock) => (
            <div
              key={stock.id}
              className="ticker-item loser"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <span className="coin-symbol">{stock.symbol}</span>
              <span className="coin-price">{formatPrice(stock.current_price)} G</span>
              <span className="coin-change negative">{formatChange(stock.price_change_24h)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker-section">
        <div className="ticker-label active">
          <span className="label-icon">🔥</span>
          <span className="label-text">액티브</span>
        </div>
        <div className="ticker-items">
          {data.topActive.map((stock) => (
            <div
              key={stock.id}
              className="ticker-item active"
              onClick={() => handleStockClick(stock.symbol)}
            >
              <span className="coin-symbol">{stock.symbol}</span>
              <span className="coin-price">{formatPrice(stock.current_price)} G</span>
              <span className="coin-volume">거래량: {formatPrice(stock.volume_24h)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopRankingsTicker;
