import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { Candle } from '../types';
import './TradingChart.css';

interface TradingChartProps {
  coinId: string;
  coinSymbol: string;
}

type Interval = '1m' | '1h' | '1d';

const TradingChart = ({ coinId, coinSymbol }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [interval, setInterval] = useState<Interval>('1h');
  const [candles, setCandles] = useState<Candle[]>([]);

  // ”ä pt0 \Ü
  useEffect(() => {
    const fetchCandles = async () => {
      try {
        const response = await fetch(
          `http://localhost:5002/api/coins/${coinId}/candles/${interval}?limit=100`
        );
        const data = await response.json();
        setCandles(data.candles || []);
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      }
    };

    if (coinId) {
      fetchCandles();
    }
  }, [coinId, interval]);

  // (¸ 0T  Åpt¸
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // (¸ Ý1
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

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });

      candlestickSeriesRef.current = candlestickSeries;
    }

    // ”ä pt0 Åpt¸
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formattedData = candles.map((candle) => ({
        time: new Date(candle.open_time).getTime() / 1000,
        open: Number(candle.open_price),
        high: Number(candle.high_price),
        low: Number(candle.low_price),
        close: Number(candle.close_price),
      }));

      candlestickSeriesRef.current.setData(formattedData);
    }

    // ¬¬tˆ xäì
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

  // ôì¸ ¸È´¸ Ü (¸ p
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
            1„
          </button>
          <button
            className={interval === '1h' ? 'active' : ''}
            onClick={() => setInterval('1h')}
          >
            1Ü
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
