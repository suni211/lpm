import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminTradesPage.css';

interface AdminTradesPageProps {
  setAuth?: (auth: boolean) => void;
}

function AdminTradesPage({ setAuth }: AdminTradesPageProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [stocks, setStocks] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStocks();
    fetchTrades();
  }, [page, selectedStock]);

  const fetchStocks = async () => {
    try {
      const response = await api.get('/stocks');
      setStocks(response.data.stocks || []);
    } catch (error) {
      console.error('종목 목록 조회 실패:', error);
    }
  };

  const fetchTrades = async () => {
    try {
      const params: any = { page, limit: 50 };
      if (selectedStock) params.stock_id = selectedStock;

      const response = await api.get('/admin/trades', { params });
      setTrades(response.data.trades || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      if (error.response?.status === 401 && setAuth) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('거래 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <button onClick={() => navigate('/admin')} className="back-button">
          ← 뒤로
        </button>
        <h1>거래 내역 관리</h1>
      </div>

      {/* 필터 */}
      <div className="filters-section">
        <div className="filter-group">
          <label>종목:</label>
          <select value={selectedStock} onChange={(e) => { setSelectedStock(e.target.value); setPage(1); }}>
            <option value="">전체</option>
            {stocks.map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 거래 내역 테이블 */}
      <div className="trades-table-section">
        <div className="table-header">
          <h3>전체 거래 내역 ({total}건)</h3>
        </div>
        <div className="trades-table">
          <table>
            <thead>
              <tr>
                <th>시간</th>
                <th>종목</th>
                <th>가격</th>
                <th>수량</th>
                <th>총액</th>
                <th>매수자</th>
                <th>매도자</th>
                <th>수수료</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">거래 내역이 없습니다</td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.created_at).toLocaleString('ko-KR')}</td>
                    <td>
                      <div className="stock-cell">
                        <span className="stock-symbol">{trade.symbol}</span>
                        <span className="stock-name">{trade.name}</span>
                      </div>
                    </td>
                    <td className="price">{Number(trade.price).toLocaleString()} G</td>
                    <td>{Number(trade.quantity).toLocaleString()}</td>
                    <td className="total">{Number(trade.total_amount).toLocaleString()} G</td>
                    <td>{trade.buyer_username}</td>
                    <td>{trade.seller_username}</td>
                    <td className="fee">
                      매수: {Number(trade.buy_fee).toLocaleString()} G<br />
                      매도: {Number(trade.sell_fee).toLocaleString()} G
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 */}
        {total > 50 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="page-button"
            >
              이전
            </button>
            <span className="page-info">{page} / {Math.ceil(total / 50)}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 50)}
              className="page-button"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminTradesPage;

