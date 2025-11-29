import { useState, useEffect } from 'react';
import { tradingService } from '../services/coinService';
import type { OrderbookEntry, Coin } from '../types';
import './Orderbook.css';

interface OrderbookProps {
  coinId: string;
  baseCurrency: Coin | null;
}

type OrderbookMode = 'normal' | 'cumulative';

const Orderbook = ({ coinId, baseCurrency }: OrderbookProps) => {
  const currencySymbol = baseCurrency?.symbol || 'G';
  const [mode, setMode] = useState<OrderbookMode>('normal');
  const [buyOrders, setBuyOrders] = useState<OrderbookEntry[]>([]);
  const [sellOrders, setSellOrders] = useState<OrderbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        const data = await tradingService.getOrderbook(coinId, 15);
        setBuyOrders(data.buy_orders || []);
        setSellOrders(data.sell_orders || []);
      } catch (error) {
        console.error('Failed to fetch orderbook:', error);
      } finally {
        setLoading(false);
      }
    };

    if (coinId) {
      fetchOrderbook();
      const interval = setInterval(fetchOrderbook, 3000);
      return () => clearInterval(interval);
    }
  }, [coinId]);

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '0';
    return numPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatQuantity = (quantity: number | string | null | undefined) => {
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : (quantity || 0);
    if (isNaN(numQuantity)) return '0';
    return numQuantity.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const calculateCumulative = (orders: OrderbookEntry[]) => {
    let cumulative = 0;
    return orders.map((order) => {
      const quantity = typeof order.total_quantity === 'string' ? parseFloat(order.total_quantity) : (order.total_quantity || 0);
      cumulative += isNaN(quantity) ? 0 : quantity;
      return { ...order, cumulative };
    });
  };

  const displayBuyOrders = mode === 'cumulative' ? calculateCumulative(buyOrders) : buyOrders;
  const displaySellOrders = mode === 'cumulative' ? calculateCumulative(sellOrders) : sellOrders;

  const maxVolume = Math.max(
    ...displayBuyOrders.map((o: any) => {
      const value = mode === 'cumulative' ? o.cumulative : o.total_quantity;
      return typeof value === 'string' ? parseFloat(value) : (value || 0);
    }),
    ...displaySellOrders.map((o: any) => {
      const value = mode === 'cumulative' ? o.cumulative : o.total_quantity;
      return typeof value === 'string' ? parseFloat(value) : (value || 0);
    }),
    0
  );

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <h3>호가창</h3>
        <div className="orderbook-mode-toggle">
          <button
            className={mode === 'normal' ? 'active' : ''}
            onClick={() => setMode('normal')}
          >
            일반
          </button>
          <button
            className={mode === 'cumulative' ? 'active' : ''}
            onClick={() => setMode('cumulative')}
          >
            누적
          </button>
        </div>
      </div>

      <div className="orderbook-table-header">
        <div className="header-price">가격({currencySymbol})</div>
        <div className="header-quantity">수량</div>
        <div className="header-count">주문수</div>
      </div>

      <div className="orderbook-content">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : (
          <>
            <div className="sell-orders">
              {displaySellOrders.slice().reverse().map((order: any, index) => {
                const rawVolume = mode === 'cumulative' ? order.cumulative : order.total_quantity;
                const volume = typeof rawVolume === 'string' ? parseFloat(rawVolume) : (rawVolume || 0);
                const widthPercent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;

                return (
                  <div key={index} className="order-row sell">
                    <div
                      className="volume-bar sell-bar"
                      style={{ width: widthPercent + '%' }}
                    />
                    <div className="order-price sell-price">{formatPrice(order.price)}</div>
                    <div className="order-quantity">{formatQuantity(volume)}</div>
                    <div className="order-count">{order.order_count}</div>
                  </div>
                );
              })}
            </div>

            <div className="spread-section">
              <div className="spread-label">스프레드</div>
              {buyOrders.length > 0 && sellOrders.length > 0 && (
                <div className="spread-value">
                  {formatPrice(Math.abs(
                    (typeof sellOrders[0].price === 'string' ? parseFloat(sellOrders[0].price) : (sellOrders[0].price || 0)) -
                    (typeof buyOrders[0].price === 'string' ? parseFloat(buyOrders[0].price) : (buyOrders[0].price || 0))
                  ))} {currencySymbol}
                </div>
              )}
            </div>

            <div className="buy-orders">
              {displayBuyOrders.map((order: any, index) => {
                const rawVolume = mode === 'cumulative' ? order.cumulative : order.total_quantity;
                const volume = typeof rawVolume === 'string' ? parseFloat(rawVolume) : (rawVolume || 0);
                const widthPercent = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;

                return (
                  <div key={index} className="order-row buy">
                    <div
                      className="volume-bar buy-bar"
                      style={{ width: widthPercent + '%' }}
                    />
                    <div className="order-price buy-price">{formatPrice(order.price)}</div>
                    <div className="order-quantity">{formatQuantity(volume)}</div>
                    <div className="order-count">{order.order_count}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Orderbook;
