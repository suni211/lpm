import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Coin } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'coins' | 'users' | 'trades' | 'charts'>('coins');
  const [coins, setCoins] = useState<Coin[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoin, setEditingCoin] = useState<Coin | null>(null);
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    logo_url: '',
    description: '',
    circulating_supply: '',
    current_price: '',
    min_volatility: '',
    max_volatility: '',
    coin_type: 'MEME' as 'MAJOR' | 'MEME',
    base_currency_id: '',
  });

  useEffect(() => {
    fetchCoins();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'trades') fetchTrades();
  }, [activeTab]);

  useEffect(() => {
    if (selectedCoin && activeTab === 'charts') {
      fetchPriceHistory();
    }
  }, [selectedCoin, activeTab]);

  const fetchCoins = async () => {
    try {
      // 관리자 대시보드에서는 모든 코인 조회 (status 파라미터 없음)
      const response = await api.get('/coins');
      const data = response.data.coins || [];
      setCoins(data);
      if (data.length > 0 && !selectedCoin) {
        setSelectedCoin(data[0].id);
      }
    } catch (error) {
      console.error('코인 목록 조회 실패:', error);
      setCoins([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await api.get('/admin/trades');
      setTrades(response.data.trades || []);
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
    }
  };

  const fetchPriceHistory = async () => {
    if (!selectedCoin) return;
    try {
      const response = await api.get(`/admin/coins/${selectedCoin}/price-history?interval=1h&limit=100`);
      const candles = response.data.candles || [];
      const chartData = candles.map((candle: any) => ({
        time: new Date(candle.open_time).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit' }),
        price: parseFloat(candle.close_price || candle.close || 0),
        volume: parseFloat(candle.volume || 0),
      }));
      setPriceHistory(chartData);
    } catch (error) {
      console.error('가격 변동 그래프 조회 실패:', error);
    }
  };

  const handleUserStatusChange = async (userId: string, newStatus: string) => {
    if (!confirm(`사용자 상태를 ${newStatus === 'SUSPENDED' ? '정지' : newStatus === 'CLOSED' ? '종료' : '활성화'}로 변경하시겠습니까?`)) return;

    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      alert('사용자 상태가 변경되었습니다.');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || '상태 변경 실패');
    }
  };

  const handleCreateCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        symbol: formData.symbol,
        name: formData.name,
        logo_url: formData.logo_url || null,
        description: formData.description || null,
        circulating_supply: parseInt(formData.circulating_supply),
        current_price: parseFloat(formData.current_price),
      };

      // 변동성 추가 (값이 있을 때만)
      if (formData.min_volatility) {
        payload.min_volatility = parseFloat(formData.min_volatility) / 100;
      }
      if (formData.max_volatility) {
        payload.max_volatility = parseFloat(formData.max_volatility) / 100;
      }

      // 코인 타입 추가
      payload.coin_type = formData.coin_type;
      if (formData.coin_type === 'MEME' && formData.base_currency_id) {
        payload.base_currency_id = formData.base_currency_id;
      }

      await api.post('/coins', payload);
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
        current_price: parseFloat(formData.current_price),
        min_volatility: parseFloat(formData.min_volatility) / 100, // %를 소수로 변환
        max_volatility: parseFloat(formData.max_volatility) / 100, // %를 소수로 변환
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
    const coin = coins.find(c => c.id === coinId);
    if (!coin) return;

    if (!confirm(`⚠️ 경고: ${coin.symbol} 코인을 영구 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n- 코인 정보\n- 모든 캔들 데이터 (1m, 1h, 1d)\n- 모든 주문\n- 모든 거래 내역\n- 모든 사용자 잔액\n- 로고 이미지 파일`)) return;

    try {
      const response = await api.delete(`/coins/${coinId}`);
      alert(response.data.message || '코인이 영구 삭제되었습니다!');
      fetchCoins();
    } catch (error: any) {
      alert(error.response?.data?.error || '코인 삭제 실패');
      console.error('코인 삭제 오류:', error);
    }
  };

  const handleEditClick = (coin: Coin) => {
    setEditingCoin(coin);
    setFormData({
      symbol: coin.symbol,
      name: coin.name,
      logo_url: coin.logo_url || '',
      description: coin.description || '',
      circulating_supply: coin.circulating_supply.toString(),
      current_price: coin.current_price.toString(),
      min_volatility: coin.min_volatility ? (coin.min_volatility * 100).toFixed(3) : '0.001',
      max_volatility: coin.max_volatility ? (coin.max_volatility * 100).toFixed(3) : '0.1',
      coin_type: coin.coin_type || 'MEME',
      base_currency_id: coin.base_currency_id || '',
    });
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      logo_url: '',
      description: '',
      circulating_supply: '',
      current_price: '',
      min_volatility: '0.001',
      max_volatility: '0.1',
      coin_type: 'MEME',
      base_currency_id: '',
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="create-button"
            onClick={() => navigate('/admin/news')}
            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
          >
            📰 뉴스 관리
          </button>
          <button
            className="create-button"
            onClick={() => navigate('/admin/meme-applications')}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            💎 밈 코인 신청 관리
          </button>
          {activeTab === 'coins' && (
            <button className="create-button" onClick={() => setShowCreateModal(true)}>
              + 코인 생성
            </button>
          )}
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="admin-tabs">
        <button
          className={activeTab === 'coins' ? 'active' : ''}
          onClick={() => setActiveTab('coins')}
        >
          코인 관리
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          사용자 관리
        </button>
        <button
          className={activeTab === 'trades' ? 'active' : ''}
          onClick={() => setActiveTab('trades')}
        >
          거래 내역
        </button>
        <button
          className={activeTab === 'charts' ? 'active' : ''}
          onClick={() => setActiveTab('charts')}
        >
          변동 그래프
        </button>
      </div>

      {/* 코인 관리 탭 */}
      {activeTab === 'coins' && (
        <div className="coins-table-container">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>코인 목록</h3>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="create-button"
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              + 코인 생성
            </button>
          </div>
          <table className="coins-table">
            <thead>
              <tr>
                <th>심볼</th>
                <th>이름</th>
                <th>타입</th>
                <th>현재 가격</th>
                <th>유통량</th>
                <th>시가총액</th>
                <th>변동성 범위</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    로딩 중...
                  </td>
                </tr>
              ) : coins.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    등록된 코인이 없습니다
                  </td>
                </tr>
              ) : (
                coins.map((coin) => (
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
                    <td>
                      <span className={`status-badge ${coin.coin_type === 'MAJOR' ? 'major' : 'meme'}`} style={{
                        background: coin.coin_type === 'MAJOR' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(147, 51, 234, 0.2)',
                        color: coin.coin_type === 'MAJOR' ? '#60a5fa' : '#c084fc',
                        border: `1px solid ${coin.coin_type === 'MAJOR' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(147, 51, 234, 0.4)'}`,
                      }}>
                        {coin.coin_type || 'MEME'}
                      </span>
                    </td>
                    <td>{formatNumber(coin.current_price)} G</td>
                    <td>{formatNumber(coin.circulating_supply)}</td>
                    <td>{formatNumber(coin.market_cap)} G</td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {coin.min_volatility ? (parseFloat(coin.min_volatility.toString()) * 100).toFixed(3) : '0.001'}% ~ {coin.max_volatility ? (parseFloat(coin.max_volatility.toString()) * 100).toFixed(3) : '0.1'}%
                      </span>
                    </td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 사용자 관리 탭 */}
      {activeTab === 'users' && (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>지갑 주소</th>
                <th>Minecraft 닉네임</th>
                <th>Gold 잔액</th>
                <th>코인 보유 가치</th>
                <th>보유 코인 수</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">사용자가 없습니다</td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="monospace">{user.wallet_address}</td>
                    <td>{user.minecraft_username}</td>
                    <td>{formatNumber(user.gold_balance)} G</td>
                    <td>{formatNumber(user.total_coin_value)} G</td>
                    <td>{user.coin_count || 0}</td>
                    <td>
                      <span className={`status-badge ${user.status?.toLowerCase() || 'active'}`}>
                        {user.status === 'ACTIVE' ? '활성' :
                         user.status === 'SUSPENDED' ? '정지' : '종료'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {user.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleUserStatusChange(user.id, 'SUSPENDED')}
                            className="suspend-button"
                          >
                            정지
                          </button>
                        ) : user.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleUserStatusChange(user.id, 'ACTIVE')}
                            className="activate-button"
                          >
                            활성화
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 거래 내역 탭 */}
      {activeTab === 'trades' && (
        <div className="trades-table-container">
          <table className="trades-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>코인</th>
                <th>매수자</th>
                <th>매도자</th>
                <th>가격</th>
                <th>수량</th>
                <th>총액</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">거래 내역이 없습니다</td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <tr key={trade.id}>
                    <td>{new Date(trade.created_at).toLocaleString('ko-KR')}</td>
                    <td>
                      <div className="coin-cell">
                        <span className="coin-symbol-text">{trade.symbol}</span>
                        <span className="coin-name-text">{trade.name}</span>
                      </div>
                    </td>
                    <td>{trade.buyer_username}</td>
                    <td>{trade.seller_username}</td>
                    <td>{formatNumber(trade.price)} G</td>
                    <td>{formatNumber(trade.quantity)}</td>
                    <td>{formatNumber(trade.total_amount)} G</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 변동 그래프 탭 */}
      {activeTab === 'charts' && (
        <div className="charts-container">
          <div className="chart-controls">
            <label>코인 선택:</label>
            <select
              value={selectedCoin}
              onChange={(e) => setSelectedCoin(e.target.value)}
            >
              {coins.map((coin) => (
                <option key={coin.id} value={coin.id}>
                  {coin.symbol} - {coin.name}
                </option>
              ))}
            </select>
          </div>
          {priceHistory.length > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="price" stroke="#8884d8" name="가격 (G)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">그래프 데이터가 없습니다</div>
          )}
        </div>
      )}

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
                <label>코인 타입 *</label>
                <select
                  value={formData.coin_type}
                  onChange={(e) => setFormData({ ...formData, coin_type: e.target.value as 'MAJOR' | 'MEME', base_currency_id: '' })}
                  required
                >
                  <option value="MEME">MEME (밈코인 - MAJOR로 거래)</option>
                  <option value="MAJOR">MAJOR (기축코인 - Gold로 거래)</option>
                </select>
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>
                  MEME: 밈코인, MAJOR 코인으로 거래 | MAJOR: 기축코인, Gold로 거래
                </small>
              </div>
              {formData.coin_type === 'MEME' && (
                <div className="form-group">
                  <label>거래 기준 코인 (MAJOR) *</label>
                  <select
                    value={formData.base_currency_id}
                    onChange={(e) => setFormData({ ...formData, base_currency_id: e.target.value })}
                    required
                  >
                    <option value="">선택하세요</option>
                    {coins.filter(c => c.coin_type === 'MAJOR').map((coin) => (
                      <option key={coin.id} value={coin.id}>
                        {coin.symbol} - {coin.name}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#9ca3af', fontSize: '12px' }}>
                    이 밈코인을 거래할 때 사용할 MAJOR 코인을 선택하세요
                  </small>
                </div>
              )}
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
                  value={formData.current_price}
                  onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                  required
                  min="0"
                  step="0.00000001"
                />
              </div>
              <div className="form-group">
                <label>최소 변동성 (%)</label>
                <input
                  type="number"
                  value={formData.min_volatility}
                  onChange={(e) => setFormData({ ...formData, min_volatility: e.target.value })}
                  min="0.001"
                  max="0.999"
                  step="0.001"
                  placeholder="0.001"
                />
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>범위: 0.001% ~ 0.999% (기본값: 0.001%)</small>
              </div>
              <div className="form-group">
                <label>최대 변동성 (%)</label>
                <input
                  type="number"
                  value={formData.max_volatility}
                  onChange={(e) => setFormData({ ...formData, max_volatility: e.target.value })}
                  min="0.001"
                  max="0.999"
                  step="0.001"
                  placeholder="0.1"
                />
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>범위: 0.001% ~ 0.999% (기본값: 0.1%)</small>
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
                  value={formData.current_price}
                  onChange={(e) => setFormData({ ...formData, current_price: e.target.value })}
                  required
                  min="0"
                  step="0.00000001"
                />
              </div>
              <div className="form-group">
                <label>최소 변동성 (%) *</label>
                <input
                  type="number"
                  value={formData.min_volatility}
                  onChange={(e) => setFormData({ ...formData, min_volatility: e.target.value })}
                  required
                  min="0.001"
                  max="0.999"
                  step="0.001"
                  placeholder="0.001"
                />
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>범위: 0.001% ~ 0.999%</small>
              </div>
              <div className="form-group">
                <label>최대 변동성 (%) *</label>
                <input
                  type="number"
                  value={formData.max_volatility}
                  onChange={(e) => setFormData({ ...formData, max_volatility: e.target.value })}
                  required
                  min="0.001"
                  max="0.999"
                  step="0.001"
                  placeholder="0.1"
                />
                <small style={{ color: '#9ca3af', fontSize: '12px' }}>범위: 0.001% ~ 0.999%</small>
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

