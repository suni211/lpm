import { useState, useEffect } from 'react';
import { tradingService, walletService } from '../services/stockService';
import type { Stock, StockBalance } from '../types';
import './OrderForm.css';

interface OrderFormProps {
  stock: Stock;
  walletAddress: string;
  goldBalance: number;
  onOrderSuccess: () => void;
}

type OrderType = 'BUY' | 'SELL';

const OrderForm = ({ stock, walletAddress, goldBalance, onOrderSuccess }: OrderFormProps) => {
  const [orderType, setOrderType] = useState<OrderType>('BUY');
  const [inputMode, setInputMode] = useState<'quantity' | 'amount'>('amount'); // 금액 모드 기본
  const [orderMethod, setOrderMethod] = useState<'LIMIT' | 'MARKET'>('LIMIT'); // 지정가/시장가 선택
  const [price, setPrice] = useState(() => {
    const priceValue = typeof stock.current_price === 'string' ? parseFloat(stock.current_price) : (stock.current_price || 0);
    return isNaN(priceValue) ? '0' : priceValue.toString();
  });
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stockBalance, setStockBalance] = useState<StockBalance | null>(null);

  // 주식 잔액 조회
  useEffect(() => {
    const fetchStockBalance = async () => {
      try {
        const balances = await walletService.getMyBalances(walletAddress);
        const balance = balances.balances?.find((b: StockBalance) => b.stock_id === stock.id);
        // 잔액이 없어도 기본값으로 설정 (표시를 위해)
        if (balance) {
          setStockBalance(balance);
        } else {
          // 잔액이 없을 때도 기본 구조로 설정하여 항상 표시되도록
          setStockBalance({
            id: '',
            wallet_id: walletAddress,
            stock_id: stock.id,
            total_amount: 0,
            available_amount: 0,
            locked_amount: 0,
            average_buy_price: 0,
            total_profit_loss: 0,
            updated_at: new Date().toISOString(),
            symbol: stock.symbol,
            name: stock.name,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stock balance:', error);
        // 조회 실패 시에도 기본값 설정
        setStockBalance({
          id: '',
          wallet_id: walletAddress,
          stock_id: stock.id,
          total_amount: 0,
          available_amount: 0,
          locked_amount: 0,
          average_buy_price: 0,
          total_profit_loss: 0,
          updated_at: new Date().toISOString(),
          symbol: stock.symbol,
          name: stock.name,
        });
      }
    };

    if (walletAddress && stock.id) {
      fetchStockBalance();
    }
  }, [walletAddress, stock.id]);

  const calculateTotal = () => {
    const p = parseFloat(price) || 0;
    if (inputMode === 'amount') {
      return parseFloat(amount) || 0;
    } else {
      const q = parseFloat(quantity) || 0;
      return p * q;
    }
  };

  // 금액 모드일 때 수량 계산
  const calculateQuantityFromAmount = () => {
    const p = parseFloat(price) || 0;
    const a = parseFloat(amount) || 0;
    if (p > 0 && a > 0) {
      return parseFloat((a / p).toFixed(8));
    }
    return 0;
  };

  // 수량 모드일 때 금액 계산
  const calculateAmountFromQuantity = () => {
    const p = parseFloat(price) || 0;
    const q = parseFloat(quantity) || 0;
    return p * q;
  };

  const calculateFee = () => {
    return Math.floor(calculateTotal() * 0.05);
  };

  const calculateTotalWithFee = () => {
    if (orderType === 'BUY') {
      // 매수: 총 금액 = 주문 금액 + 수수료 (지불해야 할 금액)
      return calculateTotal() + calculateFee();
    } else {
      // 매도: 총 금액 = 주문 금액 - 수수료 (받을 금액)
      return calculateTotal() - calculateFee();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 시장가 주문인 경우 가격은 현재가 사용
    const p = orderMethod === 'MARKET'
      ? (typeof stock.current_price === 'string' ? parseFloat(stock.current_price) : (stock.current_price || 0))
      : parseFloat(price);

    if (!p || p <= 0) {
      setError('유효하지 않은 가격입니다');
      return;
    }

    let finalQuantity = 0;
    let finalAmount = 0;

    if (inputMode === 'amount') {
      // 금액 모드
      const a = parseFloat(amount);
      if (!a || a <= 0) {
        setError('유효하지 않은 금액입니다');
        return;
      }
      finalAmount = a;
      finalQuantity = calculateQuantityFromAmount();
      if (finalQuantity <= 0) {
        setError('입력한 금액으로는 구매할 수 있는 수량이 없습니다');
        return;
      }
    } else {
      // 수량 모드
      const q = parseFloat(quantity);
      if (!q || q <= 0) {
        setError('유효하지 않은 수량입니다');
        return;
      }
      finalQuantity = q;
      finalAmount = calculateAmountFromQuantity();
    }

    if (orderType === 'BUY') {
      const totalRequired = calculateTotalWithFee();
      if (goldBalance < totalRequired) {
        setError(`잔액 부족 (필요: ${formatNumber(totalRequired)} G, 보유: ${formatNumber(goldBalance)} G)`);
        return;
      }
    } else {
      // 매도: 주식 잔액 체크 (예약 주문이므로 total_amount 체크)
      if (!stockBalance) {
        // 주식 잔액을 다시 조회
        try {
          const balances = await walletService.getMyBalances(walletAddress);
          const balance = balances.balances?.find((b: StockBalance) => b.stock_id === stock.id);
          if (!balance || (typeof balance.total_amount === 'string' ? parseFloat(balance.total_amount) : (balance.total_amount || 0)) <= 0) {
            setError('매도할 수 있는 주식이 없습니다');
            return;
          }
        } catch (err) {
          setError('주식 잔액을 확인할 수 없습니다');
          return;
        }
      } else {
        const totalAmount = typeof stockBalance.total_amount === 'string' ? parseFloat(stockBalance.total_amount) : (stockBalance.total_amount || 0);
        const availableAmount = typeof stockBalance.available_amount === 'string' ? parseFloat(stockBalance.available_amount) : (stockBalance.available_amount || 0);

        // 예약 주문이므로 total_amount가 있으면 가능하지만, 입력한 수량이 total_amount를 초과하면 안 됨
        if (totalAmount <= 0) {
          setError('매도할 수 있는 주식이 없습니다');
          return;
        }

        // 입력한 수량이 보유량을 초과하는지 체크
        if (finalQuantity > totalAmount) {
          setError(`보유량 부족 (보유: ${formatNumber(totalAmount)} ${stock.symbol}, 요청: ${formatNumber(finalQuantity)} ${stock.symbol})`);
          return;
        }

        // available_amount가 부족하면 경고만 (예약 주문이므로 가능)
        if (finalQuantity > availableAmount) {
          // 경고만 표시하고 계속 진행 (다른 주문이 체결되면 사용 가능해질 수 있음)
          console.warn(`사용 가능한 수량이 부족합니다 (사용 가능: ${formatNumber(availableAmount)}, 요청: ${formatNumber(finalQuantity)})`);
        }
      }
    }

    setLoading(true);

    try {
      const orderData: any = {
        wallet_address: walletAddress,
        stock_id: stock.id,
        order_type: orderType,
        order_method: orderMethod,
        price: orderMethod === 'LIMIT' ? p : undefined,
      };

      // 금액 모드면 amount 전송, 수량 모드면 quantity 전송
      if (inputMode === 'amount') {
        orderData.amount = finalAmount;
      } else {
        orderData.quantity = finalQuantity;
      }

      const result = await tradingService.createOrder(orderData);

      // 창업자 매도 제한 응답 처리
      if (result.founder_sell_request) {
        alert(`창업자 매도 요청이 접수되었습니다. 관리자 승인 후 처리됩니다.`);
      } else if (orderMethod === 'MARKET') {
        alert('시장가 주문이 체결되었습니다!');
      } else {
        alert('지정가 주문이 등록되었습니다!');
      }

      setQuantity('');
      setAmount('');
      setError('');

      // 주식 잔액 다시 조회
      try {
        const balances = await walletService.getMyBalances(walletAddress);
        const balance = balances.balances?.find((b: StockBalance) => b.stock_id === stock.id);
        setStockBalance(balance || null);
      } catch (err) {
        console.error('Failed to refresh stock balance:', err);
      }

      onOrderSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '주문 실패';
      // 창업자 매도 제한 에러 메시지 처리
      if (err.response?.data?.founder_sell_request) {
        alert(`창업자 매도 요청이 접수되었습니다. 관리자 승인 후 처리됩니다.`);
        onOrderSuccess();
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const handleMaxQuantity = () => {
    if (orderType === 'BUY') {
      if (inputMode === 'amount') {
        // 금액 모드: 최대 금액 설정 (수수료 5% 제외)
        const maxAmount = Math.floor(goldBalance / 1.05);
        setAmount(maxAmount.toString());
        handleAmountChange(maxAmount.toString());
      } else {
        // 수량 모드: 최대 수량 설정
        const p = parseFloat(price) || 0;
        if (p > 0) {
          const maxQty = parseFloat((goldBalance / (p * 1.05)).toFixed(8));
          setQuantity(maxQty.toString());
          handleQuantityChange(maxQty.toString());
        }
      }
    } else {
      // 매도: 주식 잔액 사용 (total_amount 사용, 예약 주문이므로)
      if (stockBalance) {
        const totalAmount = typeof stockBalance.total_amount === 'string' ? parseFloat(stockBalance.total_amount) : (stockBalance.total_amount || 0);
        if (totalAmount > 0) {
          if (inputMode === 'amount') {
            const p = parseFloat(price) || 0;
            if (p > 0) {
              const maxAmount = parseFloat((totalAmount * p).toFixed(8));
              setAmount(maxAmount.toString());
              handleAmountChange(maxAmount.toString());
            }
          } else {
            setQuantity(totalAmount.toString());
            handleQuantityChange(totalAmount.toString());
          }
        }
      }
    }
  };

  // 전량 매수/매도
  const handleFullOrder = async () => {
    setError('');

    if (orderType === 'BUY') {
      // 전량 매수: Gold 잔액 전부 사용 (수수료 5% 제외)
      const maxAmount = Math.floor(goldBalance / 1.05);
      if (maxAmount <= 0) {
        setError('매수할 수 있는 금액이 없습니다');
        return;
      }
      setAmount(maxAmount.toString());
      handleAmountChange(maxAmount.toString());
      // 자동으로 주문 제출
      setTimeout(() => {
        const form = document.querySelector('.order-form form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }, 100);
    } else {
      // 전량 매도: 주식 잔액 전부 사용 (예약 주문이므로 total_amount 사용)
      if (!stockBalance) {
        // 주식 잔액을 다시 조회
        try {
          const balances = await walletService.getMyBalances(walletAddress);
          const balance = balances.balances?.find((b: StockBalance) => b.stock_id === stock.id);
          if (!balance) {
            setError('주식 잔액을 확인할 수 없습니다');
            return;
          }
          const totalAmount = typeof balance.total_amount === 'string' ? parseFloat(balance.total_amount) : (balance.total_amount || 0);
          if (totalAmount <= 0) {
            setError('매도할 수 있는 주식이 없습니다');
            return;
          }
          setQuantity(totalAmount.toString());
          handleQuantityChange(totalAmount.toString());
        } catch (err) {
          setError('주식 잔액을 확인할 수 없습니다');
          return;
        }
      } else {
        const totalAmount = typeof stockBalance.total_amount === 'string' ? parseFloat(stockBalance.total_amount) : (stockBalance.total_amount || 0);
        if (totalAmount <= 0) {
          setError('매도할 수 있는 주식이 없습니다');
          return;
        }
        setQuantity(totalAmount.toString());
        handleQuantityChange(totalAmount.toString());
      }
      // 자동으로 주문 제출
      setTimeout(() => {
        const form = document.querySelector('.order-form form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }, 100);
    }
  };

  // 입력 모드 변경 시 상호 계산
  const handleInputModeChange = (mode: 'quantity' | 'amount') => {
    setInputMode(mode);
    if (mode === 'amount') {
      // 수량 모드에서 금액 모드로: 금액 계산
      const calculatedAmount = calculateAmountFromQuantity();
      setAmount(calculatedAmount > 0 ? calculatedAmount.toString() : '');
    } else {
      // 금액 모드에서 수량 모드로: 수량 계산
      const calculatedQuantity = calculateQuantityFromAmount();
      setQuantity(calculatedQuantity > 0 ? calculatedQuantity.toString() : '');
    }
  };

  // 금액 입력 시 수량 자동 계산
  const handleAmountChange = (value: string) => {
    setAmount(value);
    const a = parseFloat(value) || 0;
    const p = parseFloat(price) || 0;
    if (p > 0 && a > 0) {
      const q = parseFloat((a / p).toFixed(8));
      setQuantity(q.toString());
    } else {
      setQuantity('');
    }
  };

  // 수량 입력 시 금액 자동 계산
  const handleQuantityChange = (value: string) => {
    setQuantity(value);
    const q = parseFloat(value) || 0;
    const p = parseFloat(price) || 0;
    if (p > 0 && q > 0) {
      const a = p * q;
      setAmount(a.toString());
    } else {
      setAmount('');
    }
  };

  return (
    <div className="order-form">
      <div className="order-type-tabs">
        <button
          className={'tab-button buy-tab ' + (orderType === 'BUY' ? 'active' : '')}
          onClick={() => setOrderType('BUY')}
        >
          매수
        </button>
        <button
          className={'tab-button sell-tab ' + (orderType === 'SELL' ? 'active' : '')}
          onClick={() => setOrderType('SELL')}
        >
          매도
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* 주문 방식 선택 (지정가/시장가) */}
        <div className="input-mode-selector">
          <button
            type="button"
            className={`mode-button ${orderMethod === 'LIMIT' ? 'active' : ''}`}
            onClick={() => setOrderMethod('LIMIT')}
          >
            지정가
          </button>
          <button
            type="button"
            className={`mode-button ${orderMethod === 'MARKET' ? 'active' : ''}`}
            onClick={() => setOrderMethod('MARKET')}
          >
            시장가
          </button>
        </div>

        {/* 입력 모드 선택 */}
        <div className="input-mode-selector" style={{ marginTop: '8px' }}>
          <button
            type="button"
            className={`mode-button ${inputMode === 'amount' ? 'active' : ''}`}
            onClick={() => handleInputModeChange('amount')}
          >
            금액
          </button>
          <button
            type="button"
            className={`mode-button ${inputMode === 'quantity' ? 'active' : ''}`}
            onClick={() => handleInputModeChange('quantity')}
          >
            수량
          </button>
        </div>

        {orderMethod === 'LIMIT' && (
          <div className="form-group">
            <label>가격 (G)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="가격"
              step="any"
              required
            />
          </div>
        )}

        {orderMethod === 'MARKET' && (
          <div className="form-group">
            <label>시장가 (현재가: {formatNumber(stock.current_price)} G)</label>
            <input
              type="text"
              value={`${formatNumber(stock.current_price)} G`}
              disabled
              style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
            />
          </div>
        )}

        {inputMode === 'amount' ? (
          <div className="form-group">
            <label>
              {orderType === 'BUY' ? '구매 금액' : '판매 금액'} (G)
              {orderType === 'BUY' && (
                <button
                  type="button"
                  className="max-button"
                  onClick={handleMaxQuantity}
                >
                  최대
                </button>
              )}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="금액 입력 (예: 5000000)"
              step="any"
              required
            />
            {amount && (
              <div className="calculated-info">
                ≈ {formatNumber(calculateQuantityFromAmount())} {stock.symbol}
              </div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label>
              {orderType === 'BUY' ? '구매 수량' : '판매 수량'} ({stock.symbol})
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {orderType === 'BUY' && (
                  <button
                    type="button"
                    className="max-button"
                    onClick={handleMaxQuantity}
                  >
                    최대
                  </button>
                )}
                <button
                  type="button"
                  className="full-button"
                  onClick={handleFullOrder}
                  style={{
                    padding: '4px 12px',
                    background: orderType === 'BUY' ? '#22c55e' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  전량 {orderType === 'BUY' ? '매수' : '매도'}
                </button>
              </div>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="수량 입력"
              step="any"
              required
            />
            {quantity && (
              <div className="calculated-info">
                ≈ {formatNumber(calculateAmountFromQuantity())} G
              </div>
            )}
          </div>
        )}

        <div className="order-summary">
          <div className="summary-row">
            <span>주문 금액</span>
            <span>{formatNumber(calculateTotal())} G</span>
          </div>
          <div className="summary-row fee-row">
            <span>수수료 (5%)</span>
            <span>{formatNumber(calculateFee())} G</span>
          </div>
          <div className="summary-row total-row">
            <span>{orderType === 'BUY' ? '총 지불 금액' : '총 받을 금액'}</span>
            <span>{formatNumber(calculateTotalWithFee())} G</span>
          </div>
        </div>

        <div className="balance-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>보유 Gold</span>
            <span className="balance-amount">{formatNumber(goldBalance)} G</span>
          </div>
          {(() => {
            // stockBalance가 없으면 기본값 0으로 표시
            const totalAmount = stockBalance
              ? (typeof stockBalance.total_amount === 'string' ? parseFloat(stockBalance.total_amount) : (stockBalance.total_amount || 0))
              : 0;
            const availableAmount = stockBalance
              ? (typeof stockBalance.available_amount === 'string' ? parseFloat(stockBalance.available_amount) : (stockBalance.available_amount || 0))
              : 0;
            const lockedAmount = stockBalance
              ? (typeof stockBalance.locked_amount === 'string' ? parseFloat(stockBalance.locked_amount) : (stockBalance.locked_amount || 0))
              : 0;

            // 항상 주식 잔액 표시 (0이어도 표시)
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>보유 {stock.symbol}</span>
                  <span className="balance-amount">{formatNumber(totalAmount)} {stock.symbol}</span>
                </div>
                {availableAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                    <span>사용 가능</span>
                    <span>{formatNumber(availableAmount)} {stock.symbol}</span>
                  </div>
                )}
                {lockedAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#f59e0b' }}>
                    <span>주문 중</span>
                    <span>{formatNumber(lockedAmount)} {stock.symbol}</span>
                  </div>
                )}
                {totalAmount === 0 && availableAmount === 0 && lockedAmount === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af' }}>
                    <span>보유 주식 없음</span>
                    <span>0 {stock.symbol}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className={'submit-button ' + (orderType === 'BUY' ? 'buy-button' : 'sell-button')}
          disabled={loading}
        >
          {loading ? '처리 중...' : (
            orderMethod === 'MARKET'
              ? (orderType === 'BUY' ? '시장가 매수' : '시장가 매도')
              : (orderType === 'BUY' ? '지정가 매수' : '지정가 매도')
          )}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;
