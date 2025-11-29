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
import Toast from '../components/Toast';
import StopOrderPanel from '../components/StopOrderPanel';
import TechnicalIndicators from '../components/TechnicalIndicators';
import soundPlayer from '../utils/soundPlayer';
import { classifyCoin } from '../utils/coinClassification';
import './TradingPage.css';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const TradingPage = () => {
  const { coinSymbol } = useParams<{ coinSymbol?: string }>();
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [baseCurrency, setBaseCurrency] = useState<Coin | null>(null); // MEME 코인의 기준 화폐
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
    const fetchCoin = async () => {
      try {
        if (coinSymbol) {
          const coin = await coinService.getCoinBySymbol(coinSymbol);
          setSelectedCoin(coin);

          // base_currency가 있는 경우 정보 가져오기
          if (coin.base_currency_id) {
            try {
              const response = await api.get(`/coins/${coin.base_currency_id}`);
              setBaseCurrency(response.data.coin);
            } catch (error) {
              console.error('Failed to fetch base currency:', error);
            }
          } else {
            setBaseCurrency(null);
          }
        } else {
          const coins = await coinService.getCoins('ACTIVE');
          if (coins.length > 0) {
            // CYC 코인을 기본으로 선택 (없으면 첫 번째 코인)
            const defaultCoin = coins.find(c => c.symbol === 'CYC') || coins[0];
            setSelectedCoin(defaultCoin);

            // base_currency가 있는 경우 정보 가져오기
            if (defaultCoin.base_currency_id) {
              try {
                const response = await api.get(`/coins/${defaultCoin.base_currency_id}`);
                setBaseCurrency(response.data.coin);
              } catch (error) {
                console.error('Failed to fetch base currency:', error);
              }
            } else {
              setBaseCurrency(null);
            }
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
        const newPrice = priceData.current_price || selectedCoin.current_price;
        const priceNum = typeof newPrice === 'string' ? parseFloat(newPrice) : (newPrice || 0);
        
        setSelectedCoin((prevCoin) => {
          if (!prevCoin) return prevCoin;
          return {
            ...prevCoin,
            current_price: priceNum,
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
        
        // 현재 가격을 실시간으로 캔들에 반영 (1분봉은 실시간 계산)
        if (priceNum > 0 && isFinite(priceNum) && !isNaN(priceNum)) {
          setCandles((prevCandles) => {
            const now = new Date();
            
            // 현재 캔들 시간 계산 (간격별)
            let currentCandleTime: number;
            if (chartInterval === '1m') {
              // 1분봉: 현재 분의 시작 시간 (초 단위)
              currentCandleTime = Math.floor(now.getTime() / 1000 / 60) * 60;
            } else if (chartInterval === '1h') {
              // 1시간봉: 현재 시간의 시작 시간 (초 단위)
              currentCandleTime = Math.floor(now.getTime() / 1000 / 3600) * 3600;
            } else {
              // 1일봉: 현재 일의 시작 시간 (초 단위)
              currentCandleTime = Math.floor(now.getTime() / 1000 / 86400) * 86400;
            }
            
            if (prevCandles.length === 0) {
              // 캔들이 없으면 현재 가격으로 새 캔들 생성
              return [{
                id: `realtime-${Date.now()}`,
                coin_id: selectedCoin.id,
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
              // 같은 시간대면 마지막 캔들 실시간 업데이트
              const lastHigh = typeof lastCandle.high_price === 'string' ? parseFloat(lastCandle.high_price) : (lastCandle.high_price || 0);
              const lastLow = typeof lastCandle.low_price === 'string' ? parseFloat(lastCandle.low_price) : (lastCandle.low_price || 0);
              
              // 유효성 검사
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
                close_time: now.toISOString(), // 실시간으로 close_time 업데이트
              };
            } else {
              // 새 시간대면 새 캔들 추가
              const lastClose = typeof lastCandle.close_price === 'string' ? parseFloat(lastCandle.close_price) : (lastCandle.close_price || 0);
              
              // 유효성 검사
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
                coin_id: selectedCoin.id,
                open_time: new Date(currentCandleTime * 1000).toISOString(),
                close_time: now.toISOString(),
                open_price: openPrice,
                high_price: highPrice,
                low_price: lowPrice,
                close_price: priceNum,
                volume: 0,
                trade_count: 0,
              } as Candle);
              
              // 최대 100개만 유지
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
      if (!candleData || !candleData.coin_id || !candleData.open_time) {
        console.warn('Invalid candle update data:', candleData);
        return;
      }

      if (candleData.coin_id === selectedCoin.id && candleData.interval === chartInterval) {
        // 데이터 유효성 검사
        const openPrice = candleData.open_price != null ? (typeof candleData.open_price === 'string' ? parseFloat(candleData.open_price) : candleData.open_price) : null;
        const highPrice = candleData.high_price != null ? (typeof candleData.high_price === 'string' ? parseFloat(candleData.high_price) : candleData.high_price) : null;
        const lowPrice = candleData.low_price != null ? (typeof candleData.low_price === 'string' ? parseFloat(candleData.low_price) : candleData.low_price) : null;
        const closePrice = candleData.close_price != null ? (typeof candleData.close_price === 'string' ? parseFloat(candleData.close_price) : candleData.close_price) : null;

        // 모든 가격이 유효한지 확인
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
            // 같은 시간대 캔들 업데이트 (실시간)
            // 기존 값과 새 값을 안전하게 병합
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
            // 새 캔들 추가
            const newCandle = {
              id: candleData.id || `candle-${Date.now()}-${Math.random()}`,
              coin_id: candleData.coin_id || selectedCoin.id,
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

    // 주문 체결 이벤트 수신 (내 주문만)
    socket.on('order:filled', (orderData: any) => {
      // 내 주문인지 확인
      if (orderData.wallet_address === walletAddress) {
        const orderType = orderData.order_type === 'BUY' ? '매수' : '매도';
        const currencySym = baseCurrency?.symbol || 'G';
        const message = `${orderType} 주문이 체결되었습니다! 가격: ${Number(orderData.price).toLocaleString()} ${currencySym}, 수량: ${orderData.quantity}`;

        // 팝업 표시
        addToast(message, 'success');

        // 사운드 재생
        soundPlayer.play('order-filled', 0.6);

        console.log('Order filled:', orderData);
      }
    });

    // 주문 취소 이벤트 수신 (내 주문만)
    socket.on('order:cancelled', (orderData: any) => {
      // 내 주문인지 확인
      if (orderData.wallet_address === walletAddress) {
        const orderType = orderData.order_type === 'BUY' ? '매수' : '매도';
        const currencySym = baseCurrency?.symbol || 'G';
        const message = `${orderType} 주문이 취소되었습니다. 가격: ${Number(orderData.price).toLocaleString()} ${currencySym}`;

        // 팝업 표시
        addToast(message, 'info');

        // 사운드 재생
        soundPlayer.play('order-cancelled', 0.5);

        console.log('Order cancelled:', orderData);
      }
    });

    // 연결 성공
    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    // 연결 오류 처리
    socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error (will retry):', error.message);
      // WebSocket 연결 실패는 차트 렌더링을 방해하지 않음
      // 실시간 업데이트만 일시적으로 중단됨
    });

    // 연결 끊김 처리
    socket.on('disconnect', (reason) => {
      console.warn('WebSocket disconnected:', reason);
    });

    // 정리 함수
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('unsubscribe:coin', selectedCoin.id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedCoin?.id, chartInterval]); // walletAddress 제거하여 불필요한 재연결 방지

  // 캔들 데이터 가져오기 (초기 로드 및 간격 변경 시)
  useEffect(() => {
    const fetchCandles = async () => {
      if (!selectedCoin) return;
      setChartLoading(true);
      isInitialDataLoadRef.current = true; // 초기 로드 플래그 설정
      lastCandleTimeRef.current = null; // 마지막 캔들 시간 리셋
      try {
        const response = await api.get(`/coins/${selectedCoin.id}/candles/${chartInterval}`, {
          params: { limit: 500 } // 500개로 증가 (더 많은 과거 데이터 표시)
        });
        let newCandles = response.data.candles || [];
        console.log('Fetched candles:', newCandles.length);
        
        // 현재 가격 가져오기
        const currentPrice = typeof selectedCoin.current_price === 'string' 
          ? parseFloat(selectedCoin.current_price) 
          : (selectedCoin.current_price || 0);
        
        // 캔들 데이터가 없거나 오래된 경우, 현재 가격으로 최신 캔들 생성
        if (newCandles.length === 0 || currentPrice > 0) {
          const now = new Date();
          
          // 마지막 캔들 확인
          let lastCandleTime = null;
          if (newCandles.length > 0) {
            const lastCandle = newCandles[newCandles.length - 1];
            lastCandleTime = new Date(lastCandle.open_time).getTime() / 1000;
            const lastCandleClose = typeof lastCandle.close_price === 'string' 
              ? parseFloat(lastCandle.close_price) 
              : (lastCandle.close_price || 0);
            
            // 마지막 캔들 가격과 현재 가격 차이가 20% 이상이면 현재 가격으로 보정
            if (lastCandleClose > 0 && Math.abs((currentPrice - lastCandleClose) / lastCandleClose) > 0.2) {
              console.warn('Candle price mismatch detected. Last candle:', lastCandleClose, 'Current price:', currentPrice);

              // 현재 시간의 캔들 생성 또는 업데이트
              const currentCandleTime = Math.floor(now.getTime() / 1000 / (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400)) * (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400);
              
              if (lastCandleTime && Math.floor(lastCandleTime) === currentCandleTime) {
                // 같은 시간대면 마지막 캔들 업데이트
                newCandles[newCandles.length - 1] = {
                  ...lastCandle,
                  close_price: currentPrice,
                  high_price: Math.max(lastCandleClose, currentPrice),
                  low_price: Math.min(lastCandleClose, currentPrice),
                };
              } else {
                // 새 캔들 추가
                newCandles.push({
                  id: `current-${Date.now()}`,
                  coin_id: selectedCoin.id,
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
            // 캔들 데이터가 없으면 현재 가격으로 초기 캔들 생성
            const currentCandleTime = Math.floor(now.getTime() / 1000 / (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400)) * (chartInterval === '1m' ? 60 : chartInterval === '1h' ? 3600 : 86400);
            newCandles = [{
              id: `current-${Date.now()}`,
              coin_id: selectedCoin.id,
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
          watermark: {
            visible: true,
            fontSize: 24,
            horzAlign: 'left',
            vertAlign: 'bottom',
            color: 'rgba(156, 163, 175, 0.3)',
            text: 'TradingView',
          },
          localization: {
            timeFormatter: (time: number) => {
              // UTC 타임스탬프를 한국 시간으로 변환
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
              // 차트 축에 한국 시간 표시
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
          // null/undefined 체크
          if (!candle || !candle.open_time) {
            console.warn('Invalid candle: missing data', candle);
            continue;
          }

          // 데이터 타입 확인 및 변환
          let o: number;
          let h: number;
          let l: number;
          let c: number;

          if (candle.open_price == null) {
            console.warn('Invalid candle: open_price is null', candle);
            continue;
          }
          if (typeof candle.open_price === 'string') {
            o = parseFloat(candle.open_price);
          } else if (typeof candle.open_price === 'number') {
            o = candle.open_price;
          } else {
            console.warn('Invalid candle: open_price type', candle);
            continue;
          }

          if (candle.high_price == null) {
            console.warn('Invalid candle: high_price is null', candle);
            continue;
          }
          if (typeof candle.high_price === 'string') {
            h = parseFloat(candle.high_price);
          } else if (typeof candle.high_price === 'number') {
            h = candle.high_price;
          } else {
            console.warn('Invalid candle: high_price type', candle);
            continue;
          }

          if (candle.low_price == null) {
            console.warn('Invalid candle: low_price is null', candle);
            continue;
          }
          if (typeof candle.low_price === 'string') {
            l = parseFloat(candle.low_price);
          } else if (typeof candle.low_price === 'number') {
            l = candle.low_price;
          } else {
            console.warn('Invalid candle: low_price type', candle);
            continue;
          }

          if (candle.close_price == null) {
            console.warn('Invalid candle: close_price is null', candle);
            continue;
          }
          if (typeof candle.close_price === 'string') {
            c = parseFloat(candle.close_price);
          } else if (typeof candle.close_price === 'number') {
            c = candle.close_price;
          } else {
            console.warn('Invalid candle: close_price type', candle);
            continue;
          }
          
          // 유효성 검사 (NaN, 0, null 체크)
          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || 
              o <= 0 || h <= 0 || l <= 0 || c <= 0 ||
              !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) {
            console.warn('Invalid candle data (NaN or <= 0):', { o, h, l, c, candle });
            continue;
          }

          // high >= low 검증 및 교정
          const high = Math.max(h, l);
          const low = Math.min(h, l);

          // 타임스탬프 변환 (초 단위로)
          let t: number;
          
          // open_time이 유효한 문자열인지 확인
          if (!candle.open_time || typeof candle.open_time !== 'string') {
            console.warn('Invalid open_time type:', candle.open_time);
            continue;
          }

          try {
            const timeValue = new Date(candle.open_time).getTime();

            // Date 파싱 실패 체크
            if (isNaN(timeValue) || !isFinite(timeValue)) {
              console.warn('Invalid timestamp value:', {
                open_time: candle.open_time,
                parsed: timeValue
              });
              continue;
            }

            // 밀리초를 초로 변환
            t = Math.floor(timeValue / 1000);

            // 타임스탬프 유효성 검증 (2020년 ~ 2030년 사이)
            const minTimestamp = new Date('2020-01-01').getTime() / 1000; // 1577836800
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000; // 1924905600

            if (isNaN(t) || !isFinite(t) || t < minTimestamp || t > maxTimestamp) {
              console.warn('Invalid or out-of-range timestamp:', {
                open_time: candle.open_time,
                timestamp: t,
                date: new Date(t * 1000).toISOString()
              });
              continue;
            }
          } catch (error) {
            console.warn('Error parsing timestamp:', candle.open_time, error);
            continue;
          }

          // 최종 검증: 모든 값이 유효한지 확인
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

            // 데이터 객체 자체 검증
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
          // 최종 배열 검증: 모든 항목이 유효한지 확인 (더 엄격한 검증)
          const validData = formattedData.filter(d => {
            // null/undefined 체크
            if (d == null) return false;

            // 각 속성이 존재하고 null이 아닌지 확인
            if (d.time == null || d.open == null || d.high == null || d.low == null || d.close == null) {
              return false;
            }

            // 숫자 타입 및 유효성 검증
            const time = d.time as number;
            const open = d.open;
            const high = d.high;
            const low = d.low;
            const close = d.close;

            if (typeof time !== 'number' || typeof open !== 'number' ||
                typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number') {
              return false;
            }

            if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
              return false;
            }

            if (!isFinite(time) || !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) {
              return false;
            }

            if (time <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
              return false;
            }

            if (high < low) {
              return false;
            }

            // 타임스탬프 범위 검증 (2020년 ~ 2030년)
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

          // 데이터 검증 및 로그
          const priceMin = Math.min(...validData.map(d => d.low));
          const priceMax = Math.max(...validData.map(d => d.high));
          
          console.log('Chart data loaded:', validData.length, 'candles (filtered from', formattedData.length, ')');
          console.log('First candle:', validData[0]);
          console.log('Last candle:', validData[validData.length - 1]);
          console.log('Price range:', { min: priceMin, max: priceMax });
          console.log('Current coin price:', selectedCoin?.current_price);
          
          // 차트에 데이터 설정 (try-catch로 안전하게)
          try {
            // 최종 안전 검사: setData 호출 직전에 한 번 더 확인
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
        // 실시간 업데이트: 전체 데이터 재설정 (차트가 반응하도록)
        const formattedData: CandlestickData<UTCTimestamp>[] = [];
        for (const candle of candles) {
          // null/undefined 체크
          if (!candle || !candle.open_time) {
            continue;
          }

          // 데이터 타입 확인 및 변환
          let o: number;
          let h: number;
          let l: number;
          let c: number;

          if (candle.open_price == null) continue;
          if (typeof candle.open_price === 'string') {
            o = parseFloat(candle.open_price);
          } else if (typeof candle.open_price === 'number') {
            o = candle.open_price;
          } else {
            continue;
          }

          if (candle.high_price == null) continue;
          if (typeof candle.high_price === 'string') {
            h = parseFloat(candle.high_price);
          } else if (typeof candle.high_price === 'number') {
            h = candle.high_price;
          } else {
            continue;
          }

          if (candle.low_price == null) continue;
          if (typeof candle.low_price === 'string') {
            l = parseFloat(candle.low_price);
          } else if (typeof candle.low_price === 'number') {
            l = candle.low_price;
          } else {
            continue;
          }

          if (candle.close_price == null) continue;
          if (typeof candle.close_price === 'string') {
            c = parseFloat(candle.close_price);
          } else if (typeof candle.close_price === 'number') {
            c = candle.close_price;
          } else {
            continue;
          }
          
          // 유효성 검사 (NaN, 0, null, Infinity 체크)
          if (isNaN(o) || isNaN(h) || isNaN(l) || isNaN(c) || 
              o <= 0 || h <= 0 || l <= 0 || c <= 0 ||
              !isFinite(o) || !isFinite(h) || !isFinite(l) || !isFinite(c)) {
            continue;
          }

          // high >= low 검증 및 교정
          const high = Math.max(h, l);
          const low = Math.min(h, l);

          // 타임스탬프 변환 (초 단위로)
          let t: number;
          
          // open_time이 유효한 문자열인지 확인
          if (!candle.open_time || typeof candle.open_time !== 'string') {
            continue;
          }

          try {
            const timeValue = new Date(candle.open_time).getTime();

            // Date 파싱 실패 체크
            if (isNaN(timeValue) || !isFinite(timeValue)) {
              continue;
            }

            // 밀리초를 초로 변환
            t = Math.floor(timeValue / 1000);

            // 타임스탬프 유효성 검증 (2020년 ~ 2030년 사이)
            const minTimestamp = new Date('2020-01-01').getTime() / 1000;
            const maxTimestamp = new Date('2030-12-31').getTime() / 1000;

            if (isNaN(t) || !isFinite(t) || t < minTimestamp || t > maxTimestamp) {
              continue;
            }
          } catch (error) {
            // 타임스탬프 파싱 실패 시 스킵
            continue;
          }

          // 최종 검증: 모든 값이 유효한지 확인
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

            // 데이터 객체 자체 검증
            if (candleData.time && candleData.open && candleData.high &&
                candleData.low && candleData.close) {
              formattedData.push(candleData);
            }
          }
        }

        if (formattedData.length > 0) {
          // 최종 배열 검증: 모든 항목이 유효한지 확인 (더 엄격한 검증)
          const validData = formattedData.filter(d => {
            // null/undefined 체크
            if (d == null) return false;

            // 각 속성이 존재하고 null이 아닌지 확인
            if (d.time == null || d.open == null || d.high == null || d.low == null || d.close == null) {
              return false;
            }

            // 숫자 타입 및 유효성 검증
            const time = d.time as number;
            const open = d.open;
            const high = d.high;
            const low = d.low;
            const close = d.close;

            if (typeof time !== 'number' || typeof open !== 'number' ||
                typeof high !== 'number' || typeof low !== 'number' || typeof close !== 'number') {
              return false;
            }

            if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
              return false;
            }

            if (!isFinite(time) || !isFinite(open) || !isFinite(high) || !isFinite(low) || !isFinite(close)) {
              return false;
            }

            if (time <= 0 || open <= 0 || high <= 0 || low <= 0 || close <= 0) {
              return false;
            }

            if (high < low) {
              return false;
            }

            // 타임스탬프 범위 검증 (2020년 ~ 2030년)
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

          // 실시간 업데이트: 전체 데이터 재설정
          // lightweight-charts는 setData를 호출해도 줌 상태를 유지함
          try {
            // 최종 안전 검사: setData 호출 직전에 한 번 더 확인
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

  const currentPrice = typeof selectedCoin.current_price === 'string'
    ? parseFloat(selectedCoin.current_price)
    : (selectedCoin.current_price || 0);
  const coinClassification = classifyCoin(currentPrice, selectedCoin.coin_type);

  // 거래 화폐 심볼 결정 (base_currency가 있으면 해당 심볼, 없으면 GOLD)
  const currencySymbol = baseCurrency?.symbol || 'G';

  return (
    <div className="trading-page">
      <TopRankingsTicker />
      <div className="trading-container">
        <div className="main-content">
          {/* 코인 분류 경고 메시지 */}
          {coinClassification.warningMessage && (
            <div style={{
              padding: '1rem',
              backgroundColor: coinClassification.riskLevel === 'DUST' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderLeft: `4px solid ${coinClassification.warningColor}`,
              marginBottom: '1rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                {coinClassification.riskLevel === 'DUST' ? '⚠️' : '💡'}
              </div>
              <div>
                <div style={{
                  fontWeight: 'bold',
                  color: coinClassification.warningColor,
                  marginBottom: '0.25rem',
                  fontSize: '1rem'
                }}>
                  {coinClassification.badge}
                </div>
                <div style={{ color: '#e5e7eb', fontSize: '0.95rem' }}>
                  {coinClassification.warningMessage}
                </div>
              </div>
            </div>
          )}

          <div className="coin-header">
            <div className="coin-header-left">
              {selectedCoin.logo_url && (
                <img src={selectedCoin.logo_url} alt={selectedCoin.symbol} className="coin-header-logo" />
              )}
              <div className="coin-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h1>{selectedCoin.name}</h1>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    backgroundColor: coinClassification.badgeColor + '20',
                    color: coinClassification.badgeColor,
                    border: `1px solid ${coinClassification.badgeColor}`
                  }}>
                    {coinClassification.badge}
                  </span>
                </div>
                <div className="coin-header-symbols">
                  <span className="coin-symbol">{selectedCoin.symbol}</span>
                  <span className="coin-divider">/</span>
                  <span className="coin-quote">{baseCurrency ? baseCurrency.symbol : 'GOLD'}</span>
                </div>
              </div>
            </div>
            <div className="coin-header-right">
              <div className="coin-price-large">{formatPrice(selectedCoin.current_price)} {currencySymbol}</div>
              <div className={'coin-change-large ' + (selectedCoin.price_change_24h >= 0 ? 'positive' : 'negative')}>
                {formatChange(selectedCoin.price_change_24h)}
              </div>
            </div>
          </div>

          <div className="coin-stats">
            <div className="stat-item">
              <span className="stat-label">최고(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.current_price * 1.1)} {currencySymbol}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">최저(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.current_price * 0.9)} {currencySymbol}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">거래량(24H)</span>
              <span className="stat-value">{formatPrice(selectedCoin.volume_24h || 0)} {currencySymbol}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">시가총액</span>
              <span className="stat-value">{formatPrice(selectedCoin.market_cap)} {currencySymbol}</span>
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
              <Orderbook coinId={selectedCoin.id} baseCurrency={baseCurrency} />
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
            baseCurrency={baseCurrency}
            onOrderSuccess={handleOrderSuccess}
          />

          {/* 스탑 주문 패널 */}
          {walletAddress && (
            <StopOrderPanel
              walletAddress={walletAddress}
              selectedCoin={{
                id: selectedCoin.id,
                symbol: selectedCoin.symbol,
                current_price: typeof selectedCoin.current_price === 'string'
                  ? parseFloat(selectedCoin.current_price)
                  : selectedCoin.current_price
              }}
            />
          )}

          {/* 기술적 지표 패널 */}
          <TechnicalIndicators coinId={selectedCoin.id} interval={chartInterval} />
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
