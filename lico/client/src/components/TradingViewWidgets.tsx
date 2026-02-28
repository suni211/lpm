import './TradingViewWidgets.css';

// Ticker Tape 컴포넌트 (가상 코인은 TradingView에서 인식하지 못하므로 제거)
export const TickerTape = () => {
  return null;
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


