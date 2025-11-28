import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ExchangePage.css';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  coin_type: 'MAJOR' | 'MEME';
  current_price: number;
  base_currency_id?: string;
}

interface ExchangeRate {
  from: {
    coinId: string;
    symbol: string;
    name: string;
    type: string;
  };
  to: {
    coinId?: string;
    symbol: string;
    name: string;
    type?: string;
  };
  exchangeRate: number;
  feePercentage: number;
  example: {
    input: number;
    grossOutput: number;
    fee: number;
    netOutput: number;
  };
}

const ExchangePage = () => {
  const navigate = useNavigate();
  const [coins, setCoins] = useState<Coin[]>([]);
  const [userCoins, setUserCoins] = useState<any[]>([]);
  const [fromCoinId, setFromCoinId] = useState<string>('');
  const [toCoinId, setToCoinId] = useState<string>(''); // 'gold' 또는 코인 ID
  const [amount, setAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 코인 목록 조회
  useEffect(() => {
    fetchCoins();
    fetchUserCoins();
  }, []);

  const fetchCoins = async () => {
    try {
      const response = await api.get('/coins');
      setCoins(response.data);
    } catch (error) {
      console.error('코인 목록 조회 실패:', error);
    }
  };

  const fetchUserCoins = async () => {
    try {
      const response = await api.get('/wallets/balances');
      setUserCoins(response.data.balances || []);
    } catch (error) {
      console.error('보유 코인 조회 실패:', error);
    }
  };

  // 환전 비율 조회
  useEffect(() => {
    if (fromCoinId && toCoinId) {
      fetchExchangeRate();
    } else {
      setExchangeRate(null);
    }
  }, [fromCoinId, toCoinId]);

  const fetchExchangeRate = async () => {
    try {
      const params: any = { fromCoinId };
      if (toCoinId !== 'gold') {
        params.toCoinId = toCoinId;
      }

      const response = await api.get('/exchange/rate', { params });
      setExchangeRate(response.data.data);
    } catch (error: any) {
      console.error('환전 비율 조회 실패:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || '환전 비율 조회 실패' });
    }
  };

  // 환전 가능한 To 코인 목록
  const getAvailableToCoins = () => {
    if (!fromCoinId) return [];

    const fromCoin = coins.find((c) => c.id === fromCoinId);
    if (!fromCoin) return [];

    // MEME 코인 → MAJOR 코인만 가능
    if (fromCoin.coin_type === 'MEME') {
      return coins.filter((c) => c.coin_type === 'MAJOR');
    }

    // MAJOR 코인 → Gold만 가능
    if (fromCoin.coin_type === 'MAJOR') {
      return [{ id: 'gold', symbol: 'Gold', name: 'Gold' }];
    }

    return [];
  };

  // 환전 실행
  const handleExchange = async () => {
    if (!fromCoinId || !toCoinId || !amount || parseFloat(amount) <= 0) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload: any = {
        fromCoinId,
        amount: parseFloat(amount),
      };

      if (toCoinId !== 'gold') {
        payload.toCoinId = toCoinId;
      }

      const response = await api.post('/exchange', payload);
      setMessage({ type: 'success', text: '환전이 완료되었습니다!' });
      setAmount('');
      fetchUserCoins();

      // 3초 후 메시지 제거
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('환전 실패:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || '환전에 실패했습니다' });
    } finally {
      setLoading(false);
    }
  };

  // 보유 코인 찾기
  const getUserCoinBalance = (coinId: string) => {
    const userCoin = userCoins.find((c) => c.coin_id === coinId);
    return userCoin ? parseFloat(userCoin.total_amount || 0) : 0;
  };

  // 예상 받을 금액 계산
  const calculateExpectedAmount = () => {
    if (!amount || !exchangeRate) return 0;
    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount)) return 0;
    return inputAmount * exchangeRate.example.netOutput;
  };

  return (
    <div className="exchange-page">
      <div className="exchange-container">
        <div className="exchange-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← 뒤로가기
          </button>
          <h1>환전</h1>
        </div>

        <div className="exchange-info">
          <div className="info-box">
            <h3>📌 환전 규칙</h3>
            <ul>
              <li>MEME 코인 → MAJOR 코인: 5% 수수료</li>
              <li>MAJOR 코인 → Gold: 5% 수수료</li>
              <li>MEME 코인 → Gold: 불가능 (2단계 필요, 총 10%)</li>
            </ul>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="exchange-form">
          <div className="form-group">
            <label>환전할 코인</label>
            <select
              value={fromCoinId}
              onChange={(e) => {
                setFromCoinId(e.target.value);
                setToCoinId('');
              }}
              disabled={loading}
            >
              <option value="">선택하세요</option>
              {coins.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.symbol} ({coin.name}) - {coin.coin_type}
                </option>
              ))}
            </select>
            {fromCoinId && (
              <div className="balance-info">
                보유: {getUserCoinBalance(fromCoinId).toFixed(8)}
              </div>
            )}
          </div>

          <div className="exchange-arrow">↓</div>

          <div className="form-group">
            <label>받을 코인/화폐</label>
            <select
              value={toCoinId}
              onChange={(e) => setToCoinId(e.target.value)}
              disabled={loading || !fromCoinId}
            >
              <option value="">선택하세요</option>
              {getAvailableToCoins().map((coin: any) => (
                <option key={coin.id} value={coin.id}>
                  {coin.symbol} ({coin.name})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>환전 수량</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="환전할 수량을 입력하세요"
              disabled={loading}
              min="0"
              step="0.00000001"
            />
          </div>

          {exchangeRate && amount && parseFloat(amount) > 0 && (
            <div className="exchange-preview">
              <h3>환전 미리보기</h3>
              <div className="preview-row">
                <span>환전 비율:</span>
                <span>1 {exchangeRate.from.symbol} = {exchangeRate.exchangeRate.toFixed(8)} {exchangeRate.to.symbol}</span>
              </div>
              <div className="preview-row">
                <span>수수료 ({exchangeRate.feePercentage}%):</span>
                <span>{(parseFloat(amount) * exchangeRate.example.fee).toFixed(8)} {exchangeRate.to.symbol}</span>
              </div>
              <div className="preview-row total">
                <span>받을 금액:</span>
                <span>{calculateExpectedAmount().toFixed(8)} {exchangeRate.to.symbol}</span>
              </div>
            </div>
          )}

          <button
            className="exchange-btn"
            onClick={handleExchange}
            disabled={loading || !fromCoinId || !toCoinId || !amount || parseFloat(amount) <= 0}
          >
            {loading ? '환전 중...' : '환전하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangePage;
