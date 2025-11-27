import React, { useRef, useState, useEffect } from 'react';
import { Note, Effect, NoteType, EffectType } from '../types';
import { Howl } from 'howler';

interface BeatmapEditorProps {
  songFile: string;
  bpm?: number;
  keyCount: number;
  onSave: (notes: Note[], effects: Effect[], bpm: number) => void;
}

const BeatmapEditor: React.FC<BeatmapEditorProps> = ({ songFile, bpm: initialBpm, keyCount, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<Howl | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(initialBpm || 120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gridSnap, setGridSnap] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'note' | 'long' | 'slide' | 'effect'>('note');
  const [selectedEffect, setSelectedEffect] = useState<EffectType>(EffectType.ROTATE);

  useEffect(() => {
    audioRef.current = new Howl({
      src: [songFile],
      html5: true,
      onload: () => console.log('Audio loaded for editor'),
      onend: () => setIsPlaying(false)
    });

    // BPM 자동 감지 (기본 구현)
    if (!initialBpm) {
      detectBPM();
    }

    return () => {
      audioRef.current?.unload();
    };
  }, [songFile]);

  const detectBPM = async () => {
    // 간단한 BPM 감지 로직 (실제로는 Web Audio API 사용)
    setBpm(120); // 기본값
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const laneWidth = canvas.width / keyCount;
    const lane = Math.floor(x / laneWidth);

    let timestamp = currentTime;
    if (gridSnap) {
      const beatDuration = (60 / bpm) * 1000;
      timestamp = Math.round(currentTime / beatDuration) * beatDuration;
    }

    if (selectedTool === 'note' || selectedTool === 'long' || selectedTool === 'slide') {
      const newNote: Note = {
        id: `note-${Date.now()}`,
        type: selectedTool === 'long' ? NoteType.LONG : selectedTool === 'slide' ? NoteType.SLIDE : NoteType.NORMAL,
        lane,
        timestamp,
        duration: selectedTool === 'long' ? 500 : undefined,
        slideDirection: selectedTool === 'slide' ? 'right' : undefined
      };
      setNotes([...notes, newNote]);
    } else if (selectedTool === 'effect') {
      const newEffect: Effect = {
        id: `effect-${Date.now()}`,
        type: selectedEffect,
        timestamp,
        duration: 1000,
        intensity: 50
      };
      setEffects([...effects, newEffect]);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    } else {
      audioRef.current?.play();
      updateCurrentTime();
    }
    setIsPlaying(!isPlaying);
  };

  const updateCurrentTime = () => {
    if (audioRef.current && isPlaying) {
      setCurrentTime((audioRef.current.seek() as number) * 1000);
      requestAnimationFrame(updateCurrentTime);
    }
  };

  const handleSave = () => {
    onSave(notes, effects, bpm);
  };

  useEffect(() => {
    renderEditor();
  }, [notes, effects, currentTime, keyCount]);

  const renderEditor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // 레인 그리기
    const laneWidth = width / keyCount;
    for (let i = 0; i <= keyCount; i++) {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    // 타임라인 그리드
    const beatDuration = (60 / bpm) * 1000;
    const pixelsPerMs = width / 10000;

    for (let t = 0; t < 100000; t += beatDuration) {
      const x = (t - currentTime) * pixelsPerMs + width / 2;
      if (x < 0 || x > width) continue;

      ctx.strokeStyle = t % (beatDuration * 4) === 0 ? '#666' : '#333';
      ctx.lineWidth = t % (beatDuration * 4) === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 노트 그리기
    notes.forEach(note => {
      const x = note.lane * laneWidth;
      const noteX = (note.timestamp - currentTime) * pixelsPerMs + width / 2;

      if (noteX < -50 || noteX > width + 50) return;

      if (note.type === NoteType.LONG && note.duration) {
        const length = note.duration * pixelsPerMs;
        ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.fillRect(noteX, x, length, laneWidth - 10);
      }

      ctx.fillStyle = note.type === NoteType.SLIDE ? '#ff00ff' : '#00ff00';
      ctx.fillRect(noteX - 5, x + 5, 10, laneWidth - 10);
    });

    // 현재 시간 표시
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText(`Time: ${(currentTime / 1000).toFixed(2)}s`, 10, 20);
    ctx.fillText(`BPM: ${bpm}`, 10, 40);
    ctx.fillText(`Notes: ${notes.length}`, 10, 60);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 800;
      canvas.height = 600;
    }
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={togglePlayback}>{isPlaying ? 'Pause' : 'Play'}</button>
        <button onClick={handleSave}>Save Beatmap</button>
        <label>
          BPM: <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={gridSnap} onChange={(e) => setGridSnap(e.target.checked)} />
          Grid Snap
        </label>
      </div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setSelectedTool('note')}>Normal Note</button>
        <button onClick={() => setSelectedTool('long')}>Long Note</button>
        <button onClick={() => setSelectedTool('slide')}>Slide Note</button>
        <button onClick={() => setSelectedTool('effect')}>Effect</button>
      </div>
      {selectedTool === 'effect' && (
        <div style={{ marginBottom: '20px' }}>
          <select value={selectedEffect} onChange={(e) => setSelectedEffect(e.target.value as EffectType)}>
            <option value={EffectType.ROTATE}>Rotate</option>
            <option value={EffectType.NOISE}>Noise</option>
            <option value={EffectType.ZOOM}>Zoom</option>
          </select>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ border: '1px solid #666', cursor: 'crosshair' }}
      />
    </div>
  );
};

export default BeatmapEditor;
