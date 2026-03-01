import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { stockService } from '../services/stockService';
import type { Stock } from '../types';
import './StockSidebar.css';

interface StockSidebarProps {
  selectedStockId?: string;
}

const StockSidebar = ({ selectedStockId }: StockSidebarProps) => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // 초기 종목 데이터 로드
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const data = await stockService.getStocks('ACTIVE');
        setStocks(data);
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStocks();
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
      if (!data || !data.stock_id) return;

      setStocks((prevStocks) => {
        return prevStocks.map((stock) => {
          if (stock.id === data.stock_id) {
            return {
              ...stock,
              current_price: data.current_price !== undefined ? data.current_price : stock.current_price,
              price_change_24h: data.price_change_24h !== undefined ? data.price_change_24h : stock.price_change_24h,
              volume_24h: data.volume_24h !== undefined ? data.volume_24h : stock.volume_24h,
              market_cap: data.market_cap !== undefined ? data.market_cap : stock.market_cap,
            };
          }
          return stock;
        });
      });
    });

    socket.on('connect', () => {
      console.log('StockSidebar WebSocket connected');
    });

    socket.on('connect_error', (error) => {
      console.warn('StockSidebar WebSocket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('StockSidebar WebSocket disconnected:', reason);
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

  const filteredStocks = stocks.filter((stock) => {
    const search = searchTerm.toLowerCase();
    return (
      stock.symbol.toLowerCase().includes(search) ||
      stock.name.toLowerCase().includes(search)
    );
  });

  const handleStockClick = (stock: Stock) => {
    navigate(`/trading/${stock.symbol}`);
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
        <h3>종목 목록</h3>
        <input
          type="text"
          placeholder="종목명/심볼 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="coin-search"
        />
      </div>

      <div className="coin-list">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : filteredStocks.length === 0 ? (
          <div className="no-results">검색 결과 없음</div>
        ) : (
          filteredStocks.map((stock) => (
            <div
              key={stock.id}
              className={'coin-item ' + (selectedStockId === stock.id ? 'active' : '')}
              onClick={() => handleStockClick(stock)}
            >
              <div className="coin-info">
                <div className="coin-logo">
                  {stock.logo_url ? (
                    <img src={stock.logo_url} alt={stock.symbol} />
                  ) : (
                    <div className="logo-placeholder">{stock.symbol[0]}</div>
                  )}
                </div>
                <div className="coin-names">
                  <div className="coin-symbol">{stock.symbol}</div>
                  <div className="coin-name">{stock.name}</div>
                </div>
              </div>
              <div className="coin-price-info">
                <div className="coin-price">{formatPrice(stock.current_price)} G</div>
                <div className={'coin-change ' + (stock.price_change_24h >= 0 ? 'positive' : 'negative')}>
                  {formatChange(stock.price_change_24h)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StockSidebar;
