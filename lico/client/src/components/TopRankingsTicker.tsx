import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Coin } from '../types';
import './TopRankingsTicker.css';

interface RankingData {
  topGainers: Coin[];
  topLosers: Coin[];
  topActive: Coin[];
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
        const response = await api.get('/coins/rankings/top5');
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

  const handleCoinClick = (symbol: string) => {
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
          {data.topGainers.map((coin) => (
            <div
              key={coin.id}
              className="ticker-item gainer"
              onClick={() => handleCoinClick(coin.symbol)}
            >
              <span className="coin-symbol">{coin.symbol}</span>
              <span className="coin-price">{formatPrice(coin.current_price)} G</span>
              <span className="coin-change positive">{formatChange(coin.price_change_24h)}</span>
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
          {data.topLosers.map((coin) => (
            <div
              key={coin.id}
              className="ticker-item loser"
              onClick={() => handleCoinClick(coin.symbol)}
            >
              <span className="coin-symbol">{coin.symbol}</span>
              <span className="coin-price">{formatPrice(coin.current_price)} G</span>
              <span className="coin-change negative">{formatChange(coin.price_change_24h)}</span>
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
          {data.topActive.map((coin) => (
            <div
              key={coin.id}
              className="ticker-item active"
              onClick={() => handleCoinClick(coin.symbol)}
            >
              <span className="coin-symbol">{coin.symbol}</span>
              <span className="coin-price">{formatPrice(coin.current_price)} G</span>
              <span className="coin-volume">거래량: {formatPrice(coin.volume_24h)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopRankingsTicker;

