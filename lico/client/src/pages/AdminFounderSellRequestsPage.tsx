import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface FounderSellRequest {
  id: string;
  stock_id: string;
  wallet_id: string;
  founder_uuid: string;
  order_method: 'MARKET' | 'LIMIT';
  price: number | null;
  quantity: number;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_comment: string | null;
  created_at: string;
  symbol: string;
  stock_name: string;
  founder_username: string;
}

function AdminFounderSellRequestsPage() {
  const [requests, setRequests] = useState<FounderSellRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [reviewModal, setReviewModal] = useState<FounderSellRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/founder-sell-requests/all?status=${statusFilter}`);
      setRequests(response.data.requests || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
      console.error('창업자 매도 요청 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 매도 요청을 승인하시겠습니까? 승인 시 즉시 매도 주문이 실행됩니다.')) return;

    try {
      setProcessing(true);
      await api.post(`/founder-sell-requests/${id}/approve`, {
        admin_comment: adminComment || null,
      });
      alert('매도 요청이 승인되었습니다.');
      setReviewModal(null);
      setAdminComment('');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || '승인 처리 실패');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminComment.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/founder-sell-requests/${id}/reject`, {
        admin_comment: adminComment,
      });
      alert('매도 요청이 거부되었습니다.');
      setReviewModal(null);
      setAdminComment('');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || '거부 처리 실패');
    } finally {
      setProcessing(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { text: '대기', color: '#f59e0b', bg: '#fef3c7' };
      case 'APPROVED':
        return { text: '승인', color: '#10b981', bg: '#d1fae5' };
      case 'REJECTED':
        return { text: '거부', color: '#ef4444', bg: '#fee2e2' };
      default:
        return { text: status, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>
          창업자 매도 요청 관리
        </h1>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          대시보드로 돌아가기
        </button>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '8px 16px',
              backgroundColor: statusFilter === s ? '#3b82f6' : '#1f2937',
              color: '#fff',
              border: statusFilter === s ? '1px solid #3b82f6' : '1px solid #374151',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {s === 'PENDING' ? '대기' : s === 'APPROVED' ? '승인' : s === 'REJECTED' ? '거부' : '전체'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>로딩 중...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
          {statusFilter === 'PENDING' ? '대기 중인 매도 요청이 없습니다.' : '매도 요청이 없습니다.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {requests.map((req) => {
            const badge = getStatusBadge(req.status);
            return (
              <div
                key={req.id}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: '8px',
                  padding: '16px',
                  border: '1px solid #374151',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                        {req.symbol}
                      </span>
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                        {req.stock_name}
                      </span>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: badge.color,
                          backgroundColor: badge.bg,
                        }}
                      >
                        {badge.text}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '14px' }}>
                      <div>
                        <span style={{ color: '#9ca3af' }}>창업자: </span>
                        <span style={{ color: '#fff' }}>{req.founder_username}</span>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>수량: </span>
                        <span style={{ color: '#fff' }}>{formatNumber(req.quantity)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>주문방식: </span>
                        <span style={{ color: '#fff' }}>
                          {req.order_method === 'MARKET' ? '시장가' : `지정가 (${req.price ? formatNumber(req.price) + ' G' : '-'})`}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>UUID: </span>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>{req.founder_uuid}</span>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>요청일: </span>
                        <span style={{ color: '#fff' }}>{formatDate(req.created_at)}</span>
                      </div>
                      {req.reviewed_at && (
                        <div>
                          <span style={{ color: '#9ca3af' }}>처리일: </span>
                          <span style={{ color: '#fff' }}>{formatDate(req.reviewed_at)}</span>
                        </div>
                      )}
                    </div>

                    {req.admin_comment && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#111827', borderRadius: '4px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>관리자 코멘트: </span>
                        <span style={{ color: '#fff', fontSize: '14px' }}>{req.admin_comment}</span>
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        setReviewModal(req);
                        setAdminComment('');
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      검토
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setReviewModal(null)}
        >
          <div
            style={{
              backgroundColor: '#1f2937',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              border: '1px solid #374151',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
              창업자 매도 요청 검토
            </h2>

            <div style={{ marginBottom: '16px', fontSize: '14px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>종목: </span>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>{reviewModal.symbol} ({reviewModal.stock_name})</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>창업자: </span>
                <span style={{ color: '#fff' }}>{reviewModal.founder_username}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>매도 수량: </span>
                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatNumber(reviewModal.quantity)}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#9ca3af' }}>주문 방식: </span>
                <span style={{ color: '#fff' }}>
                  {reviewModal.order_method === 'MARKET' ? '시장가' : `지정가 (${reviewModal.price ? formatNumber(reviewModal.price) + ' G' : '-'})`}
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#7f1d1d',
              border: '1px solid #991b1b',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '13px',
              color: '#fca5a5',
            }}>
              창업자의 대량 매도는 주가에 큰 영향을 줄 수 있습니다. 신중하게 검토해주세요.
            </div>

            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="관리자 코멘트 (거부 시 필수)"
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#111827',
                color: '#fff',
                border: '1px solid #374151',
                borderRadius: '6px',
                resize: 'vertical',
                minHeight: '80px',
                marginBottom: '16px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReviewModal(null)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#374151',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={() => handleReject(reviewModal.id)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {processing ? '처리 중...' : '거부'}
              </button>
              <button
                onClick={() => handleApprove(reviewModal.id)}
                disabled={processing}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {processing ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFounderSellRequestsPage;
