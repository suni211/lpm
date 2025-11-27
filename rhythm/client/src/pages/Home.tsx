import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songs, beatmaps, auth } from '../services/api';
import websocket from '../services/websocket';
import { Song, Beatmap, User } from '../types';

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
      console.error('Failed to load songs', error);
    }
  };

  const selectSong = async (song: Song) => {
    setSelectedSong(song);
    try {
      const res = await beatmaps.getBySong(song.id);
      setBeatmapList(res.data.beatmaps);
    } catch (error) {
      console.error('Failed to load beatmaps', error);
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

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1>Berrple Rhythm</h1>
        {user && (
          <div>
            <span>{user.display_name} | {user.tier} | Rating: {user.rating}</span>
            <button onClick={() => navigate('/admin')} style={{ marginLeft: '20px', padding: '10px', background: '#ff00ff' }}>Admin</button>
            <button onClick={() => navigate('/leaderboard')} style={{ marginLeft: '10px', padding: '10px', background: '#00ff00' }}>Leaderboard</button>
          </div>
        )}
      </header>

      {mode === 'menu' && (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <button onClick={() => setMode('solo')} style={{ padding: '30px 60px', fontSize: '24px', margin: '20px', background: '#00ffff', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            SOLO
          </button>
          <button onClick={startRankMatch} style={{ padding: '30px 60px', fontSize: '24px', margin: '20px', background: '#ff00ff', color: '#000', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
            RANK
          </button>
        </div>
      )}

      {mode === 'solo' && (
        <div>
          <button onClick={() => setMode('menu')} style={{ marginBottom: '20px', padding: '10px 20px', background: '#666', border: 'none', color: '#fff', cursor: 'pointer' }}>
            Back
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div>
              <h2>Songs</h2>
              {songList.map(song => (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  style={{ padding: '15px', margin: '10px 0', background: selectedSong?.id === song.id ? '#333' : '#1a1a1a', cursor: 'pointer', borderRadius: '5px' }}
                >
                  <h3>{song.title}</h3>
                  <p>{song.artist}</p>
                </div>
              ))}
            </div>
            <div>
              {selectedSong && (
                <>
                  <h2>Beatmaps - {selectedSong.title}</h2>
                  {beatmapList.map(beatmap => (
                    <div
                      key={beatmap.id}
                      onClick={() => playBeatmap(beatmap.id)}
                      style={{ padding: '15px', margin: '10px 0', background: '#1a1a1a', cursor: 'pointer', borderRadius: '5px', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <div>
                        <h3>{beatmap.difficulty} - {beatmap.key_count}K</h3>
                        <p>Level: {beatmap.level} | Notes: {beatmap.total_notes}</p>
                      </div>
                      <button style={{ padding: '10px 20px', background: '#00ffff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        Play
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'rank' && isSearchingMatch && (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Searching for match...</h2>
          <div style={{ fontSize: '48px', margin: '40px 0' }}>⏳</div>
          <button onClick={cancelMatch} style={{ padding: '15px 30px', background: '#ff0000', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
