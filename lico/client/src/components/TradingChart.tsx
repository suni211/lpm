import { useEffect, useState } from 'react';
import type { Coin } from '../types';
import api from '../services/api';
import './TradingChart.css';

interface TradingChartProps {
  coinId: string;
  coinSymbol?: string;
}

type Interval = '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W';

const TradingChart = ({ coinId }: TradingChartProps) => {
  const [interval, setInterval] = useState<Interval>('60');
  const [coin, setCoin] = useState<Coin | null>(null);

  // 코인 정보 가져오기
  useEffect(() => {
    const fetchCoin = async () => {
      try {
        const response = await api.get(`/coins/${coinId}`);
        setCoin(response.data.coin);
      } catch (error) {
        console.error('Failed to fetch coin:', error);
      }
    };

    if (coinId) {
      fetchCoin();
    }
  }, [coinId]);

  if (!coin) {
    return <div className="trading-chart">로딩 중...</div>;
  }

  // TradingView 위젯 심볼 생성 (LICO:SYMBOL 형식)
  const symbol = `LICO:${coin.symbol}`;
  
  // TradingView 위젯 URL 생성
  const widgetUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_${coinId}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FSeoul&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=ko&utm_source=lico.berrple.com&utm_medium=widget&utm_campaign=chart&utm_term=${encodeURIComponent(symbol)}`;

  return (
    <div className="trading-chart">
      <div className="chart-header">
        <div className="chart-intervals">
          <button
            className={interval === '1' ? 'active' : ''}
            onClick={() => setInterval('1')}
          >
            1분
          </button>
          <button
            className={interval === '5' ? 'active' : ''}
            onClick={() => setInterval('5')}
          >
            5분
          </button>
          <button
            className={interval === '15' ? 'active' : ''}
            onClick={() => setInterval('15')}
          >
            15분
          </button>
          <button
            className={interval === '30' ? 'active' : ''}
            onClick={() => setInterval('30')}
          >
            30분
          </button>
          <button
            className={interval === '60' ? 'active' : ''}
            onClick={() => setInterval('60')}
          >
            1시간
          </button>
          <button
            className={interval === '240' ? 'active' : ''}
            onClick={() => setInterval('240')}
          >
            4시간
          </button>
          <button
            className={interval === 'D' ? 'active' : ''}
            onClick={() => setInterval('D')}
          >
            1일
          </button>
          <button
            className={interval === 'W' ? 'active' : ''}
            onClick={() => setInterval('W')}
          >
            1주
          </button>
        </div>
      </div>
      <div className="chart-container">
        <iframe
          id={`tradingview_${coinId}`}
          src={widgetUrl}
          style={{
            width: '100%',
            height: '500px',
            border: 'none',
            borderRadius: '8px',
          }}
          title={`TradingView Chart - ${coin.symbol}`}
        />
      </div>
    </div>
  );
};

export default TradingChart;
