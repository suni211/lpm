import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songs, beatmaps, auth } from '../services/api';
import websocket from '../services/websocket';
import { Song, Beatmap, User } from '../types';
import './Home.css';

const Home: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [songList, setSongList] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [beatmapList, setBeatmapList] = useState<Beatmap[]>([]);
  const [mode, setMode] = useState<'menu' | 'solo' | 'rank'>('menu');
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadSongs();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await auth.getProfile();
      setUser(res.data.user);
      websocket.connect(res.data.user.id);

      websocket.onMatchFound((data: any) => {
        setIsSearchingMatch(false);
        navigate(`/match/${data.matchId}`);
      });
    } catch (error) {
      navigate('/login');
    }
  };

  const loadSongs = async () => {
    try {
      const res = await songs.getAll();
      setSongList(res.data.songs);
    } catch (error) {
      console.error('곡 로드 실패', error);
    }
  };

  const selectSong = async (song: Song) => {
    setSelectedSong(song);
    try {
      const res = await beatmaps.getBySong(song.id);
      setBeatmapList(res.data.beatmaps);
    } catch (error) {
      console.error('비트맵 로드 실패', error);
    }
  };

  const playBeatmap = (beatmapId: number) => {
    navigate(`/play/${beatmapId}`);
  };

  const startRankMatch = () => {
    if (!user) return;
    setMode('rank');
    setIsSearchingMatch(true);
    websocket.joinQueue(user.tier, user.rating);
  };

  const cancelMatch = () => {
    setIsSearchingMatch(false);
    websocket.leaveQueue();
    setMode('menu');
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패', error);
    }
  };

  const getTierColor = (tier: string) => {
    const colors: { [key: string]: string } = {
      'HAMGU': '#00ffff',
      'YETTI': '#00ff00',
      'DAIN': '#ffaa00',
      'KBG': '#ff00ff',
      'MANGO': '#ff0000'
    };
    return colors[tier] || '#ffffff';
  };

  return (
    <div className="home-container">
      <header className="home-header fade-in">
        <div className="header-left">
          <h1 className="home-title">BERRPLE RHYTHM</h1>
        </div>
        {user && (
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{user.display_name || user.username}</span>
              <span 
                className="user-tier" 
                style={{ color: getTierColor(user.tier) }}
              >
                {user.tier}
              </span>
              <span className="user-rating">레이팅: {user.rating}</span>
            </div>
            <div className="header-buttons">
              <button 
                onClick={() => navigate('/leaderboard')} 
                className="header-btn leaderboard-btn"
              >
                리더보드
              </button>
              <button 
                onClick={() => navigate('/admin')} 
                className="header-btn admin-btn"
              >
                관리자
              </button>
              <button 
                onClick={handleLogout} 
                className="header-btn logout-btn"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </header>

      {mode === 'menu' && (
        <div className="menu-container fade-in">
          <div className="menu-title">
            <h2>게임 모드 선택</h2>
            <p>플레이할 모드를 선택하세요</p>
          </div>
          <div className="mode-buttons">
            <button 
              onClick={() => setMode('solo')} 
              className="mode-button solo-button"
            >
              <div className="button-icon">🎵</div>
              <div className="button-text">
                <h3>솔로 플레이</h3>
                <p>혼자서 즐기는 리듬 게임</p>
              </div>
            </button>
            <button 
              onClick={startRankMatch} 
              className="mode-button rank-button"
            >
              <div className="button-icon">⚔️</div>
              <div className="button-text">
                <h3>랭크 매칭</h3>
                <p>다른 플레이어와 대전</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {mode === 'solo' && (
        <div className="solo-container fade-in">
          <button 
            onClick={() => {
              setMode('menu');
              setSelectedSong(null);
              setBeatmapList([]);
            }} 
            className="back-button"
          >
            ← 뒤로가기
          </button>
          <div className="solo-content">
            <div className="song-list">
              <h2 className="section-title">곡 목록</h2>
              <div className="song-items">
                {songList.length === 0 ? (
                  <div className="empty-state">등록된 곡이 없습니다</div>
                ) : (
                  songList.map(song => (
                    <div
                      key={song.id}
                      onClick={() => selectSong(song)}
                      className={`song-item ${selectedSong?.id === song.id ? 'selected' : ''}`}
                    >
                      {song.cover_image && (
                        <img 
                          src={`/uploads/${song.cover_image}`} 
                          alt={song.title}
                          className="song-cover"
                        />
                      )}
                      <div className="song-info">
                        <h3 className="song-title">{song.title}</h3>
                        <p className="song-artist">{song.artist}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="beatmap-list">
              {selectedSong ? (
                <>
                  <h2 className="section-title">{selectedSong.title} - 비트맵</h2>
                  {beatmapList.length === 0 ? (
                    <div className="empty-state">이 곡의 비트맵이 없습니다</div>
                  ) : (
                    <div className="beatmap-items">
                      {beatmapList.map(beatmap => (
                        <div
                          key={beatmap.id}
                          className="beatmap-item"
                        >
                          <div className="beatmap-info">
                            <h3 className="beatmap-difficulty">
                              {beatmap.difficulty} - {beatmap.key_count}키
                            </h3>
                            <p className="beatmap-details">
                              레벨: {beatmap.level} | 노트 수: {beatmap.total_notes}
                            </p>
                          </div>
                          <button 
                            onClick={() => playBeatmap(beatmap.id)}
                            className="play-button"
                          >
                            플레이
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state-large">
                  <div className="empty-icon">🎵</div>
                  <p>곡을 선택해주세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'rank' && isSearchingMatch && (
        <div className="matchmaking-container fade-in">
          <div className="matchmaking-content">
            <h2 className="matchmaking-title">매칭 중...</h2>
            <div className="loading-animation">
              <div className="loading-circle"></div>
              <div className="loading-circle"></div>
              <div className="loading-circle"></div>
            </div>
            <p className="matchmaking-text">상대방을 찾고 있습니다</p>
            <button 
              onClick={cancelMatch} 
              className="cancel-match-button"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
