import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import type { Candle } from '../types';
import api from '../services/api';
import './TradingChart.css';

interface TradingChartProps {
  coinId: string;
  coinSymbol?: string;
}

type Interval = '1m' | '1h' | '1d';

const TradingChart = ({ coinId }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [interval, setInterval] = useState<Interval>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);

  // 캔들 데이터 가져오기
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const response = await api.get(`/coins/${coinId}/candles/${interval}`, {
          params: { limit: 100 }
        });
        setCandles(response.data.candles || []);
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      }
    };

    if (coinId) {
      fetchCandles();
    }
  }, [coinId, interval]);

  // 차트 초기화 및 업데이트
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 차트 생성
    if (!chartRef.current) {
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#1a1d29' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#2a2e3e' },
          horzLines: { color: '#2a2e3e' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 500,
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // 캔들스틱 시리즈 추가 (lightweight-charts v5)
      try {
        // v5에서는 addCandlestickSeries 메서드 사용
        const candlestickSeries = (chart as any).addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        }) as ISeriesApi<'Candlestick'>;

        candlestickSeriesRef.current = candlestickSeries;
      } catch (error) {
        console.error('Failed to add candlestick series:', error);
        // 폴백: addSeries 사용
        try {
          const candlestickSeries = (chart as any).addSeries({
            type: 'Candlestick',
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          }) as ISeriesApi<'Candlestick'>;
          candlestickSeriesRef.current = candlestickSeries;
        } catch (fallbackError) {
          console.error('Failed to add series with fallback:', fallbackError);
        }
      }
    }

    // 차트 데이터 업데이트
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formattedData: CandlestickData<UTCTimestamp>[] = candles
        .map((candle) => {
          const open = typeof candle.open_price === 'string' ? parseFloat(candle.open_price) : (candle.open_price || 0);
          const high = typeof candle.high_price === 'string' ? parseFloat(candle.high_price) : (candle.high_price || 0);
          const low = typeof candle.low_price === 'string' ? parseFloat(candle.low_price) : (candle.low_price || 0);
          const close = typeof candle.close_price === 'string' ? parseFloat(candle.close_price) : (candle.close_price || 0);
          
          // 유효성 검사
          if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || 
              open <= 0 || high <= 0 || low <= 0 || close <= 0) {
            return null;
          }

          // 시간 변환
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
          // 차트 자동 스케일 조정
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        } catch (error) {
          console.error('Failed to set chart data:', error);
        }
      }
    }

    // 리사이즈 핸들러
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [candles]);

  // 컴포넌트 언마운트 시 차트 정리
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, []);

  return (
    <div className="trading-chart">
      <div className="chart-header">
        <div className="chart-intervals">
          <button
            className={interval === '1m' ? 'active' : ''}
            onClick={() => setInterval('1m')}
          >
            1분
          </button>
          <button
            className={interval === '1h' ? 'active' : ''}
            onClick={() => setInterval('1h')}
          >
            1시간
          </button>
          <button
            className={interval === '1d' ? 'active' : ''}
            onClick={() => setInterval('1d')}
          >
            1일
          </button>
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
};

export default TradingChart;
