import { useState, useEffect } from 'react';
import { coinService } from '../services/coinService';
import api from '../services/api';
import type { Coin } from '../types';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState<Coin | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    logo_url: '',
    description: '',
    initial_supply: '',
    circulating_supply: '',
    initial_price: '',
  });

  useEffect(() => {
    fetchCoins();
  }, []);

  const fetchCoins = async () => {
    try {
      const data = await coinService.getCoins();
      setCoins(data);
    } catch (error) {
      console.error('코인 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/coins', {
        symbol: formData.symbol,
        name: formData.name,
        logo_url: formData.logo_url || null,
        description: formData.description || null,
        initial_supply: parseInt(formData.initial_supply),
        circulating_supply: parseInt(formData.circulating_supply),
        initial_price: parseFloat(formData.initial_price),
      });
      alert('코인이 성공적으로 생성되었습니다!');
      setShowCreateModal(false);
      resetForm();
      fetchCoins();
    } catch (error: any) {
      alert(error.response?.data?.error || '코인 생성 실패');
    }
  };

  const handleUpdateCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoin) return;

    try {
      await api.patch(`/coins/${editingCoin.id}`, {
        name: formData.name,
        logo_url: formData.logo_url || null,
        description: formData.description || null,
        circulating_supply: parseInt(formData.circulating_supply),
        current_price: parseFloat(formData.initial_price),
      });
      alert('코인이 성공적으로 수정되었습니다!');
      setEditingCoin(null);
      resetForm();
      fetchCoins();
    } catch (error: any) {
      alert(error.response?.data?.error || '코인 수정 실패');
    }
  };

  const handleDeleteCoin = async (coinId: string) => {
    if (!confirm('정말로 이 코인을 삭제하시겠습니까?')) return;

    try {
      await api.patch(`/coins/${coinId}`, { status: 'DELISTED' });
      alert('코인이 삭제되었습니다!');
      fetchCoins();
    } catch (error: any) {
      alert(error.response?.data?.error || '코인 삭제 실패');
    }
  };

  const handleEditClick = (coin: Coin) => {
    setEditingCoin(coin);
    setFormData({
      symbol: coin.symbol,
      name: coin.name,
      logo_url: coin.logo_url || '',
      description: coin.description || '',
      initial_supply: coin.initial_supply.toString(),
      circulating_supply: coin.circulating_supply.toString(),
      initial_price: coin.current_price.toString(),
    });
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      logo_url: '',
      description: '',
      initial_supply: '',
      circulating_supply: '',
      initial_price: '',
    });
  };

  const formatNumber = (num: number | string | null | undefined) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : (num || 0);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-state">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>관리자 대시보드</h1>
        <button className="create-button" onClick={() => setShowCreateModal(true)}>
          + 코인 생성
        </button>
      </div>

      <div className="coins-table-container">
        <table className="coins-table">
          <thead>
            <tr>
              <th>심볼</th>
              <th>이름</th>
              <th>현재 가격</th>
              <th>유통량</th>
              <th>시가총액</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => (
              <tr key={coin.id}>
                <td>
                  <div className="coin-cell">
                    {coin.logo_url && (
                      <img src={coin.logo_url} alt={coin.symbol} className="coin-table-logo" />
                    )}
                    <span className="coin-symbol-text">{coin.symbol}</span>
                  </div>
                </td>
                <td>{coin.name}</td>
                <td>{formatNumber(coin.current_price)} G</td>
                <td>{formatNumber(coin.circulating_supply)}</td>
                <td>{formatNumber(coin.market_cap)} G</td>
                <td>
                  <span className={`status-badge ${coin.status.toLowerCase()}`}>
                    {coin.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="edit-button" onClick={() => handleEditClick(coin)}>
                      수정
                    </button>
                    <button
                      className="delete-button"
                      onClick={() => handleDeleteCoin(coin.id)}
                    >
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>코인 생성</h2>
            <form onSubmit={handleCreateCoin}>
              <div className="form-group">
                <label>심볼 *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  required
                  placeholder="BTC"
                />
              </div>
              <div className="form-group">
                <label>이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Bitcoin"
                />
              </div>
              <div className="form-group">
                <label>로고 URL</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="코인에 대한 설명"
                />
              </div>
              <div className="form-group">
                <label>초기 발행량 *</label>
                <input
                  type="number"
                  value={formData.initial_supply}
                  onChange={(e) => setFormData({ ...formData, initial_supply: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>유통량 *</label>
                <input
                  type="number"
                  value={formData.circulating_supply}
                  onChange={(e) => setFormData({ ...formData, circulating_supply: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>초기 가격 (GOLD) *</label>
                <input
                  type="number"
                  value={formData.initial_price}
                  onChange={(e) => setFormData({ ...formData, initial_price: e.target.value })}
                  required
                  min="0"
                  step="0.00000001"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  취소
                </button>
                <button type="submit">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingCoin && (
        <div className="modal-overlay" onClick={() => setEditingCoin(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>코인 수정</h2>
            <form onSubmit={handleUpdateCoin}>
              <div className="form-group">
                <label>심볼</label>
                <input type="text" value={formData.symbol} disabled />
              </div>
              <div className="form-group">
                <label>이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>로고 URL</label>
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>유통량 *</label>
                <input
                  type="number"
                  value={formData.circulating_supply}
                  onChange={(e) => setFormData({ ...formData, circulating_supply: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>현재 가격 (GOLD) *</label>
                <input
                  type="number"
                  value={formData.initial_price}
                  onChange={(e) => setFormData({ ...formData, initial_price: e.target.value })}
                  required
                  min="0"
                  step="0.00000001"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingCoin(null)}>
                  취소
                </button>
                <button type="submit">수정</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

