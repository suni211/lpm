import { useState, useEffect } from 'react';
import { tradingService, walletService } from '../services/stockService';
import api from '../services/api';
import type { Order, StockBalance, Trade } from '../types';
import './InvestmentHistoryPage.css';

const InvestmentHistoryPage = () => {
  const [activeTab, setActiveTab] = useState<'holdings' | 'orders' | 'trades'>('holdings');
  const [holdings, setHoldings] = useState<StockBalance[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user && response.data.user.wallet_address) {
          setWalletAddress(response.data.user.wallet_address);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!walletAddress || userLoading) return;

      setLoading(true);
      try {
        if (activeTab === 'holdings') {
          const data = await walletService.getMyBalances(walletAddress);
          setHoldings(data.balances || []);
        } else if (activeTab === 'orders') {
          const data = await tradingService.getMyOrders(walletAddress);
          setOrders(data || []);
        } else if (activeTab === 'trades') {
          const data = await tradingService.getMyTrades(walletAddress);
          setTrades(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, walletAddress, userLoading]);

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!walletAddress) {
      alert('지갑 주소를 찾을 수 없습니다');
      return;
    }

    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) {
      return;
    }

    setCancellingOrderId(orderId);
    try {
      const result = await tradingService.cancelOrder(orderId, walletAddress);
      
      if (result.success) {
        alert('주문이 취소되었습니다');
        
        // 주문 목록 다시 조회
        const data = await tradingService.getMyOrders(walletAddress);
        setOrders(data || []);
      } else {
        alert(result.message || '주문 취소 실패');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || '주문 취소 실패';
      alert(errorMessage);
      console.error('Failed to cancel order:', error);
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <div className="investment-history-page">
      <div className="page-container">
        <h1 className="page-title">투자 내역</h1>

        <div className="tab-navigation">
          <button
            className={'tab-nav-btn ' + (activeTab === 'holdings' ? 'active' : '')}
            onClick={() => setActiveTab('holdings')}
          >
            보유 주식
          </button>
          <button
            className={'tab-nav-btn ' + (activeTab === 'orders' ? 'active' : '')}
            onClick={() => setActiveTab('orders')}
          >
            주문 내역
          </button>
          <button
            className={'tab-nav-btn ' + (activeTab === 'trades' ? 'active' : '')}
            onClick={() => setActiveTab('trades')}
          >
            거래 내역
          </button>
        </div>

        <div className="content-card">
          {loading ? (
            <div className="loading-state">로딩 중...</div>
          ) : activeTab === 'holdings' ? (
            <div className="holdings-table">
              {holdings.length === 0 ? (
                <div className="empty-state">보유한 주식이 없습니다</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>종목</th>
                      <th>보유량</th>
                      <th>평균 매수가</th>
                      <th>현재가</th>
                      <th>평가금액</th>
                      <th>손익</th>
                      <th>수익률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => {
                      const totalAmount = typeof holding.total_amount === 'string' ? parseFloat(holding.total_amount) : (holding.total_amount || 0);
                      const currentPrice = typeof holding.current_price === 'string' ? parseFloat(holding.current_price) : (holding.current_price || 0);
                      const avgBuyPrice = typeof holding.average_buy_price === 'string' ? parseFloat(holding.average_buy_price) : (holding.average_buy_price || 0);
                      const currentValue = totalAmount * (isNaN(currentPrice) ? 0 : currentPrice);
                      const purchaseValue = totalAmount * (isNaN(avgBuyPrice) ? 0 : avgBuyPrice);
                      const profitLoss = currentValue - purchaseValue;
                      const profitRate = purchaseValue > 0 && !isNaN(profitLoss) && !isNaN(purchaseValue) ? (profitLoss / purchaseValue) * 100 : 0;

                      return (
                        <tr key={holding.id}>
                          <td>
                            <div className="coin-cell">
                              <span className="coin-symbol">{holding.symbol}</span>
                              <span className="coin-name">{holding.name}</span>
                            </div>
                          </td>
                          <td>{formatNumber(holding.total_amount)}</td>
                          <td>{formatNumber(holding.average_buy_price)} G</td>
                          <td>{formatNumber(holding.current_price || 0)} G</td>
                          <td>{formatNumber(currentValue)} G</td>
                          <td className={profitLoss >= 0 ? 'profit' : 'loss'}>
                            {formatNumber(profitLoss)} G
                          </td>
                          <td className={profitRate >= 0 ? 'profit' : 'loss'}>
                            {typeof profitRate === 'number' && !isNaN(profitRate) ? profitRate.toFixed(2) : '0.00'}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : activeTab === 'orders' ? (
            <div className="orders-table">
              {orders.length === 0 ? (
                <div className="empty-state">주문 내역이 없습니다</div>
              ) : (
                <>
                  <div style={{ marginBottom: '16px', padding: '12px', background: '#2a2e3e', borderRadius: '6px', fontSize: '13px', color: '#9ca3af' }}>
                    💡 <strong style={{ color: '#fff' }}>주문 취소 안내:</strong> 상태가 "대기중" 또는 "부분체결"인 주문만 취소할 수 있습니다. 오른쪽 "주문 취소" 버튼을 클릭하면 주문이 취소됩니다.
                  </div>
                  <table>
                  <thead>
                    <tr>
                      <th>시간</th>
                      <th>종목</th>
                      <th>유형</th>
                      <th>가격</th>
                      <th>수량</th>
                      <th>체결량</th>
                      <th>상태</th>
                      <th>작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const canCancel = order.status === 'PENDING' || order.status === 'PARTIAL';
                      return (
                        <tr key={order.id}>
                          <td>{formatDate(order.created_at)}</td>
                          <td>{order.symbol}</td>
                          <td className={order.order_type === 'BUY' ? 'buy-text' : 'sell-text'}>
                            {order.order_type === 'BUY' ? '매수' : '매도'}
                          </td>
                          <td>{formatNumber(order.price || 0)} G</td>
                          <td>{formatNumber(order.quantity)}</td>
                          <td>{formatNumber(order.filled_quantity)}</td>
                          <td>
                            <span className={'status-badge ' + order.status.toLowerCase()}>
                              {order.status === 'PENDING' ? '대기중' : 
                               order.status === 'PARTIAL' ? '부분체결' :
                               order.status === 'FILLED' ? '체결완료' :
                               order.status === 'CANCELLED' ? '취소됨' :
                               order.status === 'EXPIRED' ? '만료됨' : order.status}
                            </span>
                          </td>
                          <td>
                            {canCancel ? (
                              <button
                                className="cancel-order-btn"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={cancellingOrderId === order.id}
                                title="주문 취소"
                              >
                                {cancellingOrderId === order.id ? '취소 중...' : '주문 취소'}
                              </button>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </>
              )}
            </div>
          ) : (
            <div className="trades-table">
              {trades.length === 0 ? (
                <div className="empty-state">거래 내역이 없습니다</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>시간</th>
                      <th>종목</th>
                      <th>유형</th>
                      <th>가격</th>
                      <th>수량</th>
                      <th>총액</th>
                      <th>수수료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => (
                      <tr key={trade.id}>
                        <td>{formatDate(trade.created_at)}</td>
                        <td>
                          <div className="coin-cell">
                            <span className="coin-symbol">{trade.symbol || 'N/A'}</span>
                            <span className="coin-name">{trade.name || ''}</span>
                          </div>
                        </td>
                        <td className={trade.trade_type === 'BUY' ? 'buy-text' : 'sell-text'}>
                          {trade.trade_type === 'BUY' ? '매수' : '매도'}
                        </td>
                        <td>{formatNumber(trade.price)} G</td>
                        <td>{formatNumber(trade.quantity)}</td>
                        <td>{formatNumber(trade.total_amount)} G</td>
                        <td>{formatNumber(trade.my_fee || 0)} G</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentHistoryPage;
