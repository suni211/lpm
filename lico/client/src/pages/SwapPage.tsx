import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './SwapPage.css';

interface Stock {
  id: number;
  symbol: string;
  name: string;
  current_price: number;
}

interface Balance {
  stock_id: string;
  symbol: string;
  name: string;
  available_amount: number;
  total_amount: number;
}

interface SwapHistory {
  id: number;
  from_symbol: string;
  to_symbol: string;
  from_amount: number;
  to_amount: number;
  fee: number;
  rate: number;
  created_at: string;
}

const SwapPage = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [history, setHistory] = useState<SwapHistory[]>([]);

  const [fromStock, setFromStock] = useState<string>('');
  const [toStock, setToStock] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [rate, setRate] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const FEE_RATE = 0.03;

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setWalletAddress(response.data.user.wallet_address || '');
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch stocks
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await api.get('/stocks');
        const stockList = response.data.stocks || response.data || [];
        setStocks(stockList);
        if (stockList.length >= 2) {
          setFromStock(stockList[0].id);
          setToStock(stockList[1].id);
        }
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStocks();
  }, []);

  // Fetch balances
  const fetchBalances = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await api.get('/wallets/' + walletAddress + '/balances');
      setBalances(response.data.balances || response.data || []);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Fetch swap history
  const fetchHistory = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const response = await api.get('/swap/history/' + walletAddress);
      setHistory(response.data.history || response.data || []);
    } catch (error) {
      console.error('Failed to fetch swap history:', error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      if (!fromStock || !toStock || fromStock === toStock) {
        setRate(0);
        setToAmount('');
        return;
      }
      try {
        const response = await api.get('/swap/rate?from=' + fromStock + '&to=' + toStock);
        const newRate = response.data.exchange_rate || 0;
        setRate(newRate);
        if (fromAmount && newRate > 0) {
          const amount = parseFloat(fromAmount);
          const afterFee = amount * (1 - FEE_RATE);
          setToAmount((afterFee * newRate).toFixed(4));
        }
      } catch (error) {
        console.error('Failed to fetch rate:', error);
        setRate(0);
      }
    };
    fetchRate();
  }, [fromStock, toStock]);

  // Calculate receive amount when fromAmount changes
  useEffect(() => {
    if (!fromAmount || !rate) {
      setToAmount('');
      return;
    }
    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) {
      setToAmount('');
      return;
    }
    const afterFee = amount * (1 - FEE_RATE);
    setToAmount((afterFee * rate).toFixed(4));
  }, [fromAmount, rate]);

  const getBalance = (stockId: string): number => {
    const balance = balances.find((b) => b.stock_id?.toString() === stockId?.toString() || b.symbol === stockId);
    const amt = balance ? (typeof balance.available_amount === 'string' ? parseFloat(balance.available_amount as any) : balance.available_amount) : 0;
    return isNaN(amt) ? 0 : amt;
  };

  const getSymbol = (stockId: string): string => {
    const stock = stocks.find((s) => s.id.toString() === stockId?.toString());
    return stock ? stock.symbol : stockId;
  };

  const handleSwapDirection = () => {
    const prevFrom = fromStock;
    const prevTo = toStock;
    setFromStock(prevTo);
    setToStock(prevFrom);
    setFromAmount('');
    setToAmount('');
    setMessage('');
  };

  const handleMaxClick = () => {
    if (!fromStock) return;
    const bal = getBalance(fromStock);
    setFromAmount(bal.toString());
  };

  const handleSwapExecute = async () => {
    setMessage('');

    if (swapping) return;

    if (!walletAddress) {
      setMessage('지갑 정보를 불러올 수 없습니다');
      setMessageType('error');
      return;
    }

    if (!fromStock || !toStock) {
      setMessage('종목을 선택해주세요');
      setMessageType('error');
      return;
    }

    if (fromStock === toStock) {
      setMessage('같은 종목끼리는 스왑할 수 없습니다');
      setMessageType('error');
      return;
    }

    const amount = parseFloat(fromAmount);
    if (!amount || amount <= 0) {
      setMessage('수량을 입력해주세요');
      setMessageType('error');
      return;
    }

    const availableBalance = getBalance(fromStock);
    if (amount > availableBalance) {
      setMessage('잔액이 부족합니다');
      setMessageType('error');
      return;
    }

    setSwapping(true);

    try {
      await api.post('/swap/execute', {
        wallet_address: walletAddress,
        from_stock_id: fromStock,
        to_stock_id: toStock,
        from_quantity: amount,
      });

      setMessage('스왑이 완료되었습니다!');
      setMessageType('success');
      setFromAmount('');
      setToAmount('');

      // Refresh data
      fetchBalances();
      fetchHistory();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '스왑 처리에 실패했습니다';
      setMessage(errorMsg);
      setMessageType('error');
    } finally {
      setSwapping(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const availableBalance = fromStock ? getBalance(fromStock) : 0;
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const isInsufficientBalance = fromAmountNum > availableBalance && fromAmountNum > 0;
  const feeAmount = fromAmountNum * FEE_RATE;

  if (loading) {
    return (
      <div className="swap-page">
        <div className="swap-page-container">
          <div className="swap-page-loading">
            <div className="swap-loading-spinner" />
            로딩 중...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-page">
      <div className="swap-page-container">
        <h1 className="swap-page-title">Swap</h1>

        {/* Swap Card */}
        <div className="swap-card">
          {/* From Section */}
          <div className="swap-token-section">
            <div className="swap-token-header">
              <span className="swap-token-label">From</span>
              <span className="swap-token-balance">
                잔액: {formatNumber(availableBalance)} <span onClick={handleMaxClick}>MAX</span>
              </span>
            </div>
            <div className="swap-token-row">
              <select
                className="swap-token-select"
                value={fromStock}
                onChange={(e) => {
                  setFromStock(e.target.value);
                  setFromAmount('');
                  setMessage('');
                }}
              >
                <option value="">선택</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.symbol}
                  </option>
                ))}
              </select>
              <input
                className="swap-token-input"
                type="number"
                placeholder="0"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                min="0"
              />
            </div>
          </div>

          {/* Swap Direction Arrow */}
          <div className="swap-arrow-wrapper">
            <button className="swap-arrow-btn" onClick={handleSwapDirection} title="방향 전환">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>

          {/* To Section */}
          <div className="swap-token-section">
            <div className="swap-token-header">
              <span className="swap-token-label">To (예상 수량)</span>
              <span className="swap-token-balance">
                잔액: {formatNumber(toStock ? getBalance(toStock) : 0)}
              </span>
            </div>
            <div className="swap-token-row">
              <select
                className="swap-token-select"
                value={toStock}
                onChange={(e) => {
                  setToStock(e.target.value);
                  setMessage('');
                }}
              >
                <option value="">선택</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.symbol}
                  </option>
                ))}
              </select>
              <input
                className="swap-token-input"
                type="text"
                placeholder="0"
                value={toAmount}
                readOnly
              />
            </div>
          </div>

          {/* Rate & Fee Info */}
          {fromStock && toStock && fromStock !== toStock && (
            <div className="swap-info">
              <div className="swap-info-row">
                <span className="swap-info-label">환율</span>
                <span className="swap-info-value">
                  1 {getSymbol(fromStock)} = {rate > 0 ? formatNumber(rate) : '...'} {getSymbol(toStock)}
                </span>
              </div>
              <div className="swap-info-row">
                <span className="swap-info-label">수수료 (3%)</span>
                <span className="swap-info-value fee">
                  {fromAmountNum > 0 ? formatNumber(feeAmount) + ' ' + getSymbol(fromStock) : '-'}
                </span>
              </div>
              {fromAmountNum > 0 && toAmount && (
                <div className="swap-info-row">
                  <span className="swap-info-label">최종 수령량</span>
                  <span className="swap-info-value">
                    {toAmount} {getSymbol(toStock)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Swap Button */}
          <button
            className={'swap-execute-btn' + (isInsufficientBalance ? ' insufficient' : '')}
            onClick={handleSwapExecute}
            disabled={
              swapping ||
              !fromStock ||
              !toStock ||
              fromStock === toStock ||
              !fromAmountNum ||
              isInsufficientBalance
            }
          >
            {swapping
              ? '처리 중...'
              : isInsufficientBalance
              ? '잔액 부족'
              : !fromStock || !toStock
              ? '종목을 선택하세요'
              : fromStock === toStock
              ? '다른 종목을 선택하세요'
              : !fromAmountNum
              ? '수량을 입력하세요'
              : 'Swap'}
          </button>

          {/* Message */}
          {message && (
            <div className={'swap-message ' + messageType}>
              {message}
            </div>
          )}
        </div>

        {/* Swap History */}
        <div className="swap-history-section">
          <h2 className="swap-history-title">최근 스왑 내역</h2>
          {history.length === 0 ? (
            <div className="swap-history-empty">스왑 내역이 없습니다</div>
          ) : (
            <table className="swap-history-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th></th>
                  <th>To</th>
                  <th>수수료</th>
                  <th>일시</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="swap-history-from">
                        -{formatNumber(item.from_amount)} {item.from_symbol}
                      </span>
                    </td>
                    <td>
                      <span className="swap-history-arrow">&rarr;</span>
                    </td>
                    <td>
                      <span className="swap-history-to">
                        +{formatNumber(item.to_amount)} {item.to_symbol}
                      </span>
                    </td>
                    <td>
                      <span className="swap-history-date">
                        {formatNumber(item.fee)} G
                      </span>
                    </td>
                    <td>
                      <span className="swap-history-date">{formatDate(item.created_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwapPage;
