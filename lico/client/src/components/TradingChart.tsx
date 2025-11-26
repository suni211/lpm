import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import type { ISeriesApi, UTCTimestamp } from 'lightweight-charts';
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
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [interval, setInterval] = useState<Interval>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);

  // �� pt0 \�
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

  // (� 0T  �pt�
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // (� �1
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

      // lightweight-charts v5에서는 addSeries를 사용해야 함
      try {
        // 타입 오류를 피하기 위해 any로 캐스팅
        const candlestickSeries = (chartRef.current as any).addSeries({
          type: 'Candlestick',
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
        // v5 이전 버전 호환성을 위한 폴백
        if ('addCandlestickSeries' in chartRef.current && typeof (chartRef.current as any).addCandlestickSeries === 'function') {
          const candlestickSeries = (chartRef.current as any).addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
          }) as ISeriesApi<'Candlestick'>;
          candlestickSeriesRef.current = candlestickSeries;
        }
      }
    }

    // �� pt0 �pt�
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formattedData = candles.map((candle) => {
        const open = typeof candle.open_price === 'string' ? parseFloat(candle.open_price) : (candle.open_price || 0);
        const high = typeof candle.high_price === 'string' ? parseFloat(candle.high_price) : (candle.high_price || 0);
        const low = typeof candle.low_price === 'string' ? parseFloat(candle.low_price) : (candle.low_price || 0);
        const close = typeof candle.close_price === 'string' ? parseFloat(candle.close_price) : (candle.close_price || 0);
        
        return {
          time: (new Date(candle.open_time).getTime() / 1000) as UTCTimestamp,
          open: isNaN(open) ? 0 : open,
          high: isNaN(high) ? 0 : high,
          low: isNaN(low) ? 0 : low,
          close: isNaN(close) ? 0 : close,
        };
      }).filter(candle => candle.time > 0); // 유효한 시간만 필터링

      if (formattedData.length > 0) {
        candlestickSeriesRef.current.setData(formattedData);
      }
    }

    // ��t� x��
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

  // ��� �ȴ� � (� p
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
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
            1�
          </button>
          <button
            className={interval === '1h' ? 'active' : ''}
            onClick={() => setInterval('1h')}
          >
            1�
          </button>
          <button
            className={interval === '1d' ? 'active' : ''}
            onClick={() => setInterval('1d')}
          >
            1|
          </button>
        </div>
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
};

export default TradingChart;
