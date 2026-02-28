import { useState, useEffect } from 'react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './LicoConnectionPage.css';

interface LicoConnectionPageProps {
  userData: any;
  setAuth: (auth: boolean) => void;
}

function LicoConnectionPage({ userData }: LicoConnectionPageProps) {
  const [connection, setConnection] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    stock_account_id: '',
    lico_wallet_address: '',
  });
  const [transferData, setTransferData] = useState({
    stock_account_id: '',
    amount: '',
    direction: 'to' as 'to' | 'from',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [connectionRes, accountsRes] = await Promise.all([
        api.get('/api/lico/connection'),
        api.get('/api/accounts/me'),
      ]);
      
      // 응답 구조 확인 및 디버깅
      console.log('LICO 연결 응답:', connectionRes.data);
      
      // connection과 lico_wallet이 모두 포함된 경우
      if (connectionRes.data.connection) {
        const connectionData = {
          ...connectionRes.data.connection,
          // lico_wallet이 별도로 있는 경우 병합
          lico_wallet: connectionRes.data.connection.lico_wallet || connectionRes.data.lico_wallet || null,
        };
        setConnection(connectionData);
      } else {
        setConnection(null);
      }
      
      setAccounts(accountsRes.data.accounts.filter((a: any) => a.account_type === 'STOCK'));
    } catch (error) {
      console.error('데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/lico/connect', formData);
      setShowForm(false);
      setFormData({ stock_account_id: '', lico_wallet_address: '' });
      fetchData();
      alert('Lico 지갑이 연결되었습니다!');
    } catch (error: any) {
      alert(error.response?.data?.error || '연결 실패');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`${transferData.direction === 'to' ? 'Bank 계좌에서 Lico 지갑으로' : 'Lico 지갑에서 Bank 계좌로'} ${transferData.amount} G를 이체하시겠습니까?`)) {
      return;
    }

    try {
      const endpoint = transferData.direction === 'to' ? '/api/lico/transfer-to-lico' : '/api/lico/transfer-from-lico';
      await api.post(endpoint, {
        stock_account_id: transferData.stock_account_id,
        amount: parseInt(transferData.amount),
      });
      setTransferData({ stock_account_id: '', amount: '', direction: 'to' });
      fetchData();
      alert('이체가 완료되었습니다!');
    } catch (error: any) {
      alert(error.response?.data?.error || '이체 실패');
    }
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
        <div className="lico-connection-container">
          <h1>Lico 거래소 연동</h1>

          {!connection ? (
            <div className="connection-setup">
              <h2>Lico 지갑 연결</h2>
              <p>주식 계좌를 Lico 거래소 지갑과 연결하여 자금을 자유롭게 이동할 수 있습니다.</p>

              {showForm ? (
                <form onSubmit={handleConnect} className="connection-form">
                  <div className="form-group">
                    <label>주식 계좌</label>
                    <select
                      value={formData.stock_account_id}
                      onChange={(e) => setFormData({ ...formData, stock_account_id: e.target.value })}
                      required
                    >
                      <option value="">선택</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} - {acc.balance.toLocaleString()} G
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Lico 지갑 주소</label>
                    <input
                      type="text"
                      value={formData.lico_wallet_address}
                      onChange={(e) => setFormData({ ...formData, lico_wallet_address: e.target.value })}
                      placeholder="Lico 지갑 주소를 입력하세요"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-button">연결</button>
                    <button type="button" onClick={() => setShowForm(false)} className="cancel-button">
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowForm(true)} className="connect-button">
                  지갑 연결하기
                </button>
              )}
            </div>
          ) : (
            <div className="connection-info">
              <div className="info-card">
                <h3>연결된 계좌</h3>
                <div className="info-item">
                  <span>주식 계좌:</span>
                  <strong>{connection.account_number}</strong>
                </div>
                <div className="info-item">
                  <span>Lico 지갑:</span>
                  <strong className="wallet-address">{connection.lico_wallet_address}</strong>
                </div>
                {connection.lico_wallet && (
                  <>
                    <div className="info-item">
                      <span>Lico 잔액:</span>
                      <strong>{connection.lico_wallet.gold_balance?.toLocaleString() || 0} G</strong>
                    </div>
                    <div className="info-item">
                      <span>마인크래프트:</span>
                      <strong>{connection.lico_wallet.minecraft_username}</strong>
                    </div>
                  </>
                )}
              </div>

              <div className="transfer-section">
                <h3>자금 이체</h3>
                <form onSubmit={handleTransfer} className="transfer-form">
                  <div className="form-group">
                    <label>계좌</label>
                    <select
                      value={transferData.stock_account_id}
                      onChange={(e) => setTransferData({ ...transferData, stock_account_id: e.target.value })}
                      required
                    >
                      <option value="">선택</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_number} - {acc.balance.toLocaleString()} G
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>이체 방향</label>
                    <select
                      value={transferData.direction}
                      onChange={(e) => setTransferData({ ...transferData, direction: e.target.value as any })}
                    >
                      <option value="to">Bank → Lico</option>
                      <option value="from">Lico → Bank</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>금액 (G)</label>
                    <input
                      type="number"
                      value={transferData.amount}
                      onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                      required
                      min="1"
                    />
                  </div>

                  <button type="submit" className="submit-button">이체하기</button>
                </form>
              </div>

              <div className="action-buttons">
                <button
                  onClick={() => window.open('https://lico.berrple.com', '_blank')}
                  className="lico-button"
                >
                  📈 Lico 거래소 이동
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LicoConnectionPage;

