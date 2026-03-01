import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';
import { stockService } from '../services/stockService';
import api from '../services/api';
import type { Stock, Candle } from '../types';
import Orderbook from '../components/Orderbook';
import OrderForm from '../components/OrderForm';
import StockSidebar from '../components/StockSidebar';
import TopRankingsTicker from '../components/TopRankingsTicker';
import Toast from '../components/Toast';
import soundPlayer from '../utils/soundPlayer';
import './TradingPage.css';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const TradingPage = () => {
  const { stockSymbol } = useParams<{ stockSymbol?: string }>();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
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
  const [toasts, setToasts] = useState<ToastNotification[]>([]); // Toast 알림 목록

  // Toast 알림 추가 함수
  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  // Toast 알림 제거 함수
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

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
    const fetchStock = async () => {
      try {
        if (stockSymbol) {
          const stock = await stockService.getStockBySymbol(stockSymbol);
          setSelectedStock(stock);
        } else {
          const stocks = await stockService.getStocks('ACTIVE');
          if (stocks.length > 0) {
            const defaultStock = stocks[0];
            setSelectedStock(defaultStock);
          }
        }
      } catch (error) {
        console.error('Failed to fetch stock:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [stockSymbol]);

  // WebSocket 연결 및 실시간 가격 업데이트
  useEffect(() => {
    if (!selectedStock) return;

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    // 종목 구독
    socket.emit('subscribe:stock', selectedStock.id);

    // 가격 업데이트 수신
    socket.on('price:update', (priceData: any) => {
      if (priceData.stock_id === selectedStock.id) {
        const newPrice = priceData.current_price || selectedStock.current_price;
        const priceNum = typeof newPrice === 'string' ? parseFloat(newPrice) : (newPrice || 0);

        setSelectedStock((prevStock) => {
          if (!prevStock) return prevStock;
          return {
            ...prevStock,
            current_price: priceNum,
            price_change_24h: priceData.price_change_24h !== undefined
              ? priceData.price_change_24h
              : prevStock.price_change_24h,
            volume_24h: priceData.volume_24h !== undefined
              ? priceData.volume_24h
              : prevStock.volume_24h,
            market_cap: priceData.market_cap !== undefined
              ? priceData.market_cap
              : prevStock.market_cap,
          };
        });

        // 현재 가격을 실시간으로 캔들에 반영 (1분봉은 실시간 계산)
        if (priceNum > 0 && isFinite(priceNum) && !isNaN(priceNum)) {
          setCandles((prevCandles) => {
            const now = new Date();

            // 현재 캔들 시간 계산 (간격별)
            let currentCandleTime: number;
            if (chartInterval === '1m') {
              currentCandleTime = Math.floor(now.getTime() / 1000 / 60) * 60;
            } else if (chartInterval === '1h') {
              currentCandleTime = Math.floor(now.getTime() / 1000 / 3600) * 3600;
            } else {
              currentCandleTime = Math.floor(now.getTime() / 1000 / 86400) * 86400;
            }

            if (prevCandles.length === 0) {
              return [{
                id: `realtime-${Date.now()}`,
                stock_id: selectedStock.id,
                open_time: new Date(currentCandleTime * 1000).toISOString(),
                close_time: now.toISOString(),
                open_price: priceNum,
                high_price: priceNum,
                low_price: priceNum,
                close_price: priceNum,
                volume: 0,
                trade_count: 0,
              } as Candle];
            }

            const lastCandle = prevCandles[prevCandles.length - 1];
            if (!lastCandle || !lastCandle.open_time) {
              return prevCandles;
            }

            const lastCandleTime = Math.floor(new Date(lastCandle.open_time).getTime() / 1000);
            if (isNaN(lastCandleTime) || !isFinite(lastCandleTime) || lastCandleTime <= 0) {
              return prevCandles;
            }

            // 마지막 캔들의 시간대 계산
            let lastCandleTimeFloor: number;
            if (chartInterval === '1m') {
              lastCandleTimeFloor = Math.floor(lastCandleTime / 60) * 60;
            } else if (chartInterval === '1h') {
              lastCandleTimeFloor = Math.floor(lastCandleTime / 3600) * 3600;
            } else {
              lastCandleTimeFloor = Math.floor(lastCandleTime / 86400) * 86400;
            }

            const newCandles = [...prevCandles];

            if (lastCandleTimeFloor === currentCandleTime) {
              const lastHigh = typeof lastCandle.high_price === 'string' ? parseFloat(lastCandle.high_price) : (lastCandle.high_price || 0);
              const lastLow = typeof lastCandle.low_price === 'string' ? parseFloat(lastCandle.low_price) : (lastCandle.low_price || 0);

              if (isNaN(lastHigh) || isNaN(lastLow) || !isFinite(lastHigh) || !isFinite(lastLow) || lastHigh <= 0 || lastLow <= 0) {
                console.warn('Invalid last candle prices:', { lastHigh, lastLow, lastCandle });
                return prevCandles;
              }

              const finalHigh = Math.max(lastHigh, priceNum);
              const finalLow = Math.min(lastLow, priceNum);
              const finalClose = priceNum;

              if (isNaN(finalHigh) || isNaN(finalLow) || isNaN(finalClose) ||
                  !isFinite(finalHigh) || !isFinite(finalLow) || !isFinite(finalClose) ||
                  finalHigh <= 0 || finalLow <= 0 || finalClose <= 0 || finalHigh < finalLow) {
                console.warn('Invalid updated candle prices:', { finalHigh, finalLow, finalClose });
                return prevCandles;
              }

              newCandles[newCandles.length - 1] = {
                ...lastCandle,
                close_price: finalClose,
                high_price: finalHigh,
                low_price: finalLow,
                close_time: now.toISOString(),
              };
            } else {
              const lastClose = typeof lastCandle.close_price === 'string' ? parseFloat(lastCandle.close_price) : (lastCandle.close_price || 0);

              if (isNaN(lastClose) || !isFinite(lastClose) || lastClose <= 0) {
                console.warn('Invalid last close price:', lastClose);
                return prevCandles;
              }

              const openPrice = lastClose > 0 ? lastClose : priceNum;
              const highPrice = Math.max(lastClose, priceNum);
              const lowPrice = Math.min(lastClose, priceNum);

              if (isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) ||
                  !isFinite(openPrice) || !isFinite(highPrice) || !isFinite(lowPrice) ||
                  openPrice <= 0 || highPrice <= 0 || lowPrice <= 0 || highPrice < lowPrice) {
                console.warn('Invalid new candle prices:', { openPrice, highPrice, lowPrice, priceNum });
                return prevCandles;
              }

              newCandles.push({
                id: `realtime-${Date.now()}`,
                stock_id: selectedStock.id,
                open_time: new Date(currentCandleTime * 1000).toISOString(),
                close_time: now.toISOString(),
                open_price: openPrice,
                high_price: highPrice,
                low_price: lowPrice,
                close_price: priceNum,
                volume: 0,
                trade_count: 0,
              } as Candle);

              if (newCandles.length > 100) {
                newCandles.shift();
              }
            }

            return newCandles;
          });
        }
      }
    });

    // 캔들 업데이트 수신 (실시간)
    socket.on('candle:update', (candleData: any) => {
      if (!candleData || !candleData.stock_id || !candleData.open_time) {
        console.warn('Invalid candle update data:', candleData);
        return;
      }

      if (candleData.stock_id === selectedStock.id && candleData.interval === chartInterval) {
        const openPrice = candleData.open_price != null ? (typeof candleData.open_price === 'string' ? parseFloat(candleData.open_price) : candleData.open_price) : null;
        const highPrice = candleData.high_price != null ? (typeof candleData.high_price === 'string' ? parseFloat(candleData.high_price) : candleData.high_price) : null;
        const lowPrice = candleData.low_price != null ? (typeof candleData.low_price === 'string' ? parseFloat(candleData.low_price) : candleData.low_price) : null;
        const closePrice = candleData.close_price != null ? (typeof candleData.close_price === 'string' ? parseFloat(candleData.close_price) : candleData.close_price) : null;

        if (openPrice == null || highPrice == null || lowPrice == null || closePrice == null ||
            isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(closePrice) ||
            !isFinite(openPrice) || !isFinite(highPrice) || !isFinite(lowPrice) || !isFinite(closePrice) ||
            openPrice <= 0 || highPrice <= 0 || lowPrice <= 0 || closePrice <= 0) {
          console.warn('Invalid candle update prices:', { openPrice, highPrice, lowPrice, closePrice, candleData });
          return;
        }

        const candleTime = new Date(candleData.open_time).getTime() / 1000;
        if (isNaN(candleTime) || !isFinite(candleTime) || candleTime <= 0) {
          console.warn('Invalid candle timestamp:', candleData.open_time);
          return;
        }

        setCandles((prevCandles) => {
          const newCandles = [...prevCandles];
          const lastCandle = newCandles.length > 0 ? newCandles[newCandles.length - 1] : null;
          const lastCandleTime = lastCandle ? Math.floor(new Date(lastCandle.open_time).getTime() / 1000) : null;
          const currentCandleTime = Math.floor(candleTime);

          if (lastCandleTime === currentCandleTime && lastCandle) {
            const finalOpen = openPrice;
            const finalHigh = Math.max(highPrice, typeof lastCandle.high_price === 'string' ? parseFloat(lastCandle.high_price) : (lastCandle.high_price || 0));
            const finalLow = Math.min(lowPrice, typeof lastCandle.low_price === 'string' ? parseFloat(lastCandle.low_price) : (lastCandle.low_price || Infinity));
            const finalClose = closePrice;

            if (isNaN(finalOpen) || isNaN(finalHigh) || isNaN(finalLow) || isNaN(finalClose) ||
                !isFinite(finalOpen) || !isFinite(finalHigh) || !isFinite(finalLow) || !isFinite(finalClose) ||
                finalOpen <= 0 || finalHigh <= 0 || finalLow <= 0 || finalClose <= 0) {
              console.warn('Invalid merged candle data:', { finalOpen, finalHigh, finalLow, finalClose });
              return prevCandles;
            }

            newCandles[newCandles.length - 1] = {
              ...lastCandle,
              open_price: finalOpen,
              high_price: finalHigh,
              low_price: finalLow,
              close_price: finalClose,
              volume: candleData.volume != null ? candleData.volume : lastCandle.volume,
            };
          } else {
            const newCandle = {
              id: candleData.id || `candle-${Date.now()}-${Math.random()}`,
              stock_id: candleData.stock_id || selectedStock.id,
              open_time: candleData.open_time || new Date().toISOString(),
              close_time: candleData.close_time || candleData.open_time || new Date().toISOString(),
              open_price: openPrice,
              high_price: highPrice,
              low_price: lowPrice,
              close_price: closePrice,
              volume: candleData.volume != null ? candleData.volume : 0,
              trade_count: candleData.trade_count != null ? candleData.trade_count : 0,
            };

            newCandles.push(newCandle);

            if (newCandles.length > 100) {
              newCandles.shift();
            }
          }

          lastCandleTimeRef.current = currentCandleTime;

          return newCandles;
        });
      }
    });

    // 주문 체결 이벤트 수신 (내 주문만)
    socket.on('order:filled', (orderData: any) => {
      if (orderData.wallet_address === walletAddress) {
        const orderType = orderData.order_type === 'BUY' ? '매수' : '매도';
        const message = `${orderType} 주문이 체결되었습니다! 가격: ${Number(orderData.price).toLocaleString()} G, 수량: ${orderData.quantity}`;

        addToast(message, 'success');
        soundPlayer.play('order-filled', 0.6);
        console.log('Order filled:', orderData);
      }
    });

    // 주문 취소 이벤트 수신 (내 주문만)
    socket.on('order:cancelled', (orderData: any) => {
      if (orderData.wallet_address === walletAddress) {
        const orderType = orderData.order_type === 'BUY' ? '매수' : '매도';
        const message = `${orderType} 주문이 취소되었습니다. 가격: ${Number(orderData.price).toLocaleString()} G`;

        addToast(message, 'info');
        soundPlayer.play('order-cancelled', 0.5);
        console.log('Order cancelled:', orderData);
      }
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error (will retry):', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:stock', selectedStock.id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedStock?.id, chartInterval]);

  // 캔들 데이터 가져오기 (초기 로드 및 간격 변경 시)
  useEffect(() => {
    const fetchCandles = async () => {
      if (!selectedStock) return;
      setChartLoading(true);
      isInitialDataLoadRef.current = true;
      lastCandleTimeRef.current = null;
      try {
        const response = await api.get(`/stocks/${selectedStock.id}/candles/${chartInterval}`, {
          params: { limit: 500 }
        });
        let newCandles = response.data.candles || [];
        console.log('Fetched candles:', newCandles.length);

        const currentPrice = typeof selectedStock.current_price === 'string'
          ? parseFloat(selectedStock.current_price)
          : (selectedStock.current_price || 0);

        if (newCandles.length === 0 || currentPrice > 0) {
          const now = new Date();

          let lastCandleTime = null;
          if (newCandles.length > 0) {
            const lastCandle = newCandles[newCandles.length - 1];
            lastCandleTime = new Date(lastCandle.open_time).getTime() / 1000;
            const lastCandleClose = typeof lastCandle.close_price === 'string'
              ? parseFloat(lastCandle.close_price)
              : (lastCandle.close_price || 0);

            if (lastCandleClose > 0 && Math.abs((currentPrice - lastCandleClose) / lastCandleClose) > 0.2) {
              console.warn('Candle price mismatch detected. Last candle:', lastCandleClose, 'Current price:', currentPrice);

              const currentCandleTime = Math.floor(now.getTime() / 1000 / (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400)) * (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400);

              if (lastCandleTime && Math.floor(lastCandleTime) === currentCandleTime) {
                newCandles[newCandles.length - 1] = {
                  ...lastCandle,
                  close_price: currentPrice,
                  high_price: Math.max(lastCandleClose, currentPrice),
                  low_price: Math.min(lastCandleClose, currentPrice),
                };
              } else {
                newCandles.push({
                  id: `current-${Date.now()}`,
                  stock_id: selectedStock.id,
                  open_time: new Date(currentCandleTime * 1000).toISOString(),
                  close_time: now.toISOString(),
                  open_price: lastCandleClose > 0 ? lastCandleClose : currentPrice,
                  high_price: Math.max(lastCandleClose, currentPrice),
                  low_price: Math.min(lastCandleClose, currentPrice),
                  close_price: currentPrice,
                  volume: 0,
                  trade_count: 0,
                } as Candle);
              }
            }
          } else {
            const currentCandleTime = Math.floor(now.getTime() / 1000 / (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400)) * (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400);
            newCandles = [{
              id: `current-${Date.now()}`,
              stock_id: selectedStock.id,
              open_time: new Date(currentCandleTime * 1000).toISOString(),
              close_time: now.toISOString(),
              open_price: currentPrice,
              high_price: currentPrice,
              low_price: currentPrice,
              close_price: currentPrice,
              volume: 0,
              trade_count: 0,
            } as Candle];
          }
        }

        if (newCandles.length > 0) {
          console.log('First candle from API:', newCandles[0]);
          console.log('Last candle from API:', newCandles[newCandles.length - 1]);
        }
        setCandles(newCandles);

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

    if (selectedStock) {
      fetchCandles();
    }
  }, [selectedStock?.id, chartInterval]);

  // 차트 초기화 (selectedStock이 있을 때만, 한 번만)
  useEffect(() => {
    if (!selectedStock || chartInitializedRef.current) return;

    const initializeChart = () => {
      if (!chartContainerRef.current || !selectedStock) {
        return false;
      }

      const container = chartContainerRef.current;
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 800;
      const height = rect.height || container.clientHeight || 350;

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
          localization: {
            timeFormatter: (time: number) => {
              const date = new Date(time * 1000);
              return date.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });
            },
          },
          timeScale: {
            timeVisible: true,
            secondsVisible: false,
            tickMarkFormatter: (time: number) => {
              const date = new Date(time * 1000);
              const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
              const month = String(kstDate.getMonth() + 1).padStart(2, '0');
              const day = String(kstDate.getDate()).padStart(2, '0');
              const hours = String(kstDate.getHours()).padStart(2, '0');
              const minutes = String(kstDate.getMinutes()).padStart(2, '0');

              return `${month}-${day} ${hours}:${minutes}`;
            },
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

    let initialized = initializeChart();

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

        if (chartContainerRef.current && !chartRef.current && selectedStock) {
          if (initializeChart()) {
            return;
          }
        }

        timeoutId = setTimeout(tryInit, 200);
      };

      timeoutId = setTimeout(tryInit, 200);
    }

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
    };
  }, [selectedStock?.id]);

  // 차트 데이터 업데이트 (실시간)
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) {
      return;
    }

    if (candles.length === 0) {
      return;
    }

    try {
      if (isInitialDataLoadRef.current) {
        const formattedData: CandlestickData<UTCTimestamp>[] = [];
        for (const candle of candles) {
          if (!candle || !candle.open_time) {
            console.warn('Invalid candle: missing data', candle);
            continue;
          }

          let o: number;
          let h: number;
          let l: number;
          let c: number;

          if (candle.open_price == null) { console.warn('Invalid candle: open_price is null', candle); continue; }
          if (typeof candle.open_price === 'string') { o = parseFloat(candle.open_price); } else if (typeof candle.open_price === 'number') { o = candle.open_price; } else { continue; }

          if (candle.high_price == null) { console.warn('Invalid candle: high_price is null', candle); continue; }
          if (typeof candle.high_price === 'string') { h = parseFloat(candle.high_price); } else if (typeof candle.high_price === 'number') { h = candle.high_price; } else { continue; }

          if (candle.low_price == null) { console.warn('Invalid candle: low_price is null', candle); continue; }
          if (typeof candle.low_price === 'string') { l = parseFloat(candle.low_price); } else if (typeof candle.low_price === 'number') { l = candle.low_price; } else { continue; }

          if (candle.close_price == null) { console.warn('Invalid candle: close_price is null', candle); continue; }
          if (typeof candle.close_price === 'string') { c = parseFloat(candle.close_price); } else if (typeof candle.close_price === 'number') { c = candle.close_price; } else { continue; }

          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) ||
              o <= 0 || h <= 0 || l <= 0 || c <= 0 ||
              !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) {
            console.warn('Invalid candle data (NaN or <= 0):', { o, h, l, c, candle });
            continue;
          }

          const high = Math.max(h, l);
          const low = Math.min(h, l);

          let t: number;

          if (!candle.open_time || typeof candle.open_time !== 'string') {
            console.warn('Invalid open_time type:', candle.open_time);
            continue;
          }

          try {
            const timeValue = new Date(candle.open_time).getTime();

            if (isNaN(timeValue) || !isFinite(timeValue)) {
              console.warn('Invalid timestamp value:', { open_time: candle.open_time, parsed: timeValue });
              continue;
            }

            t = Math.floor(timeValue / 1000);

            const minTimestamp = new Date('2020-01-01').getTime() / 1000;
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000;

            if (isNaN(t) || !isFinite(t) || t < minTimestamp || t > maxTimestamp) {
              console.warn('Invalid or out-of-range timestamp:', { open_time: candle.open_time, timestamp: t });
              continue;
            }
          } catch (error) {
            console.warn('Error parsing timestamp:', candle.open_time, error);
            continue;
          }

          if (o != null && h != null && l != null && c != null &&
              isFinite(o) && isFinite(h) && isFinite(l) && isFinite(c) &&
              o > 0 && h > 0 && l > 0 && c > 0 && isFinite(t) && t > 0 &&
              typeof o === 'number' && typeof h === 'number' &&
              typeof l === 'number' && typeof c === 'number' && typeof t === 'number') {

            const candleData = {
              time: t as UTCTimestamp,
              open: o,
              high: high,
              low: low,
              close: c,
            };

            if (candleData.time && candleData.open && candleData.high &&
                candleData.low && candleData.close) {
              formattedData.push(candleData);
            } else {
              console.warn('Candle data object has null properties:', candleData);
            }
          } else {
            console.warn('Skipping invalid candle after final validation:', { o, h, l, c, t, candle });
          }
        }

        if (formattedData.length > 0) {
          const validData = formattedData.filter(d => {
            if (d == null) return false;
            if (d.time == null || d.open == null || d.high == null || d.low == null || d.close == null) return false;

            const time = d.time as number;
            const open = d.open;
            const high = d.high;
            const low = d.low;
            const close = d.close;

            if (typeof time !== 'number' || typeof open !== 'number' ||
                typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number') return false;
            if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return false;
            if (!isFinite(time) || !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) return false;
            if (time <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0) return false;
            if (high < low) return false;

            const minTimestamp = new Date('2020-01-01').getTime() / 1000;
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000;
            if (time < minTimestamp || time > maxTimestamp) {
              console.warn('Timestamp out of range:', { time, date: new Date(time * 1000).toISOString() });
              return false;
            }
            return true;
          });

          if (validData.length === 0) {
            console.error('No valid candle data after filtering');
            return;
          }

          const priceMin = Math.min(...validData.map(d => d.low));
          const priceMax = Math.max(...validData.map(d => d.high));

          console.log('Chart data loaded:', validData.length, 'candles (filtered from', formattedData.length, ')');
          console.log('First candle:', validData[0]);
          console.log('Last candle:', validData[validData.length - 1]);
          console.log('Price range:', { min: priceMin, max: priceMax });
          console.log('Current stock price:', selectedStock?.current_price);

          try {
            const safeData = validData.filter(d =>
              d && d.time && d.open && d.high && d.low && d.close &&
              typeof d.time === 'number' && typeof d.open === 'number' &&
              typeof d.high === 'number' && typeof d.low === 'number' &&
              typeof d.close === 'number'
            );

            if (safeData.length > 0) {
              candlestickSeriesRef.current.setData(safeData);
            } else {
              console.error('All data filtered out before setData call');
            }
          } catch (error) {
            console.error('Error setting chart data:', error, 'Data:', validData);
          }

          setTimeout(() => {
            if (chartRef.current && candlestickSeriesRef.current) {
              chartRef.current.timeScale().fitContent();
              candlestickSeriesRef.current.priceScale().applyOptions({
                autoScale: true,
              });
            }
          }, 100);

          isInitialDataLoadRef.current = false;
        }
      } else {
        const formattedData: CandlestickData<UTCTimestamp>[] = [];
        for (const candle of candles) {
          if (!candle || !candle.open_time) continue;

          let o: number;
          let h: number;
          let l: number;
          let c: number;

          if (candle.open_price == null) continue;
          if (typeof candle.open_price === 'string') { o = parseFloat(candle.open_price); } else if (typeof candle.open_price === 'number') { o = candle.open_price; } else { continue; }

          if (candle.high_price == null) continue;
          if (typeof candle.high_price === 'string') { h = parseFloat(candle.high_price); } else if (typeof candle.high_price === 'number') { h = candle.high_price; } else { continue; }

          if (candle.low_price == null) continue;
          if (typeof candle.low_price === 'string') { l = parseFloat(candle.low_price); } else if (typeof candle.low_price === 'number') { l = candle.low_price; } else { continue; }

          if (candle.close_price == null) continue;
          if (typeof candle.close_price === 'string') { c = parseFloat(candle.close_price); } else if (typeof candle.close_price === 'number') { c = candle.close_price; } else { continue; }

          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) ||
              o <= 0 || h <= 0 || l <= 0 || c <= 0 ||
              !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) {
            continue;
          }

          const high = Math.max(h, l);
          const low = Math.min(h, l);

          let t: number;

          if (!candle.open_time || typeof candle.open_time !== 'string') continue;

          try {
            const timeValue = new Date(candle.open_time).getTime();
            if (isNaN(timeValue) || !isFinite(timeValue)) continue;
            t = Math.floor(timeValue / 1000);

            const minTimestamp = new Date('2020-01-01').getTime() / 1000;
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000;
            if (isNaN(t) || !isFinite(t) || t < minTimestamp || t > maxTimestamp) continue;
          } catch (error) {
            continue;
          }

          if (o != null && h != null && l != null && c != null &&
              isFinite(o) && isFinite(h) && isFinite(l) && isFinite(c) &&
              o > 0 && h > 0 && l > 0 && c > 0 && isFinite(t) && t > 0 &&
              typeof o === 'number' && typeof h === 'number' &&
              typeof l === 'number' && typeof c === 'number' && typeof t === 'number') {

            const candleData = {
              time: t as UTCTimestamp,
              open: o,
              high: high,
              low: low,
              close: c,
            };

            if (candleData.time && candleData.open && candleData.high &&
                candleData.low && candleData.close) {
              formattedData.push(candleData);
            }
          }
        }

        if (formattedData.length > 0) {
          const validData = formattedData.filter(d => {
            if (d == null) return false;
            if (d.time == null || d.open == null || d.high == null || d.low == null || d.close == null) return false;

            const time = d.time as number;
            const open = d.open;
            const high = d.high;
            const low = d.low;
            const close = d.close;

            if (typeof time !== 'number' || typeof open !== 'number' ||
                typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number') return false;
            if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) return false;
            if (!isFinite(time) || !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) return false;
            if (time <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0) return false;
            if (high < low) return false;

            const minTimestamp = new Date('2020-01-01').getTime() / 1000;
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000;
            if (time < minTimestamp || time > maxTimestamp) {
              console.warn('Timestamp out of range:', { time, date: new Date(time * 1000).toISOString() });
              return false;
            }
            return true;
          });

          if (validData.length === 0) {
            console.error('No valid candle data after filtering (realtime update)');
            return;
          }

          try {
            const safeData = validData.filter(d =>
              d && d.time && d.open && d.high && d.low && d.close &&
              typeof d.time === 'number' && typeof d.open === 'number' &&
              typeof d.high === 'number' && typeof d.low === 'number' &&
              typeof d.close === 'number'
            );

            if (safeData.length > 0) {
              candlestickSeriesRef.current.setData(safeData);
            } else {
              console.warn('All realtime data filtered out before setData call');
            }
          } catch (error) {
            console.error('Error updating chart data:', error, 'Data:', validData);
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

  if (!selectedStock) {
    return (
      <div className="trading-page">
        <div className="empty-state">종목을 찾을 수 없습니다</div>
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

  const currentPrice = typeof selectedStock.current_price === 'string'
    ? parseFloat(selectedStock.current_price)
    : (selectedStock.current_price || 0);

  return (
    <div className="trading-page">
      <TopRankingsTicker />
      <div className="trading-container">
        <div className="main-content">
          <div className="coin-header">
            <div className="coin-header-left">
              {selectedStock.logo_url && (
                <img src={selectedStock.logo_url} alt={selectedStock.symbol} className="coin-header-logo" />
              )}
              <div className="coin-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h1>{selectedStock.name}</h1>
                </div>
                <div className="coin-header-symbols">
                  <span className="coin-symbol">{selectedStock.symbol}</span>
                  <span className="coin-divider">/</span>
                  <span className="coin-quote">GOLD</span>
                </div>
              </div>
            </div>
            <div className="coin-header-right">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="coin-price-large">{formatPrice(selectedStock.current_price)} G</div>
              </div>
              <div className={'coin-change-large ' + (selectedStock.price_change_24h >= 0 ? 'positive' : 'negative')}>
                {formatChange(selectedStock.price_change_24h)}
              </div>
            </div>
          </div>

          <div className="coin-stats">
            <div className="stat-item">
              <span className="stat-label">최고(24H)</span>
              <span className="stat-value">{formatPrice(selectedStock.current_price * 1.1)} G</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최저(24H)</span>
              <span className="stat-value">{formatPrice(selectedStock.current_price * 0.9)} G</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">거래량(24H)</span>
              <span className="stat-value">{formatPrice(selectedStock.volume_24h || 0)} G</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시가총액</span>
              <span className="stat-value">
                {formatPrice(selectedStock.market_cap)} G
              </span>
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
              <Orderbook coinId={selectedStock.id} />
            </div>
            <div className="coin-sidebar-section">
              <StockSidebar selectedStockId={selectedStock.id} />
            </div>
          </div>
        </div>

        <div className="sidebar-content">
          <OrderForm
            coin={selectedStock}
            walletAddress={walletAddress}
            goldBalance={goldBalance}
            onOrderSuccess={handleOrderSuccess}
          />
        </div>
      </div>

      {/* Toast 알림 */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default TradingPage;
