import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StopOrderPanel.css';

interface StopOrder {
  id: string;
  coin_id: string;
  symbol: string;
  order_type: 'SELL';
  stop_type: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP';
  quantity: number;
  stop_price?: number;
  trailing_percent?: number;
  trailing_price?: number;
  stop_triggered: boolean;
  status: string;
  created_at: string;
}

interface StopOrderPanelProps {
  walletAddress: string;
  selectedCoin: {
    id: string;
    symbol: string;
    current_price: number;
  };
  onRefresh?: () => void;
}

const StopOrderPanel: React.FC<StopOrderPanelProps> = ({
  walletAddress,
  selectedCoin,
  onRefresh,
}) => {
  const [stopOrders, setStopOrders] = useState<StopOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [stopType, setStopType] = useState<'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP'>('STOP_LOSS');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [trailingPercent, setTrailingPercent] = useState('');

  useEffect(() => {
    loadStopOrders();
    const interval = setInterval(loadStopOrders, 3000); // 3초마다 갱신
    return () => clearInterval(interval);
  }, [walletAddress]);

  const loadStopOrders = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5002/api/trading/stop-orders/${walletAddress}`,
        { withCredentials: true }
      );
      setStopOrders(response.data);
    } catch (error) {
      console.error('스탑 주문 조회 실패:', error);
    }
  };

  const createStopOrder = async () => {
    try {
      const orderData: any = {
        wallet_address: walletAddress,
        coin_id: selectedCoin.id,
        stop_type: stopType,
        quantity: parseFloat(quantity),
      };

      if (stopType === 'TRAILING_STOP') {
        orderData.trailing_percent = parseFloat(trailingPercent);
      } else {
        orderData.stop_price = parseFloat(stopPrice);
      }

      await axios.post(
        'http://localhost:5002/api/trading/stop-order',
        orderData,
        { withCredentials: true }
      );

      alert('스탑 주문이 생성되었습니다!');
      setShowForm(false);
      setQuantity('');
      setStopPrice('');
      setTrailingPercent('');
      loadStopOrders();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || '스탑 주문 생성 실패');
    }
  };

  const cancelStopOrder = async (orderId: string) => {
    try {
      await axios.post(
        'http://localhost:5002/api/trading/cancel',
        { order_id: orderId },
        { withCredentials: true }
      );
      alert('스탑 주문이 취소되었습니다.');
      loadStopOrders();
      if (onRefresh) onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || '주문 취소 실패');
    }
  };

  const getStopTypeLabel = (type: string) => {
    switch (type) {
      case 'STOP_LOSS':
        return '손절';
      case 'TAKE_PROFIT':
        return '익절';
      case 'TRAILING_STOP':
        return '트레일링 스탑';
      default:
        return type;
    }
  };

  const getStopTypeColor = (type: string) => {
    switch (type) {
      case 'STOP_LOSS':
        return 'red';
      case 'TAKE_PROFIT':
        return 'green';
      case 'TRAILING_STOP':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <div className="stop-order-panel">
      <div className="panel-header">
        <h3>⚡ 스탑 주문 관리</h3>
        <button className="btn-create" onClick={() => setShowForm(!showForm)}>
          {showForm ? '닫기' : '+ 생성'}
        </button>
      </div>

      {showForm && (
        <div className="stop-order-form">
          <h4>새 스탑 주문 생성 - {selectedCoin.symbol}</h4>
          <p className="current-price">현재가: {selectedCoin.current_price.toLocaleString()} G</p>

          <div className="form-group">
            <label>스탑 타입</label>
            <select value={stopType} onChange={(e) => setStopType(e.target.value as any)}>
              <option value="STOP_LOSS">손절 (Stop Loss)</option>
              <option value="TAKE_PROFIT">익절 (Take Profit)</option>
              <option value="TRAILING_STOP">트레일링 스탑</option>
            </select>
          </div>

          <div className="form-group">
            <label>수량</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="매도할 코인 수량"
              step="0.00000001"
            />
          </div>

          {stopType !== 'TRAILING_STOP' ? (
            <div className="form-group">
              <label>
                {stopType === 'STOP_LOSS' ? '손절가' : '익절가'}
              </label>
              <input
                type="number"
                value={stopPrice}
                onChange={(e) => setStopPrice(e.target.value)}
                placeholder={
                  stopType === 'STOP_LOSS'
                    ? '이 가격 이하로 떨어지면 매도'
                    : '이 가격 이상으로 오르면 매도'
                }
                step="0.01"
              />
              {stopPrice && (
                <p className="price-diff">
                  현재가 대비:{' '}
                  {(
                    ((parseFloat(stopPrice) - selectedCoin.current_price) /
                      selectedCoin.current_price) *
                    100
                  ).toFixed(2)}
                  %
                </p>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label>트레일링 비율 (%)</label>
              <input
                type="number"
                value={trailingPercent}
                onChange={(e) => setTrailingPercent(e.target.value)}
                placeholder="최고가 대비 하락 비율 (예: 5%)"
                step="0.1"
              />
              <p className="help-text">
                가격이 오르면 자동으로 손절가도 상승합니다.
                <br />
                최고가에서 설정한 비율만큼 하락하면 매도됩니다.
              </p>
            </div>
          )}

          <button
            className="btn-submit"
            onClick={createStopOrder}
            disabled={
              !quantity ||
              (stopType === 'TRAILING_STOP' ? !trailingPercent : !stopPrice)
            }
          >
            스탑 주문 생성
          </button>
        </div>
      )}

      <div className="stop-orders-list">
        <h4>활성 스탑 주문 ({stopOrders.length})</h4>
        {stopOrders.length === 0 ? (
          <p className="no-orders">활성 스탑 주문이 없습니다.</p>
        ) : (
          <div className="orders-table">
            {stopOrders.map((order) => (
              <div key={order.id} className="order-row">
                <div className="order-info">
                  <span className={`stop-badge ${getStopTypeColor(order.stop_type)}`}>
                    {getStopTypeLabel(order.stop_type)}
                  </span>
                  <span className="coin-symbol">{order.symbol}</span>
                  <span className="quantity">{order.quantity.toFixed(8)}</span>
                </div>

                <div className="order-details">
                  {order.stop_type === 'TRAILING_STOP' ? (
                    <>
                      <span>트레일링: {order.trailing_percent}%</span>
                      {order.trailing_price && (
                        <span className="trailing-price">
                          추적가: {parseFloat(order.trailing_price.toString()).toFixed(2)} G
                        </span>
                      )}
                    </>
                  ) : (
                    <span>
                      {order.stop_type === 'STOP_LOSS' ? '손절가' : '익절가'}:{' '}
                      {order.stop_price?.toFixed(2)} G
                    </span>
                  )}
                </div>

                <div className="order-actions">
                  {order.stop_triggered ? (
                    <span className="status-triggered">트리거됨</span>
                  ) : order.status === 'CANCELLED' ? (
                    <span className="status-cancelled">취소됨</span>
                  ) : (
                    <button
                      className="btn-cancel"
                      onClick={() => cancelStopOrder(order.id)}
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StopOrderPanel;
