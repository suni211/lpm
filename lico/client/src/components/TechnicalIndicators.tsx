import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TechnicalIndicators.css';

interface IndicatorData {
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollingerBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  sma20: number[];
  sma50: number[];
  volumeMA: number[];
  candleCount: number;
}

interface TechnicalIndicatorsProps {
  coinId: string;
  interval?: string;
}

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  coinId,
  interval = '1h',
}) => {
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndicators();
    const intervalId = setInterval(loadIndicators, 10000); // 10초마다 갱신
    return () => clearInterval(intervalId);
  }, [coinId, interval]);

  const loadIndicators = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5002/api/indicators/${coinId}`,
        {
          params: { interval, limit: 100 },
          withCredentials: true,
        }
      );
      setIndicators(response.data);
      setError(null);
    } catch (err: any) {
      console.error('지표 로딩 실패:', err);
      setError(err.response?.data?.error || '지표를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRSI = () => {
    if (!indicators || indicators.rsi.length === 0) return null;
    return indicators.rsi[indicators.rsi.length - 1];
  };

  const getCurrentMACD = () => {
    if (!indicators || indicators.macd.macd.length === 0) return null;
    return {
      macd: indicators.macd.macd[indicators.macd.macd.length - 1],
      signal: indicators.macd.signal[indicators.macd.signal.length - 1],
      histogram: indicators.macd.histogram[indicators.macd.histogram.length - 1],
    };
  };

  const getCurrentBB = () => {
    if (!indicators || indicators.bollingerBands.upper.length === 0) return null;
    return {
      upper: indicators.bollingerBands.upper[indicators.bollingerBands.upper.length - 1],
      middle: indicators.bollingerBands.middle[indicators.bollingerBands.middle.length - 1],
      lower: indicators.bollingerBands.lower[indicators.bollingerBands.lower.length - 1],
    };
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi >= 70) return { text: '과매수', color: '#ef4444' };
    if (rsi <= 30) return { text: '과매도', color: '#22c55e' };
    return { text: '중립', color: '#6b7280' };
  };

  const getMACDStatus = (macd: number, signal: number) => {
    if (macd > signal) return { text: '상승', color: '#22c55e' };
    if (macd < signal) return { text: '하락', color: '#ef4444' };
    return { text: '중립', color: '#6b7280' };
  };

  if (loading && !indicators) {
    return (
      <div className="technical-indicators loading">
        <div className="loading-spinner"></div>
        <p>지표 로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="technical-indicators error">
        <p>❌ {error}</p>
      </div>
    );
  }

  if (!indicators) {
    return null;
  }

  const currentRSI = getCurrentRSI();
  const currentMACD = getCurrentMACD();
  const currentBB = getCurrentBB();

  return (
    <div className="technical-indicators">
      <div className="indicators-header">
        <h3>📊 기술적 지표</h3>
        <span className="data-count">{indicators.candleCount} 캔들</span>
      </div>

      <div className="indicators-grid">
        {/* RSI */}
        {currentRSI !== null && (
          <div className="indicator-card">
            <div className="indicator-title">
              <span className="indicator-name">RSI (14)</span>
              <span
                className="indicator-status"
                style={{ color: getRSIStatus(currentRSI).color }}
              >
                {getRSIStatus(currentRSI).text}
              </span>
            </div>
            <div className="indicator-value">{currentRSI.toFixed(2)}</div>
            <div className="rsi-bar">
              <div className="rsi-zones">
                <div className="rsi-zone oversold" style={{ width: '30%' }}>30</div>
                <div className="rsi-zone neutral" style={{ width: '40%' }}>50</div>
                <div className="rsi-zone overbought" style={{ width: '30%' }}>70</div>
              </div>
              <div
                className="rsi-indicator"
                style={{
                  left: `${currentRSI}%`,
                  backgroundColor: getRSIStatus(currentRSI).color,
                }}
              />
            </div>
          </div>
        )}

        {/* MACD */}
        {currentMACD && (
          <div className="indicator-card">
            <div className="indicator-title">
              <span className="indicator-name">MACD (12,26,9)</span>
              <span
                className="indicator-status"
                style={{ color: getMACDStatus(currentMACD.macd, currentMACD.signal).color }}
              >
                {getMACDStatus(currentMACD.macd, currentMACD.signal).text}
              </span>
            </div>
            <div className="macd-values">
              <div className="macd-row">
                <span className="macd-label">MACD</span>
                <span className="macd-value">{currentMACD.macd.toFixed(4)}</span>
              </div>
              <div className="macd-row">
                <span className="macd-label">Signal</span>
                <span className="macd-value">{currentMACD.signal.toFixed(4)}</span>
              </div>
              <div className="macd-row">
                <span className="macd-label">Histogram</span>
                <span
                  className="macd-value"
                  style={{ color: currentMACD.histogram >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {currentMACD.histogram.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {currentBB && (
          <div className="indicator-card">
            <div className="indicator-title">
              <span className="indicator-name">볼린저 밴드 (20,2)</span>
            </div>
            <div className="bb-values">
              <div className="bb-row">
                <span className="bb-label">상단</span>
                <span className="bb-value upper">{currentBB.upper.toFixed(2)}</span>
              </div>
              <div className="bb-row">
                <span className="bb-label">중간</span>
                <span className="bb-value middle">{currentBB.middle.toFixed(2)}</span>
              </div>
              <div className="bb-row">
                <span className="bb-label">하단</span>
                <span className="bb-value lower">{currentBB.lower.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* SMA */}
        {indicators.sma20.length > 0 && indicators.sma50.length > 0 && (
          <div className="indicator-card">
            <div className="indicator-title">
              <span className="indicator-name">이동평균선 (SMA)</span>
            </div>
            <div className="sma-values">
              <div className="sma-row">
                <span className="sma-label">SMA 20</span>
                <span className="sma-value">
                  {indicators.sma20[indicators.sma20.length - 1].toFixed(2)}
                </span>
              </div>
              <div className="sma-row">
                <span className="sma-label">SMA 50</span>
                <span className="sma-value">
                  {indicators.sma50[indicators.sma50.length - 1].toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalIndicators;
