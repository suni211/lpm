import { useState } from 'react';
import { tradingService } from '../services/coinService';
import type { Coin } from '../types';
import './OrderForm.css';

interface OrderFormProps {
  coin: Coin;
  walletAddress: string;
  goldBalance: number;
  onOrderSuccess: () => void;
}

type OrderType = 'BUY' | 'SELL';

const OrderForm = ({ coin, walletAddress, goldBalance, onOrderSuccess }: OrderFormProps) => {
  const [orderType, setOrderType] = useState<OrderType>('BUY');
  const [inputMode, setInputMode] = useState<'quantity' | 'amount'>('amount'); // 금액 모드 기본
  const [price, setPrice] = useState(() => {
    const priceValue = typeof coin.current_price === 'string' ? parseFloat(coin.current_price) : (coin.current_price || 0);
    return isNaN(priceValue) ? '0' : priceValue.toString();
  });
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const p = parseFloat(price);
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
    }

    setLoading(true);

    try {
      const orderData: any = {
        wallet_address: walletAddress,
        coin_id: coin.id,
        order_type: orderType,
        order_method: 'LIMIT',
        price: p,
      };

      // 금액 모드면 amount 전송, 수량 모드면 quantity 전송
      if (inputMode === 'amount') {
        orderData.amount = finalAmount;
      } else {
        orderData.quantity = finalQuantity;
      }

      await tradingService.createOrder(orderData);

      setQuantity('');
      setAmount('');
      setError('');
      alert('주문이 등록되었습니다!');
      onOrderSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || '주문 실패');
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
      } else {
        // 수량 모드: 최대 수량 설정
        const p = parseFloat(price) || 0;
        if (p > 0) {
          const maxQty = parseFloat((goldBalance / (p * 1.05)).toFixed(8));
          setQuantity(maxQty.toString());
        }
      }
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
        {/* 입력 모드 선택 */}
        <div className="input-mode-selector">
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

        <div className="form-group">
          <label>가격 (GOLD)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="가격"
            step="any"
            required
          />
        </div>

        {inputMode === 'amount' ? (
          <div className="form-group">
            <label>
              {orderType === 'BUY' ? '구매 금액' : '판매 금액'} (GOLD)
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
                ≈ {formatNumber(calculateQuantityFromAmount())} {coin.symbol}
              </div>
            )}
          </div>
        ) : (
          <div className="form-group">
            <label>
              {orderType === 'BUY' ? '구매 수량' : '판매 수량'} ({coin.symbol})
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
          <span>보유 잔액</span>
          <span className="balance-amount">{formatNumber(goldBalance)} G</span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          className={'submit-button ' + (orderType === 'BUY' ? 'buy-button' : 'sell-button')}
          disabled={loading}
        >
          {loading ? '처리 중...' : orderType === 'BUY' ? '매수하기' : '매도하기'}
        </button>
      </form>
    </div>
  );
};

export default OrderForm;
