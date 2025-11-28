import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songsAPI } from '../api/client';
import type { Song } from '../types';

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const response = await songsAPI.getAll();
      setSongs(response.data);
    } catch (err: any) {
      setError(err.message || '곡 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card"><h2>곡 목록 로딩 중...</h2></div>;
  }

  if (error) {
    return <div className="card"><h2 style={{ color: '#ff6b6b' }}>오류: {error}</h2></div>;
  }

  if (songs.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>등록된 곡이 없습니다</h2>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>
          관리자가 먼저 곡을 업로드해야 합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="songs-page">
      <h1 style={{ marginBottom: '2rem' }}>곡 목록</h1>

      <div className="grid grid-2">
        {songs.map((song) => (
          <div key={song.id} className="card song-card">
            {song.cover_image_url && (
              <img
                src={song.cover_image_url}
                alt={song.title}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                  marginBottom: '1rem'
                }}
              />
            )}
            <h3>{song.title}</h3>
            <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>
              아티스트: {song.artist}
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem',
              fontSize: '0.9rem',
              opacity: 0.7
            }}>
              <span>BPM: {song.bpm}</span>
              <span>길이: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
              <span>장르: {song.genre || 'N/A'}</span>
            </div>
            {song.beatmap_count !== undefined && (
              <p style={{ marginTop: '1rem', opacity: 0.8 }}>
                {song.beatmap_count}개의 비트맵 사용 가능
              </p>
            )}
            <button
              className="btn"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => navigate(`/game/${song.id}`)}
            >
              플레이
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
