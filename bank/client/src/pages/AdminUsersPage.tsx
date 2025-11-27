import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminUsersPage.css';

interface AdminUsersPageProps {
  setAuth: (auth: boolean) => void;
}

function AdminUsersPage({ setAuth }: AdminUsersPageProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [filter, page]);

  const fetchUsers = async () => {
    try {
      const params: any = { page, limit: 50 };
      if (filter !== 'all') params.status = filter;

      const response = await api.get('/api/admin/users', { params });
      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      if (error.response?.status === 401) {
        setAuth(false);
        navigate('/admin-login');
      }
      console.error('사용자 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!confirm(`사용자 상태를 ${newStatus === 'SUSPENDED' ? '정지' : newStatus === 'CLOSED' ? '종료' : '활성화'}로 변경하시겠습니까?`)) return;

    try {
      // TODO: API 엔드포인트 추가 필요
      await api.patch(`/api/admin/users/${id}/status`, { status: newStatus });
      alert('사용자 상태가 변경되었습니다.');
      fetchUsers();
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
        <h1>사용자 관리</h1>
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
      </div>

      {/* 사용자 목록 */}
      <div className="users-table-section">
        <div className="table-header">
          <h3>전체 사용자 ({total}명)</h3>
        </div>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>아이디</th>
                <th>이메일</th>
                <th>마인크래프트</th>
                <th>계좌 수</th>
                <th>총 잔액</th>
                <th>상태</th>
                <th>가입일</th>
                <th>마지막 로그인</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-state">사용자가 없습니다</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.minecraft_username}</td>
                    <td>{user.account_count || 0}</td>
                    <td className="balance">{Number(user.total_balance || 0).toLocaleString()} G</td>
                    <td>
                      <span className={`status-badge ${user.status.toLowerCase()}`}>
                        {user.status === 'ACTIVE' ? '활성' :
                         user.status === 'SUSPENDED' ? '정지' : '종료'}
                      </span>
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString('ko-KR')}</td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleDateString('ko-KR') : '-'}</td>
                    <td>
                      <div className="action-buttons">
                        {user.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                            className="suspend-button"
                          >
                            정지
                          </button>
                        ) : user.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            className="activate-button"
                          >
                            활성화
                          </button>
                        ) : null}
                        {user.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleStatusChange(user.id, 'CLOSED')}
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

export default AdminUsersPage;








