import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pvpAPI } from '../api/client';

interface LadderRating {
  id: string;
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  winrate: number;
  rank_tier: string;
  username: string;
  display_name: string;
}

interface MyRating {
  rating: number;
  wins: number;
  losses: number;
  winrate: number;
  rank_tier: string;
  highest_rating: number;
}

export default function LadderPage() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<LadderRating[]>([]);
  const [myRating, setMyRating] = useState<MyRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 랭킹은 항상 로드
      const rankingsRes = await pvpAPI.getLadderRankings({ limit: 100 });
      setRankings(rankingsRes.data);

      // 내 레이팅은 로그인한 경우에만 로드
      try {
        const myRatingRes = await pvpAPI.getMyRating();
        setMyRating(myRatingRes.data);
      } catch (ratingError: any) {
        // 로그인하지 않은 경우 무시
        if (ratingError.response?.status !== 401) {
          console.error('My rating error:', ratingError);
        }
      }
    } catch (error: any) {
      console.error('Load data error:', error);
      setError(error.response?.data?.error || error.message || '데이터를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleFindMatch = async () => {
    setSearching(true);
    try {
      const response = await pvpAPI.joinQueue();

      if (response.data.matched) {
        // 매칭 성공!
        navigate(`/pvp/match/${response.data.matchId}`);
      } else {
        // 매칭 대기 중 - 폴링 시작
        const interval = setInterval(async () => {
          const check = await pvpAPI.joinQueue();
          if (check.data.matched) {
            clearInterval(interval);
            navigate(`/pvp/match/${check.data.matchId}`);
          }
        }, 2000); // 2초마다 체크

        // 30초 후 자동 취소
        setTimeout(async () => {
          clearInterval(interval);
          await pvpAPI.leaveQueue();
          setSearching(false);
          alert('매칭 상대를 찾지 못했습니다');
        }, 30000);
      }
    } catch (error: any) {
      console.error('Find match error:', error);
      setSearching(false);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다');
        navigate('/login');
      } else {
        alert(error.response?.data?.error || '매칭 실패');
      }
    }
  };

  const handleCancelSearch = async () => {
    try {
      await pvpAPI.leaveQueue();
      setSearching(false);
    } catch (error) {
      console.error('Cancel search error:', error);
    }
  };

  const getTier = (rating: number): string => {
    if (rating >= 2400) return 'GRANDMASTER';
    if (rating >= 2000) return 'MASTER';
    if (rating >= 1600) return 'DIAMOND';
    if (rating >= 1300) return 'PLATINUM';
    if (rating >= 1100) return 'GOLD';
    if (rating >= 900) return 'SILVER';
    return 'BRONZE';
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      BRONZE: '#cd7f32',
      SILVER: '#c0c0c0',
      GOLD: '#ffd700',
      PLATINUM: '#e5e4e2',
      DIAMOND: '#b9f2ff',
      MASTER: '#ff00ff',
      GRANDMASTER: '#ff6347'
    };
    return colors[tier] || '#fff';
  };

  if (loading) {
    return <div className="card"><h2>로딩 중...</h2></div>;
  }

  return (
    <div className="ladder-page">
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>🏆 랭크 레더 (4K 전용)</h1>

      {/* 에러 메시지 */}
      {error && (
        <div className="card" style={{ marginBottom: '2rem', background: 'rgba(255,74,74,0.2)', border: '1px solid #ff4a4a' }}>
          <h3 style={{ color: '#ff4a4a' }}>오류</h3>
          <p style={{ marginTop: '1rem' }}>{error}</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            로그인이 필요하거나 서버에 문제가 있을 수 있습니다.
          </p>
        </div>
      )}

      {/* 내 레이팅 */}
      {myRating && (
        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(139,69,255,0.1), rgba(74,144,255,0.1))' }}>
          <h2>내 레이팅 정보</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>현재 레이팅</p>
              <h1 style={{ fontSize: '3rem', color: getTierColor(myRating.rank_tier), textShadow: `0 0 20px ${getTierColor(myRating.rank_tier)}` }}>
                {myRating.rating}
              </h1>
              <p style={{ color: getTierColor(myRating.rank_tier), fontWeight: 'bold', fontSize: '1.2rem' }}>
                {myRating.rank_tier}
              </p>
            </div>
            <div>
              <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>전적</p>
              <h2 style={{ fontSize: '2rem' }}>
                <span style={{ color: '#4ade80' }}>{myRating.wins}승</span>{' '}
                <span style={{ color: '#f87171' }}>{myRating.losses}패</span>
              </h2>
              <p style={{ opacity: 0.8 }}>
                승률: <span style={{ color: myRating.winrate >= 50 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                  {Number(myRating.winrate || 0).toFixed(1)}%
                </span>
              </p>
            </div>
            <div>
              <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>최고 레이팅</p>
              <h2 style={{ fontSize: '2rem', color: '#ffd700', textShadow: '0 0 15px #ffd700' }}>
                {myRating.highest_rating}
              </h2>
              <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                {getTier(myRating.highest_rating)}
              </p>
            </div>
            <div>
              <p style={{ opacity: 0.7, marginBottom: '0.5rem' }}>총 경기 수</p>
              <h2 style={{ fontSize: '2rem', color: '#60a5fa' }}>
                {myRating.wins + myRating.losses}
              </h2>
            </div>
          </div>

          <button
            className="btn"
            onClick={searching ? handleCancelSearch : handleFindMatch}
            disabled={searching}
            style={{
              marginTop: '2rem',
              fontSize: '1.2rem',
              padding: '1rem 3rem',
              background: searching ? 'rgba(255,0,0,0.7)' : 'linear-gradient(135deg, #8b45ff, #4a90ff)',
              boxShadow: searching ? undefined : '0 0 20px rgba(139,69,255,0.5)',
              transition: 'all 0.3s ease'
            }}
          >
            {searching ? '🔍 매칭 중... (취소하려면 클릭)' : '⚔️ 랭크 매치 시작'}
          </button>
        </div>
      )}

      {/* 랭킹 리스트 */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem' }}>레더 랭킹 TOP 100</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.3)' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>순위</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>플레이어</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>티어</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>레이팅</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>전적</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>승률</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, index) => (
                <tr
                  key={player.id}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: index < 3 ? 'rgba(255,215,0,0.1)' : undefined
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1.2rem' }}>
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{player.display_name}</div>
                      <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>@{player.username}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ color: getTierColor(player.rank_tier), fontWeight: 'bold' }}>
                      {player.rank_tier}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {player.rating}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {player.wins}W {player.losses}L
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {Number(player.winrate || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
