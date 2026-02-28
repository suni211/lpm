import { useState, useEffect } from 'react';
import api from '../services/api';
import './RecentTradesWidget.css';

interface Trade {
  id: string;
  price: number | string;
  quantity: number | string;
  created_at: string;
  buyer_username?: string;
  seller_username?: string;
}

interface RecentTradesWidgetProps {
  coinId: string;
  limit?: number;
}

const RecentTradesWidget = ({ coinId, limit = 20 }: RecentTradesWidgetProps) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await api.get(`/coins/${coinId}/trades/recent`, {
          params: { limit },
        });
        setTrades(response.data.trades || []);
      } catch (error) {
        console.error('Failed to fetch trades:', error);
      } finally {
        setLoading(false);
      }
    };

    if (coinId) {
      fetchTrades();
      // 3초마다 업데이트
      const interval = setInterval(fetchTrades, 3000);
      return () => clearInterval(interval);
    }
  }, [coinId, limit]);

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '0';
    return numPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatQuantity = (quantity: number | string | null | undefined) => {
    const numQty = typeof quantity === 'string' ? parseFloat(quantity) : (quantity || 0);
    if (isNaN(numQty)) return '0';
    return numQty.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}초 전`;
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="recent-trades-widget">
        <div className="widget-header">
          <h3>최근 거래</h3>
        </div>
        <div className="widget-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="recent-trades-widget">
      <div className="widget-header">
        <h3>최근 거래</h3>
      </div>
      <div className="trades-list">
        {trades.length === 0 ? (
          <div className="no-trades">거래 내역이 없습니다</div>
        ) : (
          trades.map((trade) => (
            <div key={trade.id} className="trade-item">
              <div className="trade-price">{formatPrice(trade.price)} G</div>
              <div className="trade-quantity">{formatQuantity(trade.quantity)}</div>
              <div className="trade-time">{formatTime(trade.created_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentTradesWidget;

