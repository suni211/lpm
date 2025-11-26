import { useEffect, useState } from 'react';
import { coinService } from '../services/coinService';
import type { Coin } from '../types';
import './TradingViewWidgets.css';

// Ticker Tape 컴포넌트
export const TickerTape = () => {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await coinService.getCoins('ACTIVE');
        setCoins(data);
      } catch (error) {
        console.error('Failed to fetch coins:', error);
      }
    };

    fetchCoins();
  }, []);

  // TradingView 심볼 형식으로 변환 (LICO:SYMBOL)
  const symbols = coins.map(coin => `LICO:${coin.symbol}`).join(',');

  if (!symbols) {
    return null;
  }

  return (
    <div className="tradingview-widget-container ticker-tape">
      <div className="tradingview-widget-container__widget">
        <iframe
          src={`https://s.tradingview.com/embed-widget/ticker-tape/?locale=ko&symbols=${encodeURIComponent(symbols)}&colorTheme=dark&isTransparent=false&displayMode=adaptive&fontSize=12&height=46`}
          style={{
            width: '100%',
            height: '46px',
            border: 'none',
          }}
          title="Ticker Tape"
        />
      </div>
    </div>
  );
};

// Market Data 컴포넌트
export const MarketData = ({ coinSymbol }: { coinSymbol?: string }) => {
  const symbol = coinSymbol ? `LICO:${coinSymbol}` : 'LICO:BTC';

  return (
    <div className="tradingview-widget-container market-data">
      <div className="tradingview-widget-container__widget">
        <iframe
          src={`https://s.tradingview.com/embed-widget/market-quotes/?locale=ko&symbols=${encodeURIComponent(symbol)}&colorTheme=dark&isTransparent=false&fontSize=12&height=400`}
          style={{
            width: '100%',
            height: '400px',
            border: 'none',
            borderRadius: '8px',
          }}
          title="Market Data"
        />
      </div>
    </div>
  );
};

// Advanced Chart 컴포넌트
export const AdvancedChart = ({ coinSymbol, interval = '60' }: { coinSymbol?: string; interval?: string }) => {
  const symbol = coinSymbol ? `LICO:${coinSymbol}` : 'LICO:BTC';

  return (
    <div className="tradingview-widget-container advanced-chart">
      <div className="tradingview-widget-container__widget">
        <iframe
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FSeoul&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=ko`}
          style={{
            width: '100%',
            height: '600px',
            border: 'none',
            borderRadius: '8px',
          }}
          title="Advanced Chart"
        />
      </div>
    </div>
  );
};

