import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { songs, beatmaps, auth } from '../services/api';
import BeatmapEditor from '../components/BeatmapEditor';
import { Note, Effect, Difficulty, Song, User } from '../types';
import './Admin.css';

const Admin: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState<'upload' | 'edit' | 'manage'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedCover, setUploadedCover] = useState<File | null>(null);
  const [songId, setSongId] = useState<number | null>(null);
  const [songData, setSongData] = useState({ title: '', artist: '', bpm: 120, duration: 0 });
  const [beatmapSettings, setBeatmapSettings] = useState({
    difficulty: Difficulty.HAMGU,
    keyCount: 4,
    level: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [songList, setSongList] = useState<Song[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    loadSongs();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const res = await auth.getProfile();
      const userData = res.data.user;
      setUser(userData);
      
      if (!userData.is_admin) {
        alert('관리자 권한이 필요합니다.');
        navigate('/home');
      }
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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setError('오디오 파일을 선택해주세요.');
      return;
    }

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('audio', uploadedFile);
    if (uploadedCover) formData.append('cover', uploadedCover);
    formData.append('title', songData.title);
    formData.append('artist', songData.artist);
    formData.append('duration', String(songData.duration));
    formData.append('bpm', String(songData.bpm));

    try {
      const res = await songs.create(formData);
      setSongId(res.data.song_id);
      setStep('edit');
    } catch (error: any) {
      setError(error.response?.data?.error || '곡 업로드에 실패했습니다.');
      console.error('곡 업로드 실패', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBeatmap = async (notes: Note[], effects: Effect[], _bpm: number) => {
    if (!songId) return;

    setLoading(true);
    try {
      await beatmaps.create({
        song_id: songId,
        difficulty: beatmapSettings.difficulty,
        key_count: beatmapSettings.keyCount,
        note_data: JSON.stringify(notes),
        effect_data: JSON.stringify(effects),
        level: beatmapSettings.level
      });

      alert('비트맵이 성공적으로 저장되었습니다!');
      setStep('upload');
      setSongId(null);
      setUploadedFile(null);
      setUploadedCover(null);
      setSongData({ title: '', artist: '', bpm: 120, duration: 0 });
      loadSongs();
    } catch (error: any) {
      setError(error.response?.data?.error || '비트맵 저장에 실패했습니다.');
      console.error('비트맵 저장 실패', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId: number, songTitle: string) => {
    if (!window.confirm(`"${songTitle}" 곡을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setLoading(true);
    try {
      await songs.delete(songId);
      alert('곡이 삭제되었습니다.');
      loadSongs();
    } catch (error: any) {
      setError(error.response?.data?.error || '곡 삭제에 실패했습니다.');
      console.error('곡 삭제 실패', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyName = (difficulty: Difficulty) => {
    const names: { [key: string]: string } = {
      [Difficulty.HAMGU]: '함구 (쉬움)',
      [Difficulty.YETTI]: '예티',
      [Difficulty.DAIN]: '다인',
      [Difficulty.KBG]: 'KBG',
      [Difficulty.MANGO]: '망고 (어려움)'
    };
    return names[difficulty] || difficulty;
  };

  if (!user || !user.is_admin) {
    return (
      <div className="admin-container">
        <div className="access-denied">
          <h2>접근 권한이 없습니다</h2>
          <p>관리자 권한이 필요합니다.</p>
          <button onClick={() => navigate('/home')} className="back-button">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header fade-in">
        <button 
          onClick={() => navigate('/home')} 
          className="back-button"
        >
          ← 홈으로
        </button>
        <h1 className="admin-title">관리자 패널</h1>
        <p className="admin-subtitle">곡과 비트맵을 관리하세요</p>
      </div>

      <div className="admin-tabs">
        <button 
          onClick={() => setStep('upload')}
          className={`tab-button ${step === 'upload' ? 'active' : ''}`}
        >
          곡 업로드
        </button>
        <button 
          onClick={() => setStep('manage')}
          className={`tab-button ${step === 'manage' ? 'active' : ''}`}
        >
          곡 관리
        </button>
      </div>

      {error && (
        <div className="error-message slide-in">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="upload-container fade-in">
          <div className="upload-card">
            <h2 className="section-title">곡 업로드</h2>

            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="form-group">
                <label className="form-label">곡 제목 *</label>
                <input
                  type="text"
                  value={songData.title}
                  onChange={(e) => setSongData({ ...songData, title: e.target.value })}
                  className="form-input"
                  required
                  placeholder="곡 제목을 입력하세요"
                />
              </div>

              <div className="form-group">
                <label className="form-label">아티스트 *</label>
                <input
                  type="text"
                  value={songData.artist}
                  onChange={(e) => setSongData({ ...songData, artist: e.target.value })}
                  className="form-input"
                  required
                  placeholder="아티스트 이름을 입력하세요"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">BPM *</label>
                  <input
                    type="number"
                    value={songData.bpm}
                    onChange={(e) => setSongData({ ...songData, bpm: Number(e.target.value) })}
                    className="form-input"
                    required
                    min="60"
                    max="300"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">재생 시간 (초) *</label>
                  <input
                    type="number"
                    value={songData.duration}
                    onChange={(e) => setSongData({ ...songData, duration: Number(e.target.value) })}
                    className="form-input"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">오디오 파일 *</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="file-input"
                    required
                  />
                  {uploadedFile && (
                    <div className="file-name">{uploadedFile.name}</div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">커버 이미지 (선택사항)</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUploadedCover(e.target.files?.[0] || null)}
                    className="file-input"
                  />
                  {uploadedCover && (
                    <div className="file-name">{uploadedCover.name}</div>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">난이도</label>
                  <select
                    value={beatmapSettings.difficulty}
                    onChange={(e) => setBeatmapSettings({ ...beatmapSettings, difficulty: e.target.value as Difficulty })}
                    className="form-select"
                  >
                    <option value={Difficulty.HAMGU}>{getDifficultyName(Difficulty.HAMGU)}</option>
                    <option value={Difficulty.YETTI}>{getDifficultyName(Difficulty.YETTI)}</option>
                    <option value={Difficulty.DAIN}>{getDifficultyName(Difficulty.DAIN)}</option>
                    <option value={Difficulty.KBG}>{getDifficultyName(Difficulty.KBG)}</option>
                    <option value={Difficulty.MANGO}>{getDifficultyName(Difficulty.MANGO)}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">키 개수</label>
                  <select
                    value={beatmapSettings.keyCount}
                    onChange={(e) => setBeatmapSettings({ ...beatmapSettings, keyCount: Number(e.target.value) })}
                    className="form-select"
                  >
                    <option value={4}>4키</option>
                    <option value={5}>5키</option>
                    <option value={6}>6키</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    업로드 중...
                  </>
                ) : (
                  '업로드 및 에디터로 이동'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {step === 'manage' && (
        <div className="manage-container fade-in">
          <div className="manage-card">
            <h2 className="section-title">곡 관리</h2>
            {songList.length === 0 ? (
              <div className="empty-state">
                등록된 곡이 없습니다
              </div>
            ) : (
              <div className="song-list-admin">
                {songList.map(song => (
                  <div key={song.id} className="song-item-admin">
                    {song.cover_image && (
                      <img 
                        src={song.cover_image?.startsWith('/') ? song.cover_image : `/uploads/${song.cover_image}`} 
                        alt={song.title}
                        className="song-cover-admin"
                      />
                    )}
                    <div className="song-info-admin">
                      <h3 className="song-title-admin">{song.title}</h3>
                      <p className="song-artist-admin">{song.artist}</p>
                      <p className="song-meta">BPM: {song.bpm} | 길이: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</p>
                    </div>
                    <div className="song-actions">
                      <button
                        onClick={() => handleDeleteSong(song.id, song.title)}
                        className="delete-button"
                        disabled={loading}
                      >
                        🗑️ 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'edit' && uploadedFile && (
        <div className="editor-container fade-in">
          <BeatmapEditor
            songFile={URL.createObjectURL(uploadedFile)}
            bpm={songData.bpm}
            keyCount={beatmapSettings.keyCount}
            onSave={handleSaveBeatmap}
          />
        </div>
      )}
    </div>
  );
};

export default Admin;
