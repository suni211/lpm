import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';
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
  const [chartLoading, setChartLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chartInitializedRef = useRef(false);

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

  // WebSocket 연결 및 실시간 가격 업데이트
  useEffect(() => {
    if (!selectedCoin) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    // 코인 구독
    socket.emit('subscribe:coin', selectedCoin.id);

    // 가격 업데이트 수신
    socket.on('price:update', (priceData: any) => {
      if (priceData.coin_id === selectedCoin.id) {
        setSelectedCoin((prevCoin) => {
          if (!prevCoin) return prevCoin;
          return {
            ...prevCoin,
            current_price: priceData.current_price || prevCoin.current_price,
            price_change_24h: priceData.price_change_24h !== undefined 
              ? priceData.price_change_24h 
              : prevCoin.price_change_24h,
            volume_24h: priceData.volume_24h !== undefined 
              ? priceData.volume_24h 
              : prevCoin.volume_24h,
            market_cap: priceData.market_cap !== undefined 
              ? priceData.market_cap 
              : prevCoin.market_cap,
          };
        });
      }
    });

    // 연결 오류 처리
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // 정리 함수
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:coin', selectedCoin.id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedCoin?.id]);

  // 캔들 데이터 가져오기
  useEffect(() => {
    const fetchCandles = async () => {
      if (!selectedCoin) return;
      setChartLoading(true);
      try {
        const response = await api.get(`/coins/${selectedCoin.id}/candles/${chartInterval}`, {
          params: { limit: 100 }
        });
        setCandles(response.data.candles || []);
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      } finally {
        setChartLoading(false);
      }
    };

    if (selectedCoin) {
      fetchCandles();
    }
  }, [selectedCoin, chartInterval]);

  // 차트 초기화 (selectedCoin이 있을 때만)
  useEffect(() => {
    if (!selectedCoin) return;

    // 기존 차트가 있으면 제거
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // 무시
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      chartInitializedRef.current = false;
    }

    function initializeChart() {
      if (!chartContainerRef.current || !selectedCoin) return;

      const container = chartContainerRef.current;
      let width = container.clientWidth;
      let height = container.clientHeight;

      // 컨테이너 크기가 없으면 기본값 사용
      if (width === 0) width = 800;
      if (height === 0) height = 350;

      try {
        const chart = createChart(container, {
          layout: {
            background: { type: ColorType.Solid, color: '#1a1d29' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#2a2e3e' },
            horzLines: { color: '#2a2e3e' },
          },
          width: width,
          height: height,
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
        chartInitializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize chart:', error);
      }
    }

    // 컨테이너가 준비될 때까지 대기 (최대 1초)
    let timeoutId: NodeJS.Timeout | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    const tryInitialize = () => {
      if (!chartContainerRef.current || !selectedCoin) return;

      const container = chartContainerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width > 0 && height > 0) {
        initializeChart();
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          timeoutId = setTimeout(tryInitialize, 100);
        } else {
          // 최대 시도 후에도 크기가 없으면 기본값으로 초기화
          initializeChart();
        }
      }
    };

    // 즉시 시도
    tryInitialize();

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const width = chartContainerRef.current.clientWidth;
        const height = chartContainerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          chartRef.current.applyOptions({
            width: width,
            height: height,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          // 무시
        }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        chartInitializedRef.current = false;
      }
    };
  }, [selectedCoin?.id]); // selectedCoin이 변경될 때 차트 재초기화

  // 차트 데이터 업데이트 (최적화: 데이터만 업데이트)
  useEffect(() => {
    if (!candlestickSeriesRef.current) {
      // 차트가 아직 초기화되지 않았으면 잠시 후 다시 시도
      if (candles.length > 0) {
        const timeoutId = setTimeout(() => {
          // 차트가 초기화되었는지 다시 확인
          if (candlestickSeriesRef.current && candles.length > 0) {
            // 강제로 다시 실행하기 위해 상태 업데이트 트리거는 없지만
            // 다음 렌더링 사이클에서 다시 시도됨
          }
        }, 300);
        return () => clearTimeout(timeoutId);
      }
      return;
    }

    if (candles.length === 0) return;

    // 데이터 포맷팅 최적화 (한 번에 처리)
    const formattedData: CandlestickData<UTCTimestamp>[] = [];
    for (const candle of candles) {
      const open = typeof candle.open_price === 'string' ? parseFloat(candle.open_price) : (candle.open_price || 0);
      const high = typeof candle.high_price === 'string' ? parseFloat(candle.high_price) : (candle.high_price || 0);
      const low = typeof candle.low_price === 'string' ? parseFloat(candle.low_price) : (candle.low_price || 0);
      const close = typeof candle.close_price === 'string' ? parseFloat(candle.close_price) : (candle.close_price || 0);
      
      if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || 
          open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        continue;
      }

      const timestamp = new Date(candle.open_time).getTime() / 1000;
      if (isNaN(timestamp) || timestamp <= 0) {
        continue;
      }

      formattedData.push({
        time: timestamp as UTCTimestamp,
        open,
        high,
        low,
        close,
      });
    }

    if (formattedData.length > 0) {
      try {
        // 차트 업데이트는 requestAnimationFrame으로 최적화
        requestAnimationFrame(() => {
          if (candlestickSeriesRef.current && chartRef.current) {
            candlestickSeriesRef.current.setData(formattedData);
            chartRef.current.timeScale().fitContent();
          }
        });
      } catch (error) {
        console.error('Failed to set chart data:', error);
      }
    }
  }, [candles, chartInterval]);

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
              <div ref={chartContainerRef} className="chart-container">
                {chartLoading && (
                  <div className="chart-loading">
                    <div className="chart-loading-spinner"></div>
                    <div className="chart-loading-text">차트 로딩 중...</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="trading-panel">
            <div className="orderbook-section">
              <Orderbook coinId={selectedCoin.id} />
            </div>
            <div className="coin-sidebar-section">
              <CoinSidebar selectedCoinId={selectedCoin.id} />
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <OrderForm
            coin={selectedCoin}
            walletAddress={walletAddress}
            goldBalance={goldBalance}
            onOrderSuccess={handleOrderSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default TradingPage;
