import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songsAPI } from '../api/client';
import type { Song } from '../types';

export default function SongsPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedKeyCount, setSelectedKeyCount] = useState('all');
  const [sortBy, setSortBy] = useState<'title' | 'bpm' | 'duration' | 'difficulty'>('title');

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const response = await songsAPI.getAll();
      setSongs(response.data);
      setFilteredSongs(response.data);
    } catch (err: any) {
      setError(err.message || '곡 목록을 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  // 필터링 및 정렬
  useEffect(() => {
    let result = [...songs];

    // 검색 필터
    if (searchQuery) {
      result = result.filter(song =>
        song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 장르 필터
    if (selectedGenre !== 'all') {
      result = result.filter(song => song.genre === selectedGenre);
    }

    // 키 개수 필터 (비트맵 기준)
    if (selectedKeyCount !== 'all') {
      result = result.filter(song =>
        song.beatmaps?.some(beatmap => beatmap.key_count === selectedKeyCount)
      );
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'bpm':
          return b.bpm - a.bpm;
        case 'duration':
          return b.duration - a.duration;
        case 'difficulty':
          // 최고 난이도 기준 정렬
          const aMaxDiff = Math.max(...(a.beatmaps?.map(b => b.difficulty_level) || [0]));
          const bMaxDiff = Math.max(...(b.beatmaps?.map(b => b.difficulty_level) || [0]));
          return bMaxDiff - aMaxDiff;
        default:
          return 0;
      }
    });

    setFilteredSongs(result);
  }, [songs, searchQuery, selectedGenre, selectedKeyCount, sortBy]);

  // 장르 목록 추출
  const genres = Array.from(new Set(songs.map(song => song.genre).filter(Boolean)));

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

      {/* 필터 및 검색 */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* 검색 */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              검색
            </label>
            <input
              type="text"
              placeholder="곡명, 아티스트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* 장르 필터 */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              장르
            </label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">전체</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          {/* 키 개수 필터 */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              키 개수
            </label>
            <select
              value={selectedKeyCount}
              onChange={(e) => setSelectedKeyCount(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">전체</option>
              <option value="4">4K</option>
              <option value="5">5K</option>
              <option value="6">6K</option>
              <option value="8">8K</option>
            </select>
          </div>

          {/* 정렬 */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
              정렬
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '5px',
                color: '#fff',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="title">제목순</option>
              <option value="bpm">BPM 높은순</option>
              <option value="duration">길이 긴순</option>
              <option value="difficulty">난이도 높은순</option>
            </select>
          </div>
        </div>

        {/* 결과 개수 */}
        <div style={{ marginTop: '1rem', opacity: 0.7, fontSize: '0.9rem' }}>
          전체 {songs.length}곡 중 {filteredSongs.length}곡 표시
        </div>
      </div>

      {filteredSongs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>검색 결과가 없습니다</h2>
          <p style={{ opacity: 0.8 }}>
            다른 필터 조건을 시도해보세요
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {filteredSongs.map((song) => (
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
      )}
    </div>
  );
}
