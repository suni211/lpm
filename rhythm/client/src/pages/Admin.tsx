import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { songs, beatmaps } from '../services/api';
import BeatmapEditor from '../components/BeatmapEditor';
import { Note, Effect, Difficulty } from '../types';
import './Admin.css';

const Admin: React.FC = () => {
  const [step, setStep] = useState<'upload' | 'edit'>('upload');
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
  const navigate = useNavigate();

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
    } catch (error: any) {
      setError(error.response?.data?.error || '비트맵 저장에 실패했습니다.');
      console.error('비트맵 저장 실패', error);
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

  return (
    <div className="admin-container">
      <div className="admin-header fade-in">
        <button 
          onClick={() => navigate('/home')} 
          className="back-button"
        >
          ← 홈으로
        </button>
        <h1 className="admin-title">관리자 - 비트맵 제작</h1>
        <p className="admin-subtitle">새로운 곡과 비트맵을 만들어보세요</p>
      </div>

      {step === 'upload' && (
        <div className="upload-container fade-in">
          <div className="upload-card">
            <h2 className="section-title">곡 업로드</h2>
            
            {error && (
              <div className="error-message slide-in">
                {error}
              </div>
            )}

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
