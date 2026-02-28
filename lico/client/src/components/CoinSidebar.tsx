import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { coinService } from '../services/coinService';
import type { Coin } from '../types';
import './CoinSidebar.css';

interface CoinSidebarProps {
  selectedCoinId?: string;
}

const CoinSidebar = ({ selectedCoinId }: CoinSidebarProps) => {
  const navigate = useNavigate();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // 초기 코인 데이터 로드
  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await coinService.getCoins('ACTIVE');
        setCoins(data);
      } catch (error) {
        console.error('Failed to fetch coins:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, []);

  // WebSocket 연결 및 실시간 가격 업데이트
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    // 전체 시장 구독
    socket.emit('subscribe:market');

    // 시장 가격 업데이트 수신
    socket.on('market:price:update', (data: any) => {
      if (!data || !data.coin_id) return;

      setCoins((prevCoins) => {
        return prevCoins.map((coin) => {
          if (coin.id === data.coin_id) {
            return {
              ...coin,
              current_price: data.current_price !== undefined ? data.current_price : coin.current_price,
              price_change_24h: data.price_change_24h !== undefined ? data.price_change_24h : coin.price_change_24h,
              volume_24h: data.volume_24h !== undefined ? data.volume_24h : coin.volume_24h,
              market_cap: data.market_cap !== undefined ? data.market_cap : coin.market_cap,
            };
          }
          return coin;
        });
      });
    });

    socket.on('connect', () => {
      console.log('CoinSidebar WebSocket connected');
    });

    socket.on('connect_error', (error) => {
      console.warn('CoinSidebar WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('CoinSidebar WebSocket disconnected:', reason);
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:market');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // 한 번만 연결

  const filteredCoins = coins.filter((coin) => {
    const search = searchTerm.toLowerCase();
    return (
      coin.symbol.toLowerCase().includes(search) ||
      coin.name.toLowerCase().includes(search)
    );
  });

  const handleCoinClick = (coin: Coin) => {
    navigate(`/trading/${coin.symbol}`);
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '0';
    return numPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatChange = (change: number | string | null | undefined) => {
    const numChange = typeof change === 'string' ? parseFloat(change) : (change || 0);
    if (isNaN(numChange)) return '+0.00%';
    const sign = numChange >= 0 ? '+' : '';
    return sign + numChange.toFixed(2) + '%';
  };

  return (
    <div className="coin-sidebar">
      <div className="sidebar-header">
        <h3>코인 목록</h3>
        <input
          type="text"
          placeholder="코인명/심볼 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="coin-search"
        />
      </div>

      <div className="coin-list">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : filteredCoins.length === 0 ? (
          <div className="no-results">검색 결과 없음</div>
        ) : (
          filteredCoins.map((coin) => (
            <div
              key={coin.id}
              className={'coin-item ' + (selectedCoinId === coin.id ? 'active' : '')}
              onClick={() => handleCoinClick(coin)}
            >
              <div className="coin-info">
                <div className="coin-logo">
                  {coin.logo_url ? (
                    <img src={coin.logo_url} alt={coin.symbol} />
                  ) : (
                    <div className="logo-placeholder">{coin.symbol[0]}</div>
                  )}
                </div>
                <div className="coin-names">
                  <div className="coin-symbol">{coin.symbol}</div>
                  <div className="coin-name">{coin.name}</div>
                </div>
              </div>
              <div className="coin-price-info">
                <div className="coin-price">{formatPrice(coin.current_price)} G</div>
                <div className={'coin-change ' + (coin.price_change_24h >= 0 ? 'positive' : 'negative')}>
                  {formatChange(coin.price_change_24h)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CoinSidebar;
