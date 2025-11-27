import React, { useState } from 'react';
import { songs, beatmaps } from '../services/api';
import BeatmapEditor from '../components/BeatmapEditor';
import { Note, Effect, Difficulty } from '../types';

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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) return;

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
    } catch (error) {
      console.error('Failed to upload song', error);
    }
  };

  const handleSaveBeatmap = async (notes: Note[], effects: Effect[], _bpm: number) => {
    if (!songId) return;

    try {
      await beatmaps.create({
        song_id: songId,
        difficulty: beatmapSettings.difficulty,
        key_count: beatmapSettings.keyCount,
        note_data: JSON.stringify(notes),
        effect_data: JSON.stringify(effects),
        level: beatmapSettings.level
      });

      alert('Beatmap saved successfully!');
      setStep('upload');
      setSongId(null);
      setUploadedFile(null);
      setUploadedCover(null);
    } catch (error) {
      console.error('Failed to save beatmap', error);
    }
  };

  return (
    <div style={{ background: '#000', color: '#fff', minHeight: '100vh', padding: '20px' }}>
      <h1>Admin - Beatmap Creator</h1>

      {step === 'upload' && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2>Upload Song</h2>
          <form onSubmit={handleFileUpload}>
            <div style={{ margin: '20px 0' }}>
              <label>Title:</label>
              <input
                type="text"
                value={songData.title}
                onChange={(e) => setSongData({ ...songData, title: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Artist:</label>
              <input
                type="text"
                value={songData.artist}
                onChange={(e) => setSongData({ ...songData, artist: e.target.value })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>BPM:</label>
              <input
                type="number"
                value={songData.bpm}
                onChange={(e) => setSongData({ ...songData, bpm: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Duration (seconds):</label>
              <input
                type="number"
                value={songData.duration}
                onChange={(e) => setSongData({ ...songData, duration: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Audio File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Cover Image (optional):</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadedCover(e.target.files?.[0] || null)}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              />
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Difficulty:</label>
              <select
                value={beatmapSettings.difficulty}
                onChange={(e) => setBeatmapSettings({ ...beatmapSettings, difficulty: e.target.value as Difficulty })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              >
                <option value={Difficulty.HAMGU}>HAMGU</option>
                <option value={Difficulty.YETTI}>YETTI</option>
                <option value={Difficulty.DAIN}>DAIN</option>
                <option value={Difficulty.KBG}>KBG</option>
                <option value={Difficulty.MANGO}>MANGO</option>
              </select>
            </div>
            <div style={{ margin: '20px 0' }}>
              <label>Key Count:</label>
              <select
                value={beatmapSettings.keyCount}
                onChange={(e) => setBeatmapSettings({ ...beatmapSettings, keyCount: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
              >
                <option value={4}>4 Keys</option>
                <option value={5}>5 Keys</option>
                <option value={6}>6 Keys</option>
              </select>
            </div>
            <button type="submit" style={{ width: '100%', padding: '15px', background: '#00ffff', color: '#000', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
              Upload & Continue to Editor
            </button>
          </form>
        </div>
      )}

      {step === 'edit' && uploadedFile && (
        <BeatmapEditor
          songFile={URL.createObjectURL(uploadedFile)}
          bpm={songData.bpm}
          keyCount={beatmapSettings.keyCount}
          onSave={handleSaveBeatmap}
        />
      )}
    </div>
  );
};

export default Admin;
