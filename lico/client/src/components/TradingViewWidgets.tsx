import { useEffect, useState } from 'react';
import { coinService } from '../services/coinService';
import type { Coin } from '../types';
import './TradingViewWidgets.css';

// Ticker Tape 컴포넌트
export const TickerTape = () => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [symbols, setSymbols] = useState<string>('');

  useEffect(() => {
    const fetchCoins = async () => {
      try {
        const data = await coinService.getCoins('ACTIVE');
        setCoins(data);
        // TradingView 심볼 형식으로 변환 (LICO:SYMBOL)
        if (data && data.length > 0) {
          const symbolString = data.map(coin => `LICO:${coin.symbol}`).join(',');
          setSymbols(symbolString);
        }
      } catch (error) {
        console.error('Failed to fetch coins:', error);
      }
    };

    fetchCoins();
  }, []);

  if (!symbols || symbols.length === 0) {
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


