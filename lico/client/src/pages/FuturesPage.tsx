import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './FuturesPage.css';

interface Stock {
  id: number;
  name: string;
  symbol: string;
  current_price: number;
}

interface Position {
  id: number;
  stock_id: number;
  stock_name: string;
  stock_symbol: string;
  position_type: 'LONG' | 'SHORT';
  leverage: number;
  entry_price: number;
  current_price: number;
  quantity: number;
  margin: number;
  liquidation_price: number;
  unrealized_pnl: number;
  created_at: string;
}

const FuturesPage = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [userLoading, setUserLoading] = useState(true);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<number>(0);
  const [positionType, setPositionType] = useState<'LONG' | 'SHORT'>('LONG');
  const [leverage, setLeverage] = useState<number>(1);
  const [quantity, setQuantity] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [positions, setPositions] = useState<Position[]>([]);
  const [closingId, setClosingId] = useState<number | null>(null);

  // Fetch user info on mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setWalletAddress(response.data.user.wallet_address || '');
          setGoldBalance(response.data.user.krw_balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Fetch stock list on mount
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await api.get('/stocks');
        const stockList = response.data.stocks || response.data || [];
        setStocks(stockList);
        if (stockList.length > 0) {
          setSelectedStockId(stockList[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      }
    };

    fetchStocks();
  }, []);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await api.get('/futures/positions/' + walletAddress);
      setPositions(response.data.positions || response.data || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  }, [walletAddress]);

  // Fetch positions on mount and every 5 seconds
  useEffect(() => {
    if (!walletAddress) return;

    fetchPositions();
    const interval = setInterval(fetchPositions, 5000);
    return () => clearInterval(interval);
  }, [walletAddress, fetchPositions]);

  const selectedStock = stocks.find((s) => s.id === selectedStockId);
  const currentPrice = selectedStock?.current_price || 0;
  const qty = parseFloat(quantity) || 0;
  const marginAmount = (currentPrice * qty) / leverage;
  const positionValue = currentPrice * qty;
  const liquidationPrice =
    positionType === 'LONG'
      ? currentPrice * (1 - 1 / leverage)
      : currentPrice * (1 + 1 / leverage);

  const handleOpenPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (loading) return;

    if (!walletAddress) {
      setMessage('지갑 정보를 불러올 수 없습니다.');
      return;
    }

    if (!selectedStockId) {
      setMessage('종목을 선택해주세요.');
      return;
    }

    if (qty <= 0) {
      setMessage('수량을 올바르게 입력해주세요.');
      return;
    }

    if (marginAmount > goldBalance) {
      setMessage('잔액이 부족합니다. 필요 증거금: ' + formatNumber(marginAmount) + ' G');
      return;
    }

    setLoading(true);

    try {
      await api.post('/futures/open', {
        wallet_address: walletAddress,
        stock_id: selectedStockId,
        position_type: positionType,
        leverage: leverage,
        quantity: qty,
      });
      setMessage('포지션이 개설되었습니다!');
      setQuantity('');

      // Refresh balance and positions
      const meResponse = await api.get('/auth/me');
      if (meResponse.data.user) {
        setGoldBalance(meResponse.data.user.krw_balance || 0);
      }
      await fetchPositions();
    } catch (error: any) {
      console.error('Failed to open position:', error);
      const errorMsg = error.response?.data?.error || '포지션 개설에 실패했습니다.';
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    if (closingId !== null) return;
    setClosingId(positionId);

    try {
      await api.post('/futures/close', { position_id: positionId });

      // Refresh balance and positions
      const meResponse = await api.get('/auth/me');
      if (meResponse.data.user) {
        setGoldBalance(meResponse.data.user.krw_balance || 0);
      }
      await fetchPositions();
    } catch (error: any) {
      console.error('Failed to close position:', error);
      const errorMsg = error.response?.data?.error || '포지션 청산에 실패했습니다.';
      setMessage(errorMsg);
    } finally {
      setClosingId(null);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  };

  if (userLoading) {
    return (
      <div className="futures-page">
        <div className="futures-container">
          <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="futures-page">
      <div className="futures-container">
        <h1 className="futures-title">선물 거래</h1>

        {/* Balance display */}
        <div className="futures-balance-card">
          <div className="futures-balance-label">LICO 잔액</div>
          <div className="futures-balance-value">{formatNumber(goldBalance)} G</div>
        </div>

        <div className="futures-layout">
          {/* Left: Order Form */}
          <div className="futures-order-panel">
            <div className="futures-card">
              <h2 className="futures-card-title">포지션 개설</h2>

              <form onSubmit={handleOpenPosition}>
                {/* Stock selector */}
                <div className="futures-form-group">
                  <label>종목 선택</label>
                  <select
                    value={selectedStockId}
                    onChange={(e) => setSelectedStockId(Number(e.target.value))}
                    disabled={loading}
                  >
                    {stocks.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.name} ({stock.symbol}) - {formatNumber(stock.current_price)} G
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position type toggle */}
                <div className="futures-form-group">
                  <label>포지션 유형</label>
                  <div className="futures-type-toggle">
                    <button
                      type="button"
                      className={'futures-type-btn long' + (positionType === 'LONG' ? ' active' : '')}
                      onClick={() => setPositionType('LONG')}
                    >
                      LONG (매수)
                    </button>
                    <button
                      type="button"
                      className={'futures-type-btn short' + (positionType === 'SHORT' ? ' active' : '')}
                      onClick={() => setPositionType('SHORT')}
                    >
                      SHORT (매도)
                    </button>
                  </div>
                </div>

                {/* Leverage slider */}
                <div className="futures-form-group">
                  <label>레버리지: <span className="futures-leverage-value">{leverage}x</span></label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="futures-leverage-slider"
                    disabled={loading}
                  />
                  <div className="futures-leverage-labels">
                    <span>1x</span>
                    <span>5x</span>
                    <span>10x</span>
                  </div>
                </div>

                {/* Quantity input */}
                <div className="futures-form-group">
                  <label>수량</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="수량을 입력하세요"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Calculated values */}
                {qty > 0 && currentPrice > 0 && (
                  <div className="futures-calc-panel">
                    <div className="futures-calc-row">
                      <span className="futures-calc-label">현재가</span>
                      <span className="futures-calc-value">{formatNumber(currentPrice)} G</span>
                    </div>
                    <div className="futures-calc-row">
                      <span className="futures-calc-label">포지션 가치</span>
                      <span className="futures-calc-value">{formatNumber(positionValue)} G</span>
                    </div>
                    <div className="futures-calc-row">
                      <span className="futures-calc-label">필요 증거금</span>
                      <span className="futures-calc-value highlight">{formatNumber(marginAmount)} G</span>
                    </div>
                    <div className="futures-calc-row">
                      <span className="futures-calc-label">청산가</span>
                      <span className="futures-calc-value warning">{formatNumber(liquidationPrice)} G</span>
                    </div>
                  </div>
                )}

                {/* Message */}
                {message && (
                  <div className={'futures-message' + (message.includes('개설') ? ' success' : ' error')}>
                    {message}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className={'futures-submit-btn ' + positionType.toLowerCase()}
                  disabled={loading || qty <= 0}
                >
                  {loading
                    ? '처리 중...'
                    : positionType === 'LONG'
                    ? 'LONG 포지션 개설'
                    : 'SHORT 포지션 개설'}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Open Positions */}
          <div className="futures-positions-panel">
            <div className="futures-card">
              <h2 className="futures-card-title">
                보유 포지션
                <span className="futures-position-count">{positions.length}</span>
              </h2>

              {positions.length === 0 ? (
                <div className="futures-no-positions">보유 중인 포지션이 없습니다.</div>
              ) : (
                <div className="futures-positions-table-wrapper">
                  <table className="futures-positions-table">
                    <thead>
                      <tr>
                        <th>종목</th>
                        <th>유형</th>
                        <th>레버리지</th>
                        <th>진입가</th>
                        <th>현재가</th>
                        <th>미실현 PnL</th>
                        <th>증거금</th>
                        <th>청산가</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((pos) => (
                        <tr key={pos.id}>
                          <td className="futures-pos-stock">
                            {pos.stock_name || pos.stock_symbol}
                          </td>
                          <td>
                            <span className={'futures-pos-type ' + pos.position_type.toLowerCase()}>
                              {pos.position_type}
                            </span>
                          </td>
                          <td>{pos.leverage}x</td>
                          <td>{formatNumber(pos.entry_price)} G</td>
                          <td>{formatNumber(pos.current_price)} G</td>
                          <td>
                            <span
                              className={
                                'futures-pnl ' +
                                (pos.unrealized_pnl >= 0 ? 'positive' : 'negative')
                              }
                            >
                              {pos.unrealized_pnl >= 0 ? '+' : ''}
                              {formatNumber(pos.unrealized_pnl)} G
                            </span>
                          </td>
                          <td>{formatNumber(pos.margin)} G</td>
                          <td>{formatNumber(pos.liquidation_price)} G</td>
                          <td>
                            <button
                              className="futures-close-btn"
                              onClick={() => handleClosePosition(pos.id)}
                              disabled={closingId === pos.id}
                            >
                              {closingId === pos.id ? '...' : '청산'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="futures-info-section">
          <h3>선물 거래 안내</h3>
          <ul>
            <li>선물 거래는 레버리지를 사용하여 적은 증거금으로 큰 포지션을 개설할 수 있습니다.</li>
            <li>LONG 포지션은 가격 상승 시, SHORT 포지션은 가격 하락 시 수익이 발생합니다.</li>
            <li>레버리지가 높을수록 수익과 손실이 모두 증폭됩니다.</li>
            <li>청산가에 도달하면 포지션이 자동으로 청산되며 증거금을 잃게 됩니다.</li>
            <li>포지션은 5초마다 자동으로 갱신됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FuturesPage;
