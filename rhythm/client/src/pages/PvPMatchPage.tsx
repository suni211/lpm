import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pvpAPI } from '../api/client';
import { io, Socket } from 'socket.io-client';

interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_username: string;
  player2_username: string;
  player1_display: string;
  player2_display: string;
  status: string;
  player1_score: number;
  player2_score: number;
  current_round: number;
}

interface SongPool {
  id: string;
  song_id: string;
  beatmap_id: string;
  pool_order: number;
  is_banned: boolean;
  banned_by: string | null;
  title: string;
  artist: string;
  difficulty_name: string;
  difficulty_level: number;
}

export default function PvPMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [songPool, setSongPool] = useState<SongPool[]>([]);
  const [myBannedCount, setMyBannedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (matchId) {
      loadMatch();

      // WebSocket 연결
      const socket = io('http://localhost:3003', {
        withCredentials: true
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        socket.emit('join-match', matchId);
      });

      socket.on('ban-updated', () => {
        loadMatch(); // 밴 업데이트 시 새로고침
      });

      socket.on('game-started', () => {
        loadMatch();
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, [matchId]);

  const loadMatch = async () => {
    try {
      const response = await pvpAPI.getMatch(matchId!);
      setMatch(response.data.match);
      setSongPool(response.data.songPool);

      // 내가 밴한 곡 수 계산
      const myUserId = response.data.match.player1_id; // TODO: 실제 내 userId 가져오기
      const banned = response.data.songPool.filter((s: SongPool) => s.banned_by === myUserId);
      setMyBannedCount(banned.length);

      setLoading(false);
    } catch (error) {
      console.error('Load match error:', error);
      setLoading(false);
    }
  };

  const handleBan = async (songPoolId: string) => {
    if (myBannedCount >= 2) {
      alert('이미 2곡을 밴했습니다');
      return;
    }

    if (match?.status !== 'BAN_PICK') {
      alert('밴픽 단계가 아닙니다');
      return;
    }

    try {
      await pvpAPI.banSong(matchId!, songPoolId);
      loadMatch();

      // 다른 플레이어에게 알림
      socketRef.current?.emit('ban-updated', { matchId });
    } catch (error: any) {
      alert(error.response?.data?.error || '밴 실패');
    }
  };

  if (loading) {
    return <div className="card"><h2>매치 로딩 중...</h2></div>;
  }

  if (!match) {
    return <div className="card"><h2>매치를 찾을 수 없습니다</h2></div>;
  }

  // 밴픽 단계
  if (match.status === 'BAN_PICK') {
    const totalBanned = songPool.filter(s => s.is_banned).length;
    const remainingSongs = songPool.filter(s => !s.is_banned);

    return (
      <div className="pvp-match-page">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>⚔️ 밴픽 단계</h1>

        {/* 플레이어 정보 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div className="card" style={{ flex: 1, marginRight: '1rem', textAlign: 'center' }}>
            <h2 style={{ color: '#4a9eff' }}>{match.player1_display}</h2>
            <p>@{match.player1_username}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 2rem' }}>
            <h1 style={{ fontSize: '3rem' }}>VS</h1>
          </div>
          <div className="card" style={{ flex: 1, marginLeft: '1rem', textAlign: 'center' }}>
            <h2 style={{ color: '#ff4a4a' }}>{match.player2_display}</h2>
            <p>@{match.player2_username}</p>
          </div>
        </div>

        {/* 밴 진행 상황 */}
        <div className="card" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h3>밴 진행 상황: {totalBanned} / 4</h3>
          <p style={{ marginTop: '1rem', opacity: 0.8 }}>
            각 플레이어는 2곡씩 밴할 수 있습니다 (당신: {myBannedCount}/2)
          </p>
          <div style={{
            width: '100%',
            height: '20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            marginTop: '1rem',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(totalBanned / 4) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* 곡 풀 */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem' }}>곡 풀 (4K 전용)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {songPool.map((song) => (
              <div
                key={song.id}
                className="card"
                style={{
                  opacity: song.is_banned ? 0.3 : 1,
                  border: song.is_banned ? '2px solid #ff4a4a' : '1px solid rgba(255,255,255,0.2)',
                  position: 'relative'
                }}
              >
                {song.is_banned && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) rotate(-15deg)',
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#ff4a4a',
                    textShadow: '0 0 10px rgba(255,74,74,0.8)',
                    zIndex: 10
                  }}>
                    BANNED
                  </div>
                )}

                <h3 style={{ color: '#ffd700' }}>{song.title}</h3>
                <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>{song.artist}</p>
                <p style={{ opacity: 0.7, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  {song.difficulty_name} (Lv.{song.difficulty_level})
                </p>

                {!song.is_banned && myBannedCount < 2 && (
                  <button
                    className="btn btn-secondary"
                    style={{
                      marginTop: '1rem',
                      width: '100%',
                      background: 'rgba(255,74,74,0.5)',
                      border: '1px solid #ff4a4a'
                    }}
                    onClick={() => handleBan(song.id)}
                  >
                    🚫 밴하기
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalBanned === 4 && remainingSongs.length === 1 && (
            <div style={{
              marginTop: '2rem',
              padding: '2rem',
              background: 'rgba(255,215,0,0.2)',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <h2 style={{ color: '#ffd700' }}>밴픽 완료!</h2>
              <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
                플레이할 곡: <strong>{remainingSongs[0].title}</strong>
              </p>
              <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                게임이 곧 시작됩니다...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 게임 진행 중
  if (match.status === 'PLAYING') {
    return (
      <div className="pvp-match-page">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          🎮 라운드 {match.current_round} / 3
        </h1>

        <div className="card" style={{ textAlign: 'center' }}>
          <h2>점수</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5rem', marginTop: '2rem' }}>
            <div>
              <h3 style={{ color: '#4a9eff' }}>{match.player1_display}</h3>
              <h1 style={{ fontSize: '4rem', margin: '1rem 0' }}>{match.player1_score}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '3rem' }}>-</div>
            <div>
              <h3 style={{ color: '#ff4a4a' }}>{match.player2_display}</h3>
              <h1 style={{ fontSize: '4rem', margin: '1rem 0' }}>{match.player2_score}</h1>
            </div>
          </div>

          <button
            className="btn"
            style={{ marginTop: '2rem' }}
            onClick={() => {
              // TODO: 게임 화면으로 이동
              alert('게임 화면 구현 중...');
            }}
          >
            게임 시작
          </button>
        </div>
      </div>
    );
  }

  // 완료
  if (match.status === 'COMPLETED') {
    return (
      <div className="pvp-match-page">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>🏆 매치 완료!</h1>

        <div className="card" style={{ textAlign: 'center' }}>
          <h2>최종 결과</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5rem', marginTop: '2rem' }}>
            <div>
              <h3 style={{ color: '#4a9eff' }}>{match.player1_display}</h3>
              <h1 style={{ fontSize: '4rem', margin: '1rem 0' }}>{match.player1_score}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '3rem' }}>-</div>
            <div>
              <h3 style={{ color: '#ff4a4a' }}>{match.player2_display}</h3>
              <h1 style={{ fontSize: '4rem', margin: '1rem 0' }}>{match.player2_score}</h1>
            </div>
          </div>

          <button
            className="btn"
            style={{ marginTop: '2rem' }}
            onClick={() => navigate('/ladder')}
          >
            레더로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
