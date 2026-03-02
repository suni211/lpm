import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './OptionsPage.css';

interface Stock {
  id: number;
  name: string;
  symbol: string;
  current_price: number;
}

interface OptionsContract {
  id: number;
  stock_id: number;
  stock_name: string;
  stock_symbol: string;
  type: 'CALL' | 'PUT';
  strike_price: number;
  premium: number;
  expiry_date: string;
  remaining_supply: number;
  current_price: number;
  intrinsic_value: number;
}

interface OptionsHolding {
  id: number;
  contract_id: number;
  stock_name: string;
  stock_symbol: string;
  type: 'CALL' | 'PUT';
  strike_price: number;
  premium_paid: number;
  quantity: number;
  current_value: number;
  pnl: number;
  in_the_money: boolean;
  expiry_date: string;
}

const OptionsPage = () => {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [userLoading, setUserLoading] = useState(true);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);

  const [contracts, setContracts] = useState<OptionsContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  const [holdings, setHoldings] = useState<OptionsHolding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);

  const [buyModal, setBuyModal] = useState<OptionsContract | null>(null);
  const [buyQuantity, setBuyQuantity] = useState<string>('1');
  const [buyLoading, setBuyLoading] = useState(false);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch user info
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

  // Fetch stocks for tabs
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await api.get('/api/stocks');
        const stockList = response.data.stocks || response.data || [];
        setStocks(stockList);
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      }
    };

    fetchStocks();
  }, []);

  // Fetch contracts
  const fetchContracts = useCallback(async () => {
    setContractsLoading(true);
    try {
      const params: Record<string, any> = {};
      if (selectedStockId !== null) {
        params.stock_id = selectedStockId;
      }
      const response = await api.get('/options/contracts', { params });
      setContracts(response.data.contracts || response.data || []);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, [selectedStockId]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Fetch holdings
  const fetchHoldings = useCallback(async () => {
    if (!walletAddress) return;
    setHoldingsLoading(true);
    try {
      const response = await api.get('/options/holdings/' + walletAddress);
      setHoldings(response.data.holdings || response.data || []);
    } catch (error) {
      console.error('Failed to fetch holdings:', error);
      setHoldings([]);
    } finally {
      setHoldingsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      fetchHoldings();
    }
  }, [walletAddress, fetchHoldings]);

  // Refresh balance
  const refreshBalance = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.user) {
        setGoldBalance(response.data.user.krw_balance || 0);
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  };

  // Buy handler
  const handleBuy = async () => {
    if (!buyModal || buyLoading) return;

    const qty = parseInt(buyQuantity, 10);
    if (!qty || qty <= 0) {
      setMessage({ text: '올바른 수량을 입력해주세요', type: 'error' });
      return;
    }

    if (qty > buyModal.remaining_supply) {
      setMessage({ text: '남은 수량을 초과했습니다', type: 'error' });
      return;
    }

    const totalCost = buyModal.premium * qty;
    if (totalCost > goldBalance) {
      setMessage({ text: '잔액이 부족합니다', type: 'error' });
      return;
    }

    setBuyLoading(true);
    try {
      await api.post('/options/buy', {
        contract_id: buyModal.id,
        wallet_address: walletAddress,
        quantity: qty,
      });
      setMessage({ text: '옵션 매수가 완료되었습니다!', type: 'success' });
      setBuyModal(null);
      setBuyQuantity('1');
      fetchContracts();
      fetchHoldings();
      refreshBalance();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '매수 실패';
      setMessage({ text: errorMsg, type: 'error' });
    } finally {
      setBuyLoading(false);
    }
  };

  // Exercise handler
  const handleExercise = async (holdingId: number) => {
    try {
      await api.post('/options/exercise', { holding_id: holdingId });
      setMessage({ text: '옵션 행사가 완료되었습니다!', type: 'success' });
      fetchHoldings();
      fetchContracts();
      refreshBalance();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || '행사 실패';
      setMessage({ text: errorMsg, type: 'error' });
    }
  };

  // Formatting helpers
  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDaysRemaining = (dateStr: string) => {
    const now = new Date();
    const expiry = new Date(dateStr);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getExpiryClass = (dateStr: string) => {
    const days = getDaysRemaining(dateStr);
    if (days <= 0) return 'expired';
    if (days <= 3) return 'expiring-soon';
    return '';
  };

  const getExpiryLabel = (dateStr: string) => {
    const days = getDaysRemaining(dateStr);
    if (days <= 0) return '만료됨';
    if (days === 1) return '1일 남음';
    return days + '일 남음';
  };

  // Auto-clear message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (userLoading) {
    return (
      <div className="options-page">
        <div className="options-container">
          <div className="options-loading-state">로딩 중...</div>
        </div>
      </div>
    );
  }

  const totalCost = buyModal ? buyModal.premium * (parseInt(buyQuantity, 10) || 0) : 0;

  return (
    <div className="options-page">
      <div className="options-container">
        <h1 className="options-page-title">옵션 거래</h1>

        {/* Balance */}
        <div className="options-balance-bar">
          <span className="options-balance-label">보유 잔액</span>
          <span className="options-balance-value">{formatNumber(goldBalance)} G</span>
        </div>

        {/* Message */}
        {message && (
          <div className={'options-message ' + message.type}>
            {message.text}
          </div>
        )}

        {/* Stock filter tabs */}
        <div className="options-stock-tabs">
          <button
            className={'options-stock-tab' + (selectedStockId === null ? ' active' : '')}
            onClick={() => setSelectedStockId(null)}
          >
            전체
          </button>
          {stocks.map((stock) => (
            <button
              key={stock.id}
              className={'options-stock-tab' + (selectedStockId === stock.id ? ' active' : '')}
              onClick={() => setSelectedStockId(stock.id)}
            >
              {stock.symbol}
            </button>
          ))}
        </div>

        {/* Options Chain */}
        <div className="options-section">
          <h2 className="options-section-title">옵션 체인</h2>

          {contractsLoading ? (
            <div className="options-loading-state">계약 로딩 중...</div>
          ) : contracts.length === 0 ? (
            <div className="options-empty-state">사용 가능한 옵션 계약이 없습니다</div>
          ) : (
            <div className="options-chain-table">
              <table>
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>유형</th>
                    <th>행사가</th>
                    <th>프리미엄</th>
                    <th>만기일</th>
                    <th>잔여 수량</th>
                    <th>내재 가치</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className={contract.type === 'CALL' ? 'call-row' : 'put-row'}
                    >
                      <td>
                        <div>
                          <span style={{ fontWeight: 600 }}>{contract.stock_symbol}</span>
                          <br />
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>{contract.stock_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={'options-type-badge ' + contract.type.toLowerCase()}>
                          {contract.type}
                        </span>
                      </td>
                      <td>{formatNumber(contract.strike_price)} G</td>
                      <td>{formatNumber(contract.premium)} G</td>
                      <td>
                        <div className="options-expiry-cell">
                          <span className="options-expiry-date">{formatDate(contract.expiry_date)}</span>
                          <span className={'options-expiry-remaining ' + getExpiryClass(contract.expiry_date)}>
                            {getExpiryLabel(contract.expiry_date)}
                          </span>
                        </div>
                      </td>
                      <td>{formatNumber(contract.remaining_supply)}</td>
                      <td>
                        <span className={'options-intrinsic ' + (contract.intrinsic_value > 0 ? 'positive' : 'zero')}>
                          {formatNumber(contract.intrinsic_value)} G
                        </span>
                      </td>
                      <td>
                        <button
                          className="options-buy-btn"
                          onClick={() => {
                            setBuyModal(contract);
                            setBuyQuantity('1');
                          }}
                          disabled={contract.remaining_supply <= 0 || getDaysRemaining(contract.expiry_date) <= 0}
                        >
                          매수
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* My Holdings */}
        <div className="options-section">
          <h2 className="options-section-title">보유 옵션</h2>

          {holdingsLoading ? (
            <div className="options-loading-state">보유 옵션 로딩 중...</div>
          ) : holdings.length === 0 ? (
            <div className="options-empty-state">보유 중인 옵션이 없습니다</div>
          ) : (
            <div className="options-holdings-table">
              <table>
                <thead>
                  <tr>
                    <th>종목</th>
                    <th>유형</th>
                    <th>행사가</th>
                    <th>매수 프리미엄</th>
                    <th>수량</th>
                    <th>현재 가치</th>
                    <th>손익</th>
                    <th>상태</th>
                    <th>만기일</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => {
                    const pnlClass = holding.pnl > 0 ? 'profit' : holding.pnl < 0 ? 'loss' : 'neutral';
                    const pnlSign = holding.pnl > 0 ? '+' : '';
                    return (
                      <tr key={holding.id}>
                        <td>
                          <div>
                            <span style={{ fontWeight: 600 }}>{holding.stock_symbol}</span>
                            <br />
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>{holding.stock_name}</span>
                          </div>
                        </td>
                        <td>
                          <span className={'options-type-badge ' + holding.type.toLowerCase()}>
                            {holding.type}
                          </span>
                        </td>
                        <td>{formatNumber(holding.strike_price)} G</td>
                        <td>{formatNumber(holding.premium_paid)} G</td>
                        <td>{formatNumber(holding.quantity)}</td>
                        <td>{formatNumber(holding.current_value)} G</td>
                        <td>
                          <span className={'options-pnl ' + pnlClass}>
                            {pnlSign}{formatNumber(holding.pnl)} G
                          </span>
                        </td>
                        <td>
                          <span className={'options-itm-badge ' + (holding.in_the_money ? 'itm' : 'otm')}>
                            {holding.in_the_money ? 'ITM' : 'OTM'}
                          </span>
                        </td>
                        <td>
                          <div className="options-expiry-cell">
                            <span className="options-expiry-date">{formatDate(holding.expiry_date)}</span>
                            <span className={'options-expiry-remaining ' + getExpiryClass(holding.expiry_date)}>
                              {getExpiryLabel(holding.expiry_date)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button
                            className="options-exercise-btn"
                            onClick={() => handleExercise(holding.id)}
                            disabled={!holding.in_the_money || getDaysRemaining(holding.expiry_date) <= 0}
                          >
                            행사
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info section */}
        <div className="options-section">
          <h2 className="options-section-title">옵션 거래 안내</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '8px 0', color: '#9ca3af', fontSize: 14, paddingLeft: 20, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 700 }}>&bull;</span>
              CALL 옵션: 주가가 행사가 이상으로 오를 것으로 예상할 때 매수
            </li>
            <li style={{ padding: '8px 0', color: '#9ca3af', fontSize: 14, paddingLeft: 20, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 700 }}>&bull;</span>
              PUT 옵션: 주가가 행사가 이하로 내릴 것으로 예상할 때 매수
            </li>
            <li style={{ padding: '8px 0', color: '#9ca3af', fontSize: 14, paddingLeft: 20, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 700 }}>&bull;</span>
              ITM (내가격): 행사 시 이익이 발생하는 상태
            </li>
            <li style={{ padding: '8px 0', color: '#9ca3af', fontSize: 14, paddingLeft: 20, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 700 }}>&bull;</span>
              OTM (외가격): 행사 시 이익이 없는 상태 (행사 불가)
            </li>
            <li style={{ padding: '8px 0', color: '#9ca3af', fontSize: 14, paddingLeft: 20, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, color: '#3b82f6', fontWeight: 700 }}>&bull;</span>
              만기일이 지나면 옵션은 자동 소멸됩니다
            </li>
          </ul>
        </div>
      </div>

      {/* Buy Modal */}
      {buyModal && (
        <div className="options-modal-overlay" onClick={() => setBuyModal(null)}>
          <div className="options-modal" onClick={(e) => e.stopPropagation()}>
            <button className="options-modal-close" onClick={() => setBuyModal(null)}>
              &times;
            </button>
            <h2 className="options-modal-title">옵션 매수</h2>

            <div className="options-modal-details">
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">종목</span>
                <span className="options-modal-detail-value">{buyModal.stock_symbol} ({buyModal.stock_name})</span>
              </div>
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">유형</span>
                <span className="options-modal-detail-value">
                  <span className={'options-type-badge ' + buyModal.type.toLowerCase()}>
                    {buyModal.type}
                  </span>
                </span>
              </div>
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">행사가</span>
                <span className="options-modal-detail-value">{formatNumber(buyModal.strike_price)} G</span>
              </div>
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">프리미엄 (1계약)</span>
                <span className="options-modal-detail-value">{formatNumber(buyModal.premium)} G</span>
              </div>
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">만기일</span>
                <span className="options-modal-detail-value">
                  {formatDate(buyModal.expiry_date)} ({getExpiryLabel(buyModal.expiry_date)})
                </span>
              </div>
              <div className="options-modal-detail-row">
                <span className="options-modal-detail-label">잔여 수량</span>
                <span className="options-modal-detail-value">{formatNumber(buyModal.remaining_supply)}</span>
              </div>
            </div>

            <div className="options-modal-input-group">
              <label>수량</label>
              <input
                type="number"
                min="1"
                max={buyModal.remaining_supply}
                step="1"
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(e.target.value)}
                disabled={buyLoading}
              />
            </div>

            <div className="options-modal-total">
              <span className="options-modal-total-label">총 매수 금액</span>
              <span className="options-modal-total-value">{formatNumber(totalCost)} G</span>
            </div>

            <div className="options-modal-actions">
              <button
                className="options-modal-cancel-btn"
                onClick={() => setBuyModal(null)}
                disabled={buyLoading}
              >
                취소
              </button>
              <button
                className="options-modal-confirm-btn"
                onClick={handleBuy}
                disabled={buyLoading || !parseInt(buyQuantity, 10) || parseInt(buyQuantity, 10) <= 0}
              >
                {buyLoading ? '처리 중...' : '매수 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionsPage;
