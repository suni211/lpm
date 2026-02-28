import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './MemeCoinApplicationPage.css';

interface Application {
  id: string;
  coin_name: string;
  coin_symbol: string;
  coin_description: string;
  initial_supply: number;
  can_creator_trade: boolean;
  trading_lock_days: number;
  is_supply_limited: boolean;
  creator_initial_holding_ecc: number;
  blacklisted_addresses: string;
  calculated_price: number;
  initial_capital_ecc: number;
  listing_fee_ecc: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_comment?: string;
  created_at: string;
}

const MemeCoinApplicationPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'apply' | 'myApplications'>('apply');

  // 신청 폼 상태
  const [coinName, setCoinName] = useState('');
  const [coinSymbol, setCoinSymbol] = useState('');
  const [coinDescription, setCoinDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [initialCapital, setInitialCapital] = useState('500'); // 초기 자본 (최소 500 ECC)
  const [canCreatorTrade, setCanCreatorTrade] = useState(true);
  const [isSupplyLimited, setIsSupplyLimited] = useState(true);
  const [creatorInitialHoldingECC, setCreatorInitialHoldingECC] = useState('0');
  const [blacklistedAddresses, setBlacklistedAddresses] = useState<string[]>([]);
  const [blacklistInput, setBlacklistInput] = useState('');

  // 내 신청 내역
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  // ECC 잔액
  const [eccBalance, setEccBalance] = useState(0);

  useEffect(() => {
    fetchCycBalance();
    if (activeTab === 'myApplications') {
      fetchMyApplications();
    }
  }, [activeTab]);

  const fetchCycBalance = async () => {
    try {
      const response = await api.get('/auth/me');
      const walletAddress = response.data.user.wallet_address;

      const balanceRes = await api.get(`/wallets/${walletAddress}/balance`);
      const eccCoin = balanceRes.data.coins.find((c: any) => c.symbol === 'ECC');
      if (eccCoin) {
        setEccBalance(eccCoin.available_amount);
      }
    } catch (error) {
      console.error('ECC 잔액 조회 실패:', error);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await api.get('/meme-applications/my');
      setMyApplications(response.data.applications);
    } catch (error) {
      console.error('신청 내역 조회 실패:', error);
    }
  };

  const calculatePrice = () => {
    if (!initialSupply || parseFloat(initialSupply) === 0) return 0;
    const capital = parseFloat(initialCapital || '500');
    return capital / parseFloat(initialSupply);
  };

  const calculateListingFee = () => {
    const capital = parseFloat(initialCapital || '500');
    return capital * 0.1; // 10% 수수료
  };

  const calculateTotalRequired = () => {
    const capital = parseFloat(initialCapital || '500');
    return capital + calculateListingFee(); // 자본 + 수수료
  };

  const calculateCreatorHoldingPercent = () => {
    const holding = parseFloat(creatorInitialHoldingECC || '0');
    const supply = parseFloat(initialSupply || '0');
    if (supply === 0) return 0;
    // 보유율 = (보유 ECC / 가격) / 전체 발행량 * 100
    const price = calculatePrice();
    if (price === 0) return 0;
    const holdingCoins = holding / price;
    return (holdingCoins / supply) * 100;
  };

  const addBlacklistAddress = () => {
    if (blacklistInput.trim() && !blacklistedAddresses.includes(blacklistInput.trim())) {
      setBlacklistedAddresses([...blacklistedAddresses, blacklistInput.trim()]);
      setBlacklistInput('');
    }
  };

  const removeBlacklistAddress = (address: string) => {
    setBlacklistedAddresses(blacklistedAddresses.filter(a => a !== address));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coinName || !coinSymbol || !initialSupply) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const supply = parseFloat(initialSupply);
    if (supply <= 0) {
      alert('발행량은 0보다 커야 합니다.');
      return;
    }

    const capital = parseFloat(initialCapital);
    if (capital < 500) {
      alert('최소 초기 자본은 500 ECC 이상이어야 합니다.');
      return;
    }

    const totalRequired = calculateTotalRequired();
    if (eccBalance < totalRequired) {
      alert(`밈 코인 발행에는 ${totalRequired.toLocaleString()} ECC가 필요합니다. (초기 자본 ${capital.toLocaleString()} + 수수료 ${calculateListingFee().toLocaleString()})`);
      return;
    }

    const creatorHolding = parseFloat(creatorInitialHoldingECC || '0');
    if (creatorHolding < 0 || creatorHolding > supply) {
      alert(`제작자 초기 보유량은 0 ~ ${supply.toLocaleString()} ECC 사이여야 합니다.`);
      return;
    }

    const holdingPercent = calculateCreatorHoldingPercent();
    if (holdingPercent > 10) {
      const confirmed = window.confirm(
        `⚠️ 러그풀 위험 경고!\n\n제작자 보유율: ${holdingPercent.toFixed(2)}%\n\n10% 이상의 제작자 보유는 러그풀(rug pull) 위험이 있습니다.\n정말 계속 진행하시겠습니까?`
      );
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      const response = await api.post('/meme-applications', {
        coin_name: coinName,
        coin_symbol: coinSymbol.toUpperCase(),
        coin_description: coinDescription,
        image_url: imageUrl || null,
        initial_supply: parseFloat(initialSupply),
        initial_capital_ecc: parseFloat(initialCapital),
        can_creator_trade: canCreatorTrade,
        is_supply_limited: isSupplyLimited,
        creator_initial_holding_ecc: parseFloat(creatorInitialHoldingECC || '0'),
        blacklisted_addresses: blacklistedAddresses,
      });

      alert(response.data.message);

      // 폼 초기화
      setCoinName('');
      setCoinSymbol('');
      setCoinDescription('');
      setImageUrl('');
      setInitialSupply('');
      setInitialCapital('500');
      setCanCreatorTrade(true);
      setIsSupplyLimited(true);
      setCreatorInitialHoldingECC('0');
      setBlacklistedAddresses([]);
      setBlacklistInput('');

      // 내 신청 내역 탭으로 이동
      setActiveTab('myApplications');
      fetchCycBalance();
    } catch (error: any) {
      alert(error.response?.data?.error || '신청 실패');
    } finally {
      setLoading(false);
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
    <div className="meme-application-page">
      <div className="page-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/')}>
            ← 돌아가기
          </button>
          <h1>💎 밈 코인 발행 신청</h1>
          <div className="cyc-balance">
            보유 ECC: <span>{eccBalance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'apply' ? 'active' : ''}
          onClick={() => setActiveTab('apply')}
        >
          신청하기
        </button>
        <button
          className={activeTab === 'myApplications' ? 'active' : ''}
          onClick={() => setActiveTab('myApplications')}
        >
          내 신청 내역
        </button>
      </div>

      {activeTab === 'apply' ? (
        <div className="application-form-container">
          <div className="info-card">
            <h3>📋 발행 조건 (DEX 스타일)</h3>
            <ul>
              <li>발행량: <strong>자유 설정</strong> (제한 없음)</li>
              <li>초기 자본: <strong>최소 500 ECC 이상</strong> (원하는 만큼 투입 가능)</li>
              <li>발행 수수료: <strong>초기 자본의 10%</strong></li>
              <li>최소 필요 금액: <strong>550 ECC (약 5,577 골드)</strong></li>
              <li>초기 가격: 초기 자본 / 발행량</li>
              <li>제작자 초기 보유량: 0 ~ 발행량 ECC 설정 가능</li>
              <li style={{ color: '#ff3b30', fontWeight: 600 }}>⚠️ 제작자 보유율 10% 이상 시 러그풀 위험 경고</li>
              <li>관리자 승인 후 거래소 상장</li>
              <li>💡 투입 자본이 많을수록 초기 가격이 높아집니다</li>
            </ul>
          </div>

          <form className="application-form" onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>코인 기본 정보</h3>

              <div className="form-group">
                <label>코인 이름 *</label>
                <input
                  type="text"
                  value={coinName}
                  onChange={(e) => setCoinName(e.target.value)}
                  placeholder="예: My Meme Coin"
                  required
                />
              </div>

              <div className="form-group">
                <label>코인 심볼 *</label>
                <input
                  type="text"
                  value={coinSymbol}
                  onChange={(e) => setCoinSymbol(e.target.value.toUpperCase())}
                  placeholder="예: MMC"
                  maxLength={10}
                  required
                />
              </div>

              <div className="form-group">
                <label>설명</label>
                <textarea
                  value={coinDescription}
                  onChange={(e) => setCoinDescription(e.target.value)}
                  placeholder="코인에 대한 설명을 입력하세요..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>이미지 URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>발행 설정</h3>

              <div className="form-group">
                <label>초기 자본 (ECC) *</label>
                <input
                  type="number"
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(e.target.value)}
                  placeholder="최소 500 ECC"
                  step="0.01"
                  min="500"
                  required
                />
                <p className="help-text">
                  💰 투입 금액: {parseFloat(initialCapital || '500').toLocaleString()} ECC (약 {(parseFloat(initialCapital || '500') * 10.14).toLocaleString()} 골드)
                  <br />
                  💸 수수료 (10%): {calculateListingFee().toLocaleString()} ECC
                  <br />
                  📊 총 필요: <strong>{calculateTotalRequired().toLocaleString()} ECC</strong>
                </p>
              </div>

              <div className="form-group">
                <label>초기 발행량 *</label>
                <input
                  type="number"
                  value={initialSupply}
                  onChange={(e) => setInitialSupply(e.target.value)}
                  placeholder="예: 1000000"
                  step="0.00000001"
                  min="0.00000001"
                  required
                />
                {initialSupply && (
                  <p className="calculated-price">
                    계산된 초기 가격: <strong>{calculatePrice().toFixed(8)} ECC/코인</strong>
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>제작자 초기 보유량 (ECC)</label>
                <input
                  type="number"
                  value={creatorInitialHoldingECC}
                  onChange={(e) => setCreatorInitialHoldingECC(e.target.value)}
                  placeholder={`0 ~ ${initialSupply || '발행량'} ECC`}
                  step="0.01"
                  min="0"
                  max={initialSupply || '0'}
                />
                {creatorInitialHoldingECC && parseFloat(creatorInitialHoldingECC) > 0 && initialSupply ? (
                  <div>
                    <p className="help-text">
                      💰 {(parseFloat(creatorInitialHoldingECC) / calculatePrice()).toFixed(2)} 코인 보유
                      ({calculateCreatorHoldingPercent().toFixed(2)}%)
                    </p>
                    {calculateCreatorHoldingPercent() > 10 && (
                      <p className="help-text warning-text">
                        ⚠️ 러그풀 위험: 제작자 보유율이 10%를 초과합니다!
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="help-text">
                    💡 0 ECC = 코인을 보유하지 않음
                  </p>
                )}
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={canCreatorTrade}
                    onChange={(e) => setCanCreatorTrade(e.target.checked)}
                  />
                  <span>생성자가 바로 거래 가능</span>
                </label>
                <p className="help-text">
                  {canCreatorTrade
                    ? '✅ 발행 즉시 거래 가능합니다.'
                    : '⚠️ 발행 후 7일간 거래가 제한됩니다.'}
                </p>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isSupplyLimited}
                    onChange={(e) => setIsSupplyLimited(e.target.checked)}
                  />
                  <span>발행량 제한</span>
                </label>
                <p className="help-text">
                  {isSupplyLimited
                    ? '🔒 추가 발행이 불가능합니다.'
                    : '⚠️ 언제든지 추가 발행 가능 (가격 하락 위험)'}
                </p>
              </div>

              <div className="form-group">
                <label>블랙리스트 지갑 주소 (선택)</label>
                <div className="blacklist-input-group">
                  <input
                    type="text"
                    value={blacklistInput}
                    onChange={(e) => setBlacklistInput(e.target.value)}
                    placeholder="거래 차단할 지갑 주소 입력"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBlacklistAddress())}
                  />
                  <button type="button" onClick={addBlacklistAddress} className="add-button">
                    추가
                  </button>
                </div>
                {blacklistedAddresses.length > 0 && (
                  <div className="blacklist-tags">
                    {blacklistedAddresses.map((addr) => (
                      <span key={addr} className="blacklist-tag">
                        {addr}
                        <button type="button" onClick={() => removeBlacklistAddress(addr)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="help-text">
                  🚫 블랙리스트에 추가된 지갑은 이 코인을 거래할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="form-summary">
              <h3>요약</h3>
              <div className="summary-row">
                <span>초기 자본:</span>
                <span>{parseFloat(initialCapital || '500').toLocaleString()} ECC</span>
              </div>
              <div className="summary-row">
                <span>발행 수수료 (10%):</span>
                <span>{calculateListingFee().toLocaleString()} ECC</span>
              </div>
              <div className="summary-row total">
                <span>총 필요 금액:</span>
                <span>{calculateTotalRequired().toLocaleString()} ECC (약 {(calculateTotalRequired() * 10.14).toLocaleString()} 골드)</span>
              </div>
              <div className="summary-row">
                <span>현재 잔액:</span>
                <span className={eccBalance >= calculateTotalRequired() ? 'sufficient' : 'insufficient'}>
                  {eccBalance.toLocaleString()} ECC
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading || eccBalance < calculateTotalRequired()}
            >
              {loading ? '신청 중...' : '발행 신청하기'}
            </button>

            {eccBalance < calculateTotalRequired() && (
              <p className="error-message">
                ECC 잔액이 부족합니다. 최소 {calculateTotalRequired().toLocaleString()} ECC가 필요합니다.
              </p>
            )}
          </form>
        </div>
      ) : (
        <div className="my-applications">
          <h2>내 신청 내역</h2>
          {myApplications.length === 0 ? (
            <div className="no-applications">
              <p>신청 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="applications-list">
              {myApplications.map((app) => (
                <div key={app.id} className="application-card">
                  <div className="card-header">
                    <div className="coin-info">
                      <h3>{app.coin_name}</h3>
                      <span className="symbol">{app.coin_symbol}</span>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="card-body">
                    <div className="info-row">
                      <span className="label">초기 발행량:</span>
                      <span className="value">{parseFloat(app.initial_supply.toString()).toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">초기 가격:</span>
                      <span className="value">{parseFloat(app.calculated_price.toString()).toFixed(8)} CYC</span>
                    </div>
                    <div className="info-row">
                      <span className="label">생성자 거래:</span>
                      <span className="value">
                        {app.can_creator_trade ? '즉시 가능' : `${app.trading_lock_days}일 후`}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">발행량 제한:</span>
                      <span className="value">{app.is_supply_limited ? '제한됨' : '제한 없음'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">신청일:</span>
                      <span className="value">
                        {new Date(app.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>

                    {app.admin_comment && (
                      <div className="admin-comment">
                        <strong>관리자 코멘트:</strong>
                        <p>{app.admin_comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MemeCoinApplicationPage;
