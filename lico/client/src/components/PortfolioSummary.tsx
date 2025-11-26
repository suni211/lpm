import { useState, useEffect } from 'react';
import api from '../services/api';
import './PortfolioSummary.css';

interface CoinBalance {
  coin_id: string;
  symbol: string;
  name: string;
  logo_url?: string;
  available_amount: number | string;
  total_amount: number | string;
  average_buy_price: number | string;
  current_price: number | string;
}

interface PortfolioSummaryProps {
  walletAddress: string;
}

const PortfolioSummary = ({ walletAddress }: PortfolioSummaryProps) => {
  const [balances, setBalances] = useState<CoinBalance[]>([]);
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        // 지갑 정보
        const walletRes = await api.get(`/wallets/address/${walletAddress}`);
        if (walletRes.data.wallet) {
          setGoldBalance(
            typeof walletRes.data.wallet.gold_balance === 'string'
              ? parseFloat(walletRes.data.wallet.gold_balance)
              : walletRes.data.wallet.gold_balance || 0
          );
        }

        // 코인 보유 현황
        const balancesRes = await api.get(`/wallets/${walletAddress}/balances`);
        setBalances(balancesRes.data.balances || []);
      } catch (error) {
        console.error('Failed to fetch portfolio:', error);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchPortfolio();
      // 5초마다 업데이트
      const interval = setInterval(fetchPortfolio, 5000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const calculateTotalValue = () => {
    const coinValue = balances.reduce((sum, balance) => {
      const amount = typeof balance.total_amount === 'string' 
        ? parseFloat(balance.total_amount) 
        : (balance.total_amount || 0);
      const price = typeof balance.current_price === 'string' 
        ? parseFloat(balance.current_price) 
        : (balance.current_price || 0);
      return sum + (amount * price);
    }, 0);
    return goldBalance + coinValue;
  };

  const calculateTotalPL = () => {
    return balances.reduce((sum, balance) => {
      const amount = typeof balance.total_amount === 'string' 
        ? parseFloat(balance.total_amount) 
        : (balance.total_amount || 0);
      const avgPrice = typeof balance.average_buy_price === 'string' 
        ? parseFloat(balance.average_buy_price) 
        : (balance.average_buy_price || 0);
      const currentPrice = typeof balance.current_price === 'string' 
        ? parseFloat(balance.current_price) 
        : (balance.current_price || 0);
      
      const cost = amount * avgPrice;
      const value = amount * currentPrice;
      return sum + (value - cost);
    }, 0);
  };

  const calculatePLPercent = () => {
    const totalCost = balances.reduce((sum, balance) => {
      const amount = typeof balance.total_amount === 'string' 
        ? parseFloat(balance.total_amount) 
        : (balance.total_amount || 0);
      const avgPrice = typeof balance.average_buy_price === 'string' 
        ? parseFloat(balance.average_buy_price) 
        : (balance.average_buy_price || 0);
      return sum + (amount * avgPrice);
    }, 0);

    if (totalCost === 0) return 0;
    const totalPL = calculateTotalPL();
    return (totalPL / totalCost) * 100;
  };

  if (loading) {
    return (
      <div className="portfolio-summary">
        <div className="widget-loading">로딩 중...</div>
      </div>
    );
  }

  const totalValue = calculateTotalValue();
  const totalPL = calculateTotalPL();
  const plPercent = calculatePLPercent();

  return (
    <div className="portfolio-summary">
      <div className="portfolio-header">
        <h3>포트폴리오</h3>
      </div>
      
      <div className="portfolio-stats">
        <div className="stat-row">
          <span className="stat-label">총 자산</span>
          <span className="stat-value">{formatNumber(totalValue)} G</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">보유 GOLD</span>
          <span className="stat-value">{formatNumber(goldBalance)} G</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">총 손익</span>
          <span className={`stat-value ${totalPL >= 0 ? 'positive' : 'negative'}`}>
            {totalPL >= 0 ? '+' : ''}{formatNumber(totalPL)} G ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="portfolio-holdings">
        <div className="holdings-header">보유 코인</div>
        <div className="holdings-list">
          {balances.length === 0 ? (
            <div className="no-holdings">보유한 코인이 없습니다</div>
          ) : (
            balances.slice(0, 5).map((balance) => {
              const amount = typeof balance.total_amount === 'string' 
                ? parseFloat(balance.total_amount) 
                : (balance.total_amount || 0);
              const currentPrice = typeof balance.current_price === 'string' 
                ? parseFloat(balance.current_price) 
                : (balance.current_price || 0);
              const avgPrice = typeof balance.average_buy_price === 'string' 
                ? parseFloat(balance.average_buy_price) 
                : (balance.average_buy_price || 0);
              
              const value = amount * currentPrice;
              const cost = amount * avgPrice;
              const pl = value - cost;
              const plPercent = cost > 0 ? ((pl / cost) * 100) : 0;

              return (
                <div key={balance.coin_id} className="holding-item">
                  <div className="holding-coin">
                    {balance.logo_url && (
                      <img src={balance.logo_url} alt={balance.symbol} className="coin-logo" />
                    )}
                    <div className="coin-info">
                      <div className="coin-name">{balance.symbol}</div>
                      <div className="coin-amount">{formatNumber(amount)}</div>
                    </div>
                  </div>
                  <div className="holding-value">
                    <div className="value-amount">{formatNumber(value)} G</div>
                    <div className={`value-pl ${pl >= 0 ? 'positive' : 'negative'}`}>
                      {pl >= 0 ? '+' : ''}{formatNumber(pl)} ({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;

