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
  const isInitialDataLoadRef = useRef(true); // 초기 데이터 로드 여부
  const lastCandleTimeRef = useRef<number | null>(null); // 마지막 캔들 시간 추적

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

    // 캔들 업데이트 수신 (실시간)
    socket.on('candle:update', (candleData: any) => {
      if (candleData.coin_id === selectedCoin.id && candleData.interval === chartInterval) {
        const candleTime = new Date(candleData.open_time).getTime() / 1000;
        
        setCandles((prevCandles) => {
          const newCandles = [...prevCandles];
          const lastCandle = newCandles.length > 0 ? newCandles[newCandles.length - 1] : null;
          const lastCandleTime = lastCandle ? Math.floor(new Date(lastCandle.open_time).getTime() / 1000) : null;
          const currentCandleTime = Math.floor(candleTime);
          
          if (lastCandleTime === currentCandleTime && lastCandle) {
            // 같은 시간대 캔들 업데이트 (실시간)
            newCandles[newCandles.length - 1] = {
              ...lastCandle,
              open_price: candleData.open_price ?? lastCandle.open_price,
              high_price: candleData.high_price ?? lastCandle.high_price,
              low_price: candleData.low_price ?? lastCandle.low_price,
              close_price: candleData.close_price ?? lastCandle.close_price,
              volume: candleData.volume ?? lastCandle.volume,
            };
          } else {
            // 새 캔들 추가
            newCandles.push({
              id: candleData.id || `candle-${Date.now()}-${Math.random()}`,
              coin_id: candleData.coin_id || selectedCoin.id,
              open_time: candleData.open_time || new Date().toISOString(),
              close_time: candleData.close_time || candleData.open_time || new Date().toISOString(),
              open_price: candleData.open_price || 0,
              high_price: candleData.high_price || 0,
              low_price: candleData.low_price || 0,
              close_price: candleData.close_price || 0,
              volume: candleData.volume || 0,
              trade_count: candleData.trade_count || 0,
            });
            
            // 최대 100개만 유지
            if (newCandles.length > 100) {
              newCandles.shift();
            }
          }
          
          // 마지막 캔들 시간 업데이트
          lastCandleTimeRef.current = currentCandleTime;
          
          return newCandles;
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
  }, [selectedCoin?.id, chartInterval]);

  // 캔들 데이터 가져오기 (초기 로드 및 간격 변경 시)
  useEffect(() => {
    const fetchCandles = async () => {
      if (!selectedCoin) return;
      setChartLoading(true);
      isInitialDataLoadRef.current = true; // 초기 로드 플래그 설정
      lastCandleTimeRef.current = null; // 마지막 캔들 시간 리셋
      try {
        const response = await api.get(`/coins/${selectedCoin.id}/candles/${chartInterval}`, {
          params: { limit: 100 }
        });
        const newCandles = response.data.candles || [];
        console.log('Fetched candles:', newCandles.length);
        if (newCandles.length > 0) {
          console.log('First candle from API:', newCandles[0]);
          console.log('Last candle from API:', newCandles[newCandles.length - 1]);
        }
        setCandles(newCandles);
        
        // 마지막 캔들 시간 저장
        if (newCandles.length > 0) {
          const lastCandle = newCandles[newCandles.length - 1];
          lastCandleTimeRef.current = new Date(lastCandle.open_time).getTime() / 1000;
        }
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      } finally {
        setChartLoading(false);
      }
    };

    if (selectedCoin) {
      fetchCandles();
    }
  }, [selectedCoin?.id, chartInterval]); // 코인 또는 간격 변경 시에만 초기 로드

  // 차트 초기화 (selectedCoin이 있을 때만, 한 번만)
  useEffect(() => {
    if (!selectedCoin || chartInitializedRef.current) return;

    const initializeChart = () => {
      if (!chartContainerRef.current || !selectedCoin) {
        return false;
      }

      const container = chartContainerRef.current;
      // 컨테이너 크기 확인
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 800;
      const height = rect.height || container.clientHeight || 350;

      // 최소 크기 보장
      if (width < 100 || height < 100) {
        return false;
      }

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
          priceFormat: {
            type: 'price',
            precision: 8,
            minMove: 0.00000001,
          },
        }) as ISeriesApi<'Candlestick'>;

        // 가격 스케일 자동 조정 활성화
        candlestickSeries.priceScale().applyOptions({
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });

        candlestickSeriesRef.current = candlestickSeries;
        chartInitializedRef.current = true;
        console.log('Chart initialized successfully');
        return true;
      } catch (error) {
        console.error('Failed to initialize chart:', error);
        return false;
      }
    };

    // 즉시 초기화 시도
    let initialized = initializeChart();
    
    // 실패하면 재시도 (최대 10번)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    if (!initialized) {
      const tryInit = () => {
        attempts++;
        if (attempts > maxAttempts) {
          console.error('Failed to initialize chart after multiple attempts');
          return;
        }
        
        if (chartContainerRef.current && !chartRef.current && selectedCoin) {
          if (initializeChart()) {
            return; // 성공
          }
        }
        
        // 재시도
        timeoutId = setTimeout(tryInit, 200);
      };
      
      timeoutId = setTimeout(tryInit, 200);
    }

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
      // 차트는 한 번만 초기화하므로 cleanup에서 제거하지 않음
    };
  }, [selectedCoin?.id]); // selectedCoin이 변경될 때만 확인 (이미 초기화되었으면 실행 안 함)

  // 차트 데이터 업데이트 (실시간)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) {
      return;
    }

    if (candles.length === 0) {
      return;
    }

    try {
      // 초기 데이터 로드 시에만 전체 데이터 설정 및 fitContent
      if (isInitialDataLoadRef.current) {
        // 전체 데이터 포맷팅
        const formattedData: CandlestickData<UTCTimestamp>[] = [];
        for (const candle of candles) {
          // 데이터 타입 확인 및 변환
          let o: number;
          let h: number;
          let l: number;
          let c: number;

          if (typeof candle.open_price === 'string') {
            o = parseFloat(candle.open_price);
          } else if (typeof candle.open_price === 'number') {
            o = candle.open_price;
          } else {
            o = 0;
          }

          if (typeof candle.high_price === 'string') {
            h = parseFloat(candle.high_price);
          } else if (typeof candle.high_price === 'number') {
            h = candle.high_price;
          } else {
            h = 0;
          }

          if (typeof candle.low_price === 'string') {
            l = parseFloat(candle.low_price);
          } else if (typeof candle.low_price === 'number') {
            l = candle.low_price;
          } else {
            l = 0;
          }

          if (typeof candle.close_price === 'string') {
            c = parseFloat(candle.close_price);
          } else if (typeof candle.close_price === 'number') {
            c = candle.close_price;
          } else {
            c = 0;
          }
          
          // 유효성 검사
          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || 
              o <= 0 || h <= 0 || l <= 0 || c <= 0) {
            console.warn('Invalid candle data:', candle);
            continue;
          }

          // high >= low 검증
          if (h < l) {
            console.warn('High < Low, swapping:', { h, l });
            [h, l] = [l, h];
          }

          const t = new Date(candle.open_time).getTime() / 1000;
          if (isNaN(t) || t <= 0) {
            console.warn('Invalid timestamp:', candle.open_time);
            continue;
          }

          formattedData.push({
            time: t as UTCTimestamp,
            open: o,
            high: h,
            low: l,
            close: c,
          });
        }

        if (formattedData.length > 0) {
          // 데이터 검증 및 로그
          const priceMin = Math.min(...formattedData.map(d => d.low));
          const priceMax = Math.max(...formattedData.map(d => d.high));
          
          console.log('Chart data loaded:', formattedData.length, 'candles');
          console.log('First candle:', formattedData[0]);
          console.log('Last candle:', formattedData[formattedData.length - 1]);
          console.log('Price range:', { min: priceMin, max: priceMax });
          console.log('Current coin price:', selectedCoin?.current_price);
          
          // 차트에 데이터 설정
          candlestickSeriesRef.current.setData(formattedData);
          
          // 가격 스케일 강제 업데이트
          setTimeout(() => {
            if (chartRef.current && candlestickSeriesRef.current) {
              chartRef.current.timeScale().fitContent();
              // priceScale 강제 업데이트
              candlestickSeriesRef.current.priceScale().applyOptions({
                autoScale: true,
              });
            }
          }, 100);
          
          isInitialDataLoadRef.current = false; // 초기 로드 완료
        }
      } else {
        // 실시간 업데이트: 마지막 캔들만 업데이트 (줌 상태 유지)
        const lastCandle = candles[candles.length - 1];
        const open = typeof lastCandle.open_price === 'string' ? parseFloat(lastCandle.open_price) : (lastCandle.open_price || 0);
        const high = typeof lastCandle.high_price === 'string' ? parseFloat(lastCandle.high_price) : (lastCandle.high_price || 0);
        const low = typeof lastCandle.low_price === 'string' ? parseFloat(lastCandle.low_price) : (lastCandle.low_price || 0);
        const close = typeof lastCandle.close_price === 'string' ? parseFloat(lastCandle.close_price) : (lastCandle.close_price || 0);
        
        if (!isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close) && 
            open > 0 && high > 0 && low > 0 && close > 0) {
          const timestamp = new Date(lastCandle.open_time).getTime() / 1000;
          if (!isNaN(timestamp) && timestamp > 0) {
            const lastFormattedCandle: CandlestickData<UTCTimestamp> = {
              time: timestamp as UTCTimestamp,
              open,
              high,
              low,
              close,
            };

            const existingData = candlestickSeriesRef.current.data();
            const lastExistingTime = existingData && existingData.length > 0 
              ? existingData[existingData.length - 1].time 
              : null;
            
            if (lastExistingTime === lastFormattedCandle.time) {
              // 같은 시간대면 업데이트
              candlestickSeriesRef.current.update(lastFormattedCandle);
            } else {
              // 새 캔들 추가
              candlestickSeriesRef.current.update(lastFormattedCandle);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update chart data:', error);
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
