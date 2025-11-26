import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './TransactionsPage.css';

interface TransactionsPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function TransactionsPage({ userData }: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_OUT' | 'TRANSFER_IN'>('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/api/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.transaction_type === filter);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return '💰';
      case 'WITHDRAWAL': return '💸';
      case 'TRANSFER_OUT': return '📤';
      case 'TRANSFER_IN': return '📥';
      default: return '📋';
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return '입금';
      case 'WITHDRAWAL': return '출금';
      case 'TRANSFER_OUT': return '이체(송금)';
      case 'TRANSFER_IN': return '이체(수신)';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="page-container">
        <Sidebar userData={userData} />
        <div className="page-content">
          <div className="loading">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Sidebar userData={userData} />
      <div className="page-content">
        <div className="transactions-container">
          <h1>거래 내역</h1>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              전체
            </button>
            <button
              className={`filter-tab ${filter === 'DEPOSIT' ? 'active' : ''}`}
              onClick={() => setFilter('DEPOSIT')}
            >
              입금
            </button>
            <button
              className={`filter-tab ${filter === 'WITHDRAWAL' ? 'active' : ''}`}
              onClick={() => setFilter('WITHDRAWAL')}
            >
              출금
            </button>
            <button
              className={`filter-tab ${filter === 'TRANSFER_OUT' ? 'active' : ''}`}
              onClick={() => setFilter('TRANSFER_OUT')}
            >
              이체
            </button>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <p>거래 내역이 없습니다</p>
            </div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-icon">
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-header">
                      <span className="transaction-type">
                        {getTransactionLabel(transaction.transaction_type)}
                      </span>
                      <span className={`transaction-amount ${transaction.transaction_type === 'DEPOSIT' || transaction.transaction_type === 'TRANSFER_IN' ? 'positive' : 'negative'}`}>
                        {transaction.transaction_type === 'DEPOSIT' || transaction.transaction_type === 'TRANSFER_IN' ? '+' : '-'}
                        {transaction.amount.toLocaleString()} G
                      </span>
                    </div>
                    <div className="transaction-meta">
                      <span className="transaction-balance">
                        잔액: {transaction.balance_after.toLocaleString()} G
                      </span>
                      <span className="transaction-date">
                        {formatDate(transaction.created_at)}
                      </span>
                    </div>
                    {transaction.notes && (
                      <div className="transaction-notes">
                        메모: {transaction.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionsPage;

