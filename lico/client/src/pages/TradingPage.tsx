import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { coinService } from '../services/coinService';
import api from '../services/api';
import type { Coin } from '../types';
import TradingChart from '../components/TradingChart';
import Orderbook from '../components/Orderbook';
import OrderForm from '../components/OrderForm';
import CoinSidebar from '../components/CoinSidebar';
import { TickerTape, MarketData, AdvancedChart } from '../components/TradingViewWidgets';
import './TradingPage.css';

const TradingPage = () => {
  const { coinSymbol } = useParams<{ coinSymbol?: string }>();
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [userLoading, setUserLoading] = useState(true);
  const [activeChartTab, setActiveChartTab] = useState<'lightweight' | 'tradingview'>('lightweight');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await api.get('/auth/me');
        if (response.data.user) {
          setWalletAddress(response.data.user.wallet_address);
          setGoldBalance(response.data.user.gold_balance || 0);
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
    const fetchCoin = async () => {
      try {
        if (coinSymbol) {
          const coin = await coinService.getCoinBySymbol(coinSymbol);
          setSelectedCoin(coin);
        } else {
          const coins = await coinService.getCoins('ACTIVE');
          if (coins.length > 0) {
            setSelectedCoin(coins[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch coin:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoin();
  }, [coinSymbol]);

  const handleOrderSuccess = () => {
    console.log('Order placed successfully');
  };

  if (loading || userLoading) {
    return (
      <div className="trading-page">
        <div className="loading-state">로딩 중...</div>
      </div>
    );
  }

  if (!selectedCoin) {
    return (
      <div className="trading-page">
        <div className="empty-state">코인을 찾을 수 없습니다</div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="trading-page">
        <div className="empty-state">지갑 정보를 불러올 수 없습니다</div>
      </div>
    );
  }

  const formatPrice = (price: number | string | null | undefined) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '0';
    return numPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  const formatChange = (change: number | string | null | undefined) => {
    const numChange = typeof change === 'string' ? parseFloat(change) : (change || 0);
    if (isNaN(numChange)) return '+0.00%';
    const sign = numChange >= 0 ? '+' : '';
    return sign + numChange.toFixed(2) + '%';
  };

  return (
    <div className="trading-page">
      <TickerTape />
      <div className="trading-container">
        <div className="main-content">
          <div className="coin-header">
            <div className="coin-header-left">
              {selectedCoin.logo_url && (
                <img src={selectedCoin.logo_url} alt={selectedCoin.symbol} className="coin-header-logo" />
              )}
              <div className="coin-header-info">
                <h1>{selectedCoin.name}</h1>
                <div className="coin-header-symbols">
                  <span className="coin-symbol">{selectedCoin.symbol}</span>
                  <span className="coin-divider">/</span>
                  <span className="coin-quote">GOLD</span>
                </div>
              </div>
            </div>
            <div className="coin-header-right">
              <div className="coin-price-large">{formatPrice(selectedCoin.current_price)} G</div>
              <div className={'coin-change-large ' + (selectedCoin.price_change_24h >= 0 ? 'positive' : 'negative')}>
                {formatChange(selectedCoin.price_change_24h)}
              </div>
            </div>
          </div>

          <div className="coin-stats">
            <div className="stat-item">
              <span className="stat-label">최고(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.current_price * 1.1)} G</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최저(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.current_price * 0.9)} G</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">거래량(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.volume_24h)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시가총액</span>
              <span className="stat-value">{formatPrice(selectedCoin.market_cap)} G</span>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-main">
              <div className="chart-tabs">
                <button
                  className={`chart-tab ${activeChartTab === 'lightweight' ? 'active' : ''}`}
                  onClick={() => setActiveChartTab('lightweight')}
                >
                  자체 차트 (lightweight-charts)
                </button>
                <button
                  className={`chart-tab ${activeChartTab === 'tradingview' ? 'active' : ''}`}
                  onClick={() => setActiveChartTab('tradingview')}
                >
                  TradingView
                </button>
              </div>
              <div className="chart-content">
                {activeChartTab === 'lightweight' && (
                  <div className="chart-panel active">
                    <TradingChart coinId={selectedCoin.id} coinSymbol={selectedCoin.symbol} />
                  </div>
                )}
                {activeChartTab === 'tradingview' && (
                  <div className="chart-panel active">
                    <AdvancedChart coinSymbol={selectedCoin.symbol} interval="60" />
                  </div>
                )}
              </div>
            </div>
            <div className="chart-side">
              <MarketData coinSymbol={selectedCoin.symbol} />
            </div>
          </div>

          <div className="trading-panel">
            <div className="orderbook-section">
              <Orderbook coinId={selectedCoin.id} />
            </div>
            <div className="order-form-section">
              <OrderForm
                coin={selectedCoin}
                walletAddress={walletAddress}
                goldBalance={goldBalance}
                onOrderSuccess={handleOrderSuccess}
              />
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <CoinSidebar selectedCoinId={selectedCoin.id} />
        </div>
      </div>
    </div>
  );
};

export default TradingPage;
