import { useState, useEffect } from 'react';
import { adminAPI } from '../api/client';
import type { Song } from '../types';
import BeatmapRecorder from '../components/BeatmapRecorder';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'songs' | 'upload' | 'beatmap'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Songs
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Upload Song
  const [uploadForm, setUploadForm] = useState({
    title: '',
    artist: '',
    bpm: '',
    duration: '',
    previewStart: '0',
    genre: '',
    description: ''
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bgaFile, setBgaFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Beatmap
  const [beatmapForm, setBeatmapForm] = useState({
    difficultyName: 'NORMAL',
    difficultyLevel: '5',
    keyCount: '4' as '4' | '5' | '6' | '8',
    noteSpeed: '5.0',
    notesData: '[]'
  });
  const [beatmapLoading, setBeatmapLoading] = useState(false);
  const [isRecorderMode, setIsRecorderMode] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = () => {
    // 간단한 세션 체크 (실제로는 API 호출로 확인)
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    setIsLoggedIn(isAdmin);
    if (isAdmin) {
      setActiveTab('songs');
      loadSongs();
    }
  };

  const loadSongs = async () => {
    try {
      const response = await adminAPI.getAllSongs();
      setSongs(response.data);
    } catch (error) {
      console.error('곡 목록 로드 실패:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      await adminAPI.login(loginForm);
      sessionStorage.setItem('isAdmin', 'true');
      setIsLoggedIn(true);
      setActiveTab('songs');
      loadSongs();
    } catch (error: any) {
      setLoginError(error.response?.data?.error || '로그인 실패');
    }
  };

  const handleUploadSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);

    try {
      if (!audioFile) {
        alert('오디오 파일을 선택해주세요');
        return;
      }

      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('artist', uploadForm.artist);
      formData.append('bpm', uploadForm.bpm);
      formData.append('duration', uploadForm.duration);
      formData.append('previewStart', uploadForm.previewStart);
      formData.append('genre', uploadForm.genre);
      formData.append('description', uploadForm.description);
      formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (bgaFile) formData.append('bga', bgaFile);

      await adminAPI.createSong(formData);
      alert('곡 업로드 성공!');
      setUploadForm({
        title: '',
        artist: '',
        bpm: '',
        duration: '',
        previewStart: '0',
        genre: '',
        description: ''
      });
      setAudioFile(null);
      setCoverFile(null);
      setBgaFile(null);
      loadSongs();
      setActiveTab('songs');
    } catch (error: any) {
      alert('업로드 실패: ' + (error.response?.data?.error || error.message));
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCreateBeatmap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBeatmapLoading(true);

    try {
      if (!selectedSong) {
        alert('곡을 먼저 선택해주세요');
        return;
      }

      let notesData;
      try {
        notesData = JSON.parse(beatmapForm.notesData);
      } catch {
        alert('노트 데이터 JSON 형식이 올바르지 않습니다');
        return;
      }

      await adminAPI.createBeatmap({
        songId: selectedSong.id,
        difficultyName: beatmapForm.difficultyName,
        difficultyLevel: parseInt(beatmapForm.difficultyLevel),
        keyCount: beatmapForm.keyCount,
        noteSpeed: parseFloat(beatmapForm.noteSpeed),
        notesData
      });

      alert('비트맵 생성 성공!');
      setBeatmapForm({
        difficultyName: 'NORMAL',
        difficultyLevel: '5',
        keyCount: '4',
        noteSpeed: '5.0',
        notesData: '[]'
      });
    } catch (error: any) {
      alert('비트맵 생성 실패: ' + (error.response?.data?.error || error.message));
    } finally {
      setBeatmapLoading(false);
    }
  };

  const generateSampleNotes = () => {
    const sample = [
      { time: 1000, lane: 0, type: 'normal' },
      { time: 1500, lane: 1, type: 'normal' },
      { time: 2000, lane: 2, type: 'normal' },
      { time: 2500, lane: 3, type: 'normal' },
      { time: 3000, lane: 0, type: 'long', duration: 500 },
      { time: 4000, lane: 1, type: 'normal' }
    ];
    setBeatmapForm({ ...beatmapForm, notesData: JSON.stringify(sample, null, 2) });
  };

  const handleRecordedNotes = async (notes: any[]) => {
    setBeatmapForm({ ...beatmapForm, notesData: JSON.stringify(notes, null, 2) });
    setIsRecorderMode(false);
    alert('녹화된 노트가 저장되었습니다! 비트맵 생성 탭에서 확인하세요.');
  };

  // Show recorder if in recorder mode
  if (isRecorderMode && selectedSong) {
    return (
      <BeatmapRecorder
        song={selectedSong}
        keyCount={parseInt(beatmapForm.keyCount) as 4 | 5 | 6 | 8}
        onSave={handleRecordedNotes}
        onCancel={() => setIsRecorderMode(false)}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="admin-page">
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>관리자 로그인</h1>

          {loginError && (
            <div style={{
              background: 'rgba(255,107,107,0.2)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              border: '1px solid rgba(255,107,107,0.5)'
            }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>관리자 아이디</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
                placeholder="admin"
              />
            </div>

            <div className="form-group">
              <label>비밀번호</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                placeholder="admin123"
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }}>
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1 style={{ marginBottom: '2rem' }}>관리자 대시보드</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className={activeTab === 'songs' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setActiveTab('songs')}
        >
          곡 목록
        </button>
        <button
          className={activeTab === 'upload' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setActiveTab('upload')}
        >
          곡 업로드
        </button>
        <button
          className={activeTab === 'beatmap' ? 'btn' : 'btn btn-secondary'}
          onClick={() => setActiveTab('beatmap')}
          disabled={!selectedSong}
        >
          비트맵 생성 {selectedSong && `(${selectedSong.title})`}
        </button>
      </div>

      {/* Songs Tab */}
      {activeTab === 'songs' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>곡 목록</h2>
          {songs.length === 0 ? (
            <p style={{ opacity: 0.7 }}>등록된 곡이 없습니다. 먼저 곡을 업로드하세요.</p>
          ) : (
            <div className="grid grid-2">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: selectedSong?.id === song.id ? '2px solid #ffd700' : '1px solid rgba(255,255,255,0.2)'
                  }}
                  onClick={() => setSelectedSong(song)}
                >
                  <h3>{song.title}</h3>
                  <p style={{ opacity: 0.8 }}>아티스트: {song.artist}</p>
                  <p style={{ opacity: 0.7 }}>BPM: {song.bpm} | 길이: {song.duration}초</p>
                  <p style={{ opacity: 0.7 }}>상태: {song.status}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Song Tab */}
      {activeTab === 'upload' && (
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>곡 업로드</h2>
          <form onSubmit={handleUploadSong}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>곡 제목 *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                  placeholder="곡 제목"
                />
              </div>

              <div className="form-group">
                <label>아티스트 *</label>
                <input
                  type="text"
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  required
                  placeholder="아티스트 이름"
                />
              </div>

              <div className="form-group">
                <label>BPM *</label>
                <input
                  type="number"
                  step="0.01"
                  value={uploadForm.bpm}
                  onChange={(e) => setUploadForm({ ...uploadForm, bpm: e.target.value })}
                  required
                  placeholder="140.00"
                />
              </div>

              <div className="form-group">
                <label>길이 (초) *</label>
                <input
                  type="number"
                  value={uploadForm.duration}
                  onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                  required
                  placeholder="120"
                />
              </div>

              <div className="form-group">
                <label>미리듣기 시작 (초)</label>
                <input
                  type="number"
                  value={uploadForm.previewStart}
                  onChange={(e) => setUploadForm({ ...uploadForm, previewStart: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label>장르</label>
                <input
                  type="text"
                  value={uploadForm.genre}
                  onChange={(e) => setUploadForm({ ...uploadForm, genre: e.target.value })}
                  placeholder="Electronic"
                />
              </div>
            </div>

            <div className="form-group">
              <label>설명</label>
              <textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="곡 설명"
                rows={3}
              />
            </div>

            <div className="grid grid-3">
              <div className="form-group">
                <label>오디오 파일 * (mp3, wav)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              <div className="form-group">
                <label>커버 이미지 (jpg, png)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="form-group">
                <label>BGA 비디오 (mp4, webm)</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setBgaFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={uploadLoading}>
              {uploadLoading ? '업로드 중...' : '곡 업로드'}
            </button>
          </form>
        </div>
      )}

      {/* Beatmap Tab */}
      {activeTab === 'beatmap' && selectedSong && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>비트맵 생성: {selectedSong.title}</h2>
            <button
              type="button"
              className="btn"
              onClick={() => setIsRecorderMode(true)}
              style={{ background: '#ff4757' }}
            >
              🎹 녹화 모드로 생성
            </button>
          </div>
          <form onSubmit={handleCreateBeatmap}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>난이도 이름</label>
                <select
                  value={beatmapForm.difficultyName}
                  onChange={(e) => setBeatmapForm({ ...beatmapForm, difficultyName: e.target.value })}
                >
                  <option value="EASY">EASY</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HARD">HARD</option>
                  <option value="MAXIMUM">MAXIMUM</option>
                </select>
              </div>

              <div className="form-group">
                <label>난이도 레벨 (1-15)</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={beatmapForm.difficultyLevel}
                  onChange={(e) => setBeatmapForm({ ...beatmapForm, difficultyLevel: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>키 수</label>
                <select
                  value={beatmapForm.keyCount}
                  onChange={(e) => setBeatmapForm({ ...beatmapForm, keyCount: e.target.value as any })}
                >
                  <option value="4">4K</option>
                  <option value="5">5K</option>
                  <option value="6">6K</option>
                  <option value="8">8K</option>
                </select>
              </div>

              <div className="form-group">
                <label>노트 속도</label>
                <input
                  type="number"
                  step="0.1"
                  value={beatmapForm.noteSpeed}
                  onChange={(e) => setBeatmapForm({ ...beatmapForm, noteSpeed: e.target.value })}
                  placeholder="5.0"
                />
              </div>
            </div>

            <div className="form-group">
              <label>노트 데이터 (JSON)</label>
              <div style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={generateSampleNotes}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  샘플 노트 생성
                </button>
              </div>
              <textarea
                value={beatmapForm.notesData}
                onChange={(e) => setBeatmapForm({ ...beatmapForm, notesData: e.target.value })}
                required
                rows={15}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                placeholder='[{"time": 1000, "lane": 0, "type": "normal"}, ...]'
              />
              <p style={{ opacity: 0.7, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                형식: time (밀리초), lane (0부터 시작), type ("normal" 또는 "long"), duration (롱 노트만)
              </p>
            </div>

            <button type="submit" className="btn" style={{ width: '100%' }} disabled={beatmapLoading}>
              {beatmapLoading ? '생성 중...' : '비트맵 생성'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
