import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { coinService } from '../services/coinService';
import api from '../services/api';
import type { Coin, Candle } from '../types';
import Orderbook from '../components/Orderbook';
import OrderForm from '../components/OrderForm';
import CoinSidebar from '../components/CoinSidebar';
import TopRankingsTicker from '../components/TopRankingsTicker';
import './TradingPage.css';

const TradingPage = () => {
  const { coinSymbol } = useParams<{ coinSymbol?: string }>();
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [userLoading, setUserLoading] = useState(true);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [chartInterval, setChartInterval] = useState<'1m' | '1h' | '1d'>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);

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

  // 캔들 데이터 가져오기
  useEffect(() => {
    const fetchCandles = async () => {
      if (!selectedCoin) return;
      try {
        const response = await api.get(`/coins/${selectedCoin.id}/candles/${chartInterval}`, {
          params: { limit: 100 }
        });
        setCandles(response.data.candles || []);
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      }
    };

    if (selectedCoin) {
      fetchCandles();
    }
  }, [selectedCoin, chartInterval]);

  // 차트 초기화
  useEffect(() => {
    if (!chartContainerRef.current || !selectedCoin) return;

    // 기존 차트 제거
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    }

    // 컨테이너 크기 확인
    const containerWidth = chartContainerRef.current.clientWidth;
    if (containerWidth === 0) {
      const timeoutId = setTimeout(() => {
        if (chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
          initializeChart();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    initializeChart();

    function initializeChart() {
      if (!chartContainerRef.current) return;

      try {
        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1d29' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#2a2e3e' },
            horzLines: { color: '#2a2e3e' },
          },
          width: chartContainerRef.current.clientWidth || 800,
          height: 500,
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
          },
        });

        chartRef.current = chart;

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        }) as ISeriesApi<'Candlestick'>;

        candlestickSeriesRef.current = candlestickSeries;
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    }

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const width = chartContainerRef.current.clientWidth;
        if (width > 0) {
          chartRef.current.applyOptions({
            width: width,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, [selectedCoin, chartInterval]);

  // 차트 데이터 업데이트
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;

    const formattedData: CandlestickData<UTCTimestamp>[] = candles
      .map((candle) => {
        const open = typeof candle.open_price === 'string' ? parseFloat(candle.open_price) : (candle.open_price || 0);
        const high = typeof candle.high_price === 'string' ? parseFloat(candle.high_price) : (candle.high_price || 0);
        const low = typeof candle.low_price === 'string' ? parseFloat(candle.low_price) : (candle.low_price || 0);
        const close = typeof candle.close_price === 'string' ? parseFloat(candle.close_price) : (candle.close_price || 0);
        
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || 
            open <= 0 || high <= 0 || low <= 0 || close <= 0) {
          return null;
        }

        const timestamp = new Date(candle.open_time).getTime() / 1000;
        if (isNaN(timestamp) || timestamp <= 0) {
          return null;
        }

        return {
          time: timestamp as UTCTimestamp,
          open,
          high,
          low,
          close,
        };
      })
      .filter((candle): candle is CandlestickData<UTCTimestamp> => candle !== null);

    if (formattedData.length > 0) {
      try {
        candlestickSeriesRef.current.setData(formattedData);
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (error) {
        console.error('Failed to set chart data:', error);
      }
    }
  }, [candles]);

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
      <TopRankingsTicker />
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
              <div className="chart-header">
                <div className="chart-intervals">
                  <button
                    className={chartInterval === '1m' ? 'active' : ''}
                    onClick={() => setChartInterval('1m')}
                  >
                    1분
                  </button>
                  <button
                    className={chartInterval === '1h' ? 'active' : ''}
                    onClick={() => setChartInterval('1h')}
                  >
                    1시간
                  </button>
                  <button
                    className={chartInterval === '1d' ? 'active' : ''}
                    onClick={() => setChartInterval('1d')}
                  >
                    1일
                  </button>
                </div>
              </div>
              <div ref={chartContainerRef} className="chart-container" />
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
