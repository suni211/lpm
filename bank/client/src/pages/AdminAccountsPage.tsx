import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminAccountsPage.css';

interface AdminAccountsPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminAccountsPage({ setAuth }: AdminAccountsPageProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'>('all');
  const [accountType, setAccountType] = useState<'all' | 'BASIC' | 'STOCK'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, [filter, accountType, page]);

  const fetchAccounts = async () => {
    try {
      const params: any = { page, limit: 50 };
      if (filter !== 'all') params.status = filter;
      if (accountType !== 'all') params.account_type = accountType;

      const response = await api.get('/api/admin/accounts', { params });
      setAccounts(response.data.accounts || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('계좌 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!confirm(`계좌 상태를 ${newStatus === 'SUSPENDED' ? '정지' : newStatus === 'CLOSED' ? '종료' : '활성화'}로 변경하시겠습니까?`)) return;

    try {
      await api.patch(`/api/accounts/${id}/status`, { status: newStatus });
      alert('계좌 상태가 변경되었습니다.');
      fetchAccounts();
    } catch (error: any) {
      alert(error.response?.data?.error || '상태 변경 실패');
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
        <h1>계좌 관리</h1>
      </div>

      {/* 필터 */}
      <div className="filters-section">
        <div className="filter-group">
          <label>상태:</label>
          <select value={filter} onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}>
            <option value="all">전체</option>
            <option value="ACTIVE">활성</option>
            <option value="SUSPENDED">정지</option>
            <option value="CLOSED">종료</option>
          </select>
        </div>
        <div className="filter-group">
          <label>계좌 유형:</label>
          <select value={accountType} onChange={(e) => { setAccountType(e.target.value as any); setPage(1); }}>
            <option value="all">전체</option>
            <option value="BASIC">기본계좌</option>
            <option value="STOCK">주식계좌</option>
          </select>
        </div>
      </div>

      {/* 계좌 목록 */}
      <div className="accounts-table-section">
        <div className="table-header">
          <h3>전체 계좌 ({total}개)</h3>
        </div>
        <div className="accounts-table">
          <table>
            <thead>
              <tr>
                <th>계좌번호</th>
                <th>유형</th>
                <th>사용자</th>
                <th>이메일</th>
                <th>잔액</th>
                <th>상태</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-state">계좌가 없습니다</td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="monospace">{account.account_number}</td>
                    <td>
                      <span className={`type-badge ${account.account_type.toLowerCase()}`}>
                        {account.account_type === 'BASIC' ? '기본' : '주식'}
                      </span>
                    </td>
                    <td>{account.minecraft_username || account.username}</td>
                    <td>{account.email}</td>
                    <td className="balance">{Number(account.balance).toLocaleString()} G</td>
                    <td>
                      <span className={`status-badge ${account.status.toLowerCase()}`}>
                        {account.status === 'ACTIVE' ? '활성' :
                         account.status === 'SUSPENDED' ? '정지' : '종료'}
                      </span>
                    </td>
                    <td>{new Date(account.created_at).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <div className="action-buttons">
                        {account.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(account.id, 'SUSPENDED')}
                            className="suspend-button"
                          >
                            정지
                          </button>
                        ) : account.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleStatusChange(account.id, 'ACTIVE')}
                            className="activate-button"
                          >
                            활성화
                          </button>
                        ) : null}
                        {account.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleStatusChange(account.id, 'CLOSED')}
                            className="close-button"
                          >
                            종료
                          </button>
                        )}
                      </div>
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

export default AdminAccountsPage;




