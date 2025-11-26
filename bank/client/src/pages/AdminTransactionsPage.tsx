import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminTransactionsPage.css';

interface AdminTransactionsPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminTransactionsPage({ setAuth }: AdminTransactionsPageProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'TRANSFER_IN'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransactions();
  }, [filter, page]);

  const fetchTransactions = async () => {
    try {
      const params: any = { page, limit: 50 };
      if (filter !== 'all') params.type = filter;

      const response = await api.get('/api/admin/transactions', { params });
      setTransactions(response.data.transactions || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      if (error.response?.status === 401) {
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
          <label>거래 유형:</label>
          <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}>
            <option value="all">전체</option>
            <option value="DEPOSIT">입금</option>
            <option value="WITHDRAWAL">출금</option>
            <option value="TRANSFER_OUT">이체(송금)</option>
            <option value="TRANSFER_IN">이체(수신)</option>
          </select>
        </div>
      </div>

      {/* 거래 내역 테이블 */}
      <div className="transactions-table-section">
        <div className="table-header">
          <h3>전체 거래 내역 ({total}건)</h3>
        </div>
        <div className="transactions-table">
          <table>
            <thead>
              <tr>
                <th>시간</th>
                <th>계좌번호</th>
                <th>사용자</th>
                <th>유형</th>
                <th>금액</th>
                <th>잔액(이전)</th>
                <th>잔액(이후)</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">거래 내역이 없습니다</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.created_at).toLocaleString('ko-KR')}</td>
                    <td className="monospace">{tx.account_number}</td>
                    <td>{tx.minecraft_username}</td>
                    <td>
                      <span className={`type-badge ${tx.transaction_type.toLowerCase()}`}>
                        {tx.transaction_type === 'DEPOSIT' ? '입금' :
                         tx.transaction_type === 'WITHDRAWAL' ? '출금' :
                         tx.transaction_type === 'TRANSFER_OUT' ? '이체(송금)' : '이체(수신)'}
                      </span>
                    </td>
                    <td className={tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'TRANSFER_IN' ? 'positive' : 'negative'}>
                      {tx.transaction_type === 'DEPOSIT' || tx.transaction_type === 'TRANSFER_IN' ? '+' : '-'}
                      {Number(tx.amount).toLocaleString()} G
                    </td>
                    <td>{Number(tx.balance_before).toLocaleString()} G</td>
                    <td className="balance-after">{Number(tx.balance_after).toLocaleString()} G</td>
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

export default AdminTransactionsPage;

