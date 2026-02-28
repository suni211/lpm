import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminMemeApplicationsPage.css';

interface Application {
  id: string;
  applicant_address: string;
  applicant_username: string;
  coin_name: string;
  coin_symbol: string;
  coin_description: string;
  image_url: string;
  initial_supply: number;
  can_creator_trade: boolean;
  trading_lock_days: number;
  is_supply_limited: boolean;
  calculated_price: number;
  initial_capital_cyc: number;
  listing_fee_cyc: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_comment?: string;
  created_at: string;
  reviewed_at?: string;
}

const AdminMemeApplicationsPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = filterStatus === 'ALL' ? {} : { status: filterStatus };
      const response = await api.get('/meme-applications/all', { params });
      setApplications(response.data.applications);
    } catch (error) {
      console.error('신청 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 밈 코인 발행을 승인하시겠습니까?')) return;

    try {
      setProcessing(true);
      await api.post(`/meme-applications/${id}/approve`, {
        admin_comment: adminComment || undefined,
      });
      alert('승인되었습니다!');
      setSelectedApp(null);
      setAdminComment('');
      fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.error || '승인 실패');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!adminComment.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    if (!confirm('이 밈 코인 발행을 거부하시겠습니까?')) return;

    try {
      setProcessing(true);
      await api.post(`/meme-applications/${id}/reject`, {
        admin_comment: adminComment,
      });
      alert('거부되었습니다. 신청자의 CYC가 환불되었습니다.');
      setSelectedApp(null);
      setAdminComment('');
      fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.error || '거부 실패');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="status-badge pending">대기중</span>;
      case 'APPROVED':
        return <span className="status-badge approved">승인됨</span>;
      case 'REJECTED':
        return <span className="status-badge rejected">거부됨</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-meme-applications-page">
      <div className="page-header">
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← 관리자 대시보드
        </button>
        <h1>💎 밈 코인 발행 신청 관리</h1>
      </div>

      <div className="filter-tabs">
        <button
          className={filterStatus === 'PENDING' ? 'active' : ''}
          onClick={() => setFilterStatus('PENDING')}
        >
          대기중
        </button>
        <button
          className={filterStatus === 'APPROVED' ? 'active' : ''}
          onClick={() => setFilterStatus('APPROVED')}
        >
          승인됨
        </button>
        <button
          className={filterStatus === 'REJECTED' ? 'active' : ''}
          onClick={() => setFilterStatus('REJECTED')}
        >
          거부됨
        </button>
        <button
          className={filterStatus === 'ALL' ? 'active' : ''}
          onClick={() => setFilterStatus('ALL')}
        >
          전체
        </button>
      </div>

      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : applications.length === 0 ? (
        <div className="no-data">신청 내역이 없습니다.</div>
      ) : (
        <div className="applications-grid">
          {applications.map((app) => (
            <div key={app.id} className="application-card">
              <div className="card-header">
                <div className="coin-info">
                  <h3>{app.coin_name}</h3>
                  <span className="symbol">{app.coin_symbol}</span>
                </div>
                {getStatusBadge(app.status)}
              </div>

              <div className="card-body">
                <div className="applicant-info">
                  <strong>신청자:</strong>
                  <div>
                    <div>{app.applicant_username || '익명'}</div>
                    <div className="address">{app.applicant_address}</div>
                  </div>
                </div>

                {app.coin_description && (
                  <div className="description">
                    <strong>설명:</strong>
                    <p>{app.coin_description}</p>
                  </div>
                )}

                {app.image_url && (
                  <div className="image-preview">
                    <img src={app.image_url} alt={app.coin_name} />
                  </div>
                )}

                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">초기 발행량</span>
                    <span className="value">{parseFloat(app.initial_supply.toString()).toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">초기 가격</span>
                    <span className="value">{parseFloat(app.calculated_price.toString()).toFixed(8)} CYC</span>
                  </div>
                  <div className="info-item">
                    <span className="label">초기 자본</span>
                    <span className="value">{parseFloat(app.initial_capital_cyc.toString()).toLocaleString()} CYC</span>
                  </div>
                  <div className="info-item">
                    <span className="label">발행 수수료</span>
                    <span className="value">{parseFloat(app.listing_fee_cyc.toString()).toLocaleString()} CYC</span>
                  </div>
                  <div className="info-item">
                    <span className="label">생성자 거래</span>
                    <span className="value">
                      {app.can_creator_trade ? '즉시 가능' : `${app.trading_lock_days}일 후`}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">발행량 제한</span>
                    <span className="value">{app.is_supply_limited ? '제한됨' : '제한 없음'}</span>
                  </div>
                </div>

                <div className="dates">
                  <div>신청일: {new Date(app.created_at).toLocaleString('ko-KR')}</div>
                  {app.reviewed_at && (
                    <div>검토일: {new Date(app.reviewed_at).toLocaleString('ko-KR')}</div>
                  )}
                </div>

                {app.admin_comment && (
                  <div className="admin-comment">
                    <strong>관리자 코멘트:</strong>
                    <p>{app.admin_comment}</p>
                  </div>
                )}

                {app.status === 'PENDING' && (
                  <div className="actions">
                    <button
                      className="btn-review"
                      onClick={() => {
                        setSelectedApp(app);
                        setAdminComment('');
                      }}
                    >
                      검토하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 검토 모달 */}
      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>
              {selectedApp.coin_name} ({selectedApp.coin_symbol}) 검토
            </h2>

            <div className="review-summary">
              <div className="summary-item">
                <span>신청자:</span>
                <span>{selectedApp.applicant_username || '익명'}</span>
              </div>
              <div className="summary-item">
                <span>초기 발행량:</span>
                <span>{parseFloat(selectedApp.initial_supply.toString()).toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span>초기 가격:</span>
                <span>{parseFloat(selectedApp.calculated_price.toString()).toFixed(8)} CYC</span>
              </div>
              <div className="summary-item">
                <span>총 비용:</span>
                <span>
                  {(
                    parseFloat(selectedApp.initial_capital_cyc.toString()) +
                    parseFloat(selectedApp.listing_fee_cyc.toString())
                  ).toLocaleString()}{' '}
                  CYC
                </span>
              </div>
            </div>

            <div className="comment-section">
              <label>관리자 코멘트 (선택)</label>
              <textarea
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                placeholder="승인/거부 사유를 입력하세요..."
                rows={4}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-approve"
                onClick={() => handleApprove(selectedApp.id)}
                disabled={processing}
              >
                {processing ? '처리 중...' : '승인'}
              </button>
              <button
                className="btn-reject"
                onClick={() => handleReject(selectedApp.id)}
                disabled={processing || !adminComment.trim()}
              >
                {processing ? '처리 중...' : '거부'}
              </button>
              <button className="btn-cancel" onClick={() => setSelectedApp(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMemeApplicationsPage;
