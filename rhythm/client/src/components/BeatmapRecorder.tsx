import { useEffect, useRef, useState, useCallback } from 'react';
import type { Song } from '../types';

interface RecordedNote {
  time: number;
  lane: number;
  type: 'normal' | 'long';
  duration?: number;
}

interface BeatmapRecorderProps {
  song: Song;
  keyCount: 4 | 5 | 6 | 8;
  onSave: (notes: RecordedNote[]) => void;
  onCancel: () => void;
}

export default function BeatmapRecorder({ song, keyCount, onSave, onCancel }: BeatmapRecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [combo, setCombo] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  // 키 매핑 (KeyCode 기반 - 한글/영문 상관없이 물리적 키 위치)
  const keyMappings: Record<number, string[]> = {
    4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
    5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
    6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
    8: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon']
  };

  // 화면 표시용 키 이름
  const keyDisplayNames: Record<string, string> = {
    'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D', 'KeyF': 'F',
    'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
    'Semicolon': ';', 'Space': 'SPACE'
  };

  const keys = keyMappings[keyCount];
  const pressedKeys = useRef<Set<string>>(new Set());
  const longNoteStart = useRef<Map<number, number>>(new Map());

  // 캔버스 그리기
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 현재 오디오 시간 (맨 위에서 정의)
    const currentAudioTime = audioRef.current?.currentTime || 0;

    // 배경
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // 기어 영역 (중앙, 얇게)
    const gearWidth = 80 * keyCount;
    const gearX = (width - gearWidth) / 2;
    const laneWidth = gearWidth / keyCount;

    // BGA 영역 표시 (양옆)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, gearX - 20, height);
    ctx.fillRect(gearX + gearWidth + 20, 0, width - (gearX + gearWidth + 20), height);

    ctx.font = '14px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('BGA 영역', gearX / 2, height / 2);
    ctx.fillText('BGA 영역', gearX + gearWidth + (width - gearX - gearWidth) / 2, height / 2);

    // 기어 배경
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(gearX, 0, gearWidth, height);

    // 레인 구분선
    for (let i = 0; i <= keyCount; i++) {
      ctx.strokeStyle = i === 0 || i === keyCount ? '#666' : '#333';
      ctx.lineWidth = i === 0 || i === keyCount ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(gearX + i * laneWidth, 0);
      ctx.lineTo(gearX + i * laneWidth, height);
      ctx.stroke();
    }

    // 판정선 (하단)
    const judgeLineY = height - 100;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gearX, judgeLineY);
    ctx.lineTo(gearX + gearWidth, judgeLineY);
    ctx.stroke();

    // 눌린 키 표시 (납작하고 두꺼운 노트)
    pressedKeys.current.forEach((key) => {
      const laneIndex = keys.indexOf(key);
      if (laneIndex !== -1) {
        const x = gearX + laneIndex * laneWidth;
        const startTime = longNoteStart.current.get(laneIndex);

        // 눌린 효과 - 밝은 배경
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fillRect(x + 2, 0, laneWidth - 4, height);

        // 롱노트 미리보기 (누르고 있는 경우)
        if (startTime !== undefined && isRecording && !isPaused) {
          const holdDuration = (currentAudioTime * 1000) - startTime;
          if (holdDuration > 50) {
            const longNoteVisualHeight = Math.min(holdDuration * 0.5, judgeLineY - 50);

            // 롱노트 몸통 미리보기
            ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.fillRect(x + 10, judgeLineY - longNoteVisualHeight, laneWidth - 20, longNoteVisualHeight);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 10, judgeLineY - longNoteVisualHeight, laneWidth - 20, longNoteVisualHeight);
          }
        }

        // 판정선 위치에 납작하고 두꺼운 노트
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + 5, judgeLineY - 15, laneWidth - 10, 30);

        // 노트 테두리
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, judgeLineY - 15, laneWidth - 10, 30);
      }
    });

    // 녹화된 노트 표시 (지나간 것들을 위로 올라가게)
    recordedNotes.forEach((note) => {
      const timeDiff = (currentAudioTime * 1000) - note.time;
      if (timeDiff > 0 && timeDiff < 2000) {
        const y = judgeLineY - (timeDiff * 0.5); // 위로 이동
        const x = gearX + note.lane * laneWidth;

        if (note.type === 'long' && note.duration) {
          // 롱노트 표시
          const endTimeDiff = (currentAudioTime * 1000) - (note.time + note.duration);
          if (endTimeDiff < 2000) {
            const endY = judgeLineY - (endTimeDiff * 0.5);
            const longNoteHeight = y - endY;

            // 롱노트 몸통
            ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
            ctx.fillRect(x + 10, endY, laneWidth - 20, longNoteHeight);
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 10, endY, laneWidth - 20, longNoteHeight);

            // 롱노트 시작 부분
            ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
            ctx.fillRect(x + 5, y - 15, laneWidth - 10, 30);
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 5, y - 15, laneWidth - 10, 30);

            // 롱노트 끝 부분
            ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
            ctx.fillRect(x + 5, endY - 15, laneWidth - 10, 30);
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 5, endY - 15, laneWidth - 10, 30);
          }
        } else {
          // 일반 노트
          ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
          ctx.fillRect(x + 5, y - 15, laneWidth - 10, 30);
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 5, y - 15, laneWidth - 10, 30);
        }
      }
    });

    // UI 요소
    // 콤보
    if (combo > 0) {
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(combo.toString(), width / 2, 80);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('COMBO', width / 2, 110);
    }

    // 녹화 상태
    if (isRecording) {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ff4444';
      ctx.textAlign = 'left';
      ctx.fillText('● REC', 30, 40);
    }

    // 시간 표시
    ctx.font = '18px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, width - 30, 40);

    // 노트 개수
    ctx.textAlign = 'left';
    ctx.fillText(`노트: ${recordedNotes.length}`, 30, height - 30);

    // 키 가이드 (하단)
    ctx.font = '16px Arial';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    keys.forEach((keyCode, i) => {
      const x = gearX + i * laneWidth + laneWidth / 2;
      ctx.fillText(keyDisplayNames[keyCode] || keyCode, x, height - 10);
    });

  }, [keyCount, keys, keyDisplayNames, recordedNotes, combo, currentTime, isRecording, isPaused]);

  // 애니메이션 루프
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  // 오디오 시간 업데이트
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isRecording || isPaused) return;

      const keyCode = e.code;
      if (!keys.includes(keyCode)) return;
      if (pressedKeys.current.has(keyCode)) return;

      pressedKeys.current.add(keyCode);
      const laneIndex = keys.indexOf(keyCode);
      const currentAudioTime = audioRef.current?.currentTime || 0;
      const timestamp = Math.round(currentAudioTime * 1000);

      // 롱노트 시작 기록
      longNoteStart.current.set(laneIndex, timestamp);

      // 콤보 증가
      setCombo(prev => prev + 1);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyCode = e.code;
      if (!keys.includes(keyCode)) return;

      pressedKeys.current.delete(keyCode);

      if (!isRecording || isPaused) return;

      const laneIndex = keys.indexOf(keyCode);
      const startTime = longNoteStart.current.get(laneIndex);

      if (startTime !== undefined) {
        const currentAudioTime = audioRef.current?.currentTime || 0;
        const endTime = Math.round(currentAudioTime * 1000);
        const duration = endTime - startTime;

        // 200ms 이상 누르면 롱노트, 아니면 일반 노트
        const note: RecordedNote = {
          time: startTime,
          lane: laneIndex,
          type: duration > 200 ? 'long' : 'normal',
          ...(duration > 200 && { duration })
        };

        setRecordedNotes(prev => [...prev, note]);
        longNoteStart.current.delete(laneIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, isPaused, keys]);

  const handleStartRecording = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setIsRecording(true);
    setIsPaused(false);
    audio.currentTime = 0;
    audio.play();
  };

  const handlePauseResume = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPaused) {
      audio.play();
      setIsPaused(false);
    } else {
      audio.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleClear = () => {
    if (confirm('모든 녹화 데이터를 삭제하시겠습니까?')) {
      setRecordedNotes([]);
      setCombo(0);
      longNoteStart.current.clear();
    }
  };

  const handleSave = () => {
    if (recordedNotes.length === 0) {
      alert('녹화된 노트가 없습니다.');
      return;
    }

    // 시간순 정렬
    const sortedNotes = [...recordedNotes].sort((a, b) => a.time - b.time);
    onSave(sortedNotes);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0a'
    }}>
      {/* 오디오 */}
      <audio
        ref={audioRef}
        src={`http://localhost:3003${song.audio_file_path}`}
        onEnded={handleStop}
      />

      {/* 컨트롤 패널 */}
      <div style={{
        padding: '1rem',
        background: '#1a1a1a',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        borderBottom: '2px solid #333'
      }}>
        <h2 style={{ margin: 0, flex: 1 }}>
          비트맵 녹화: {song.title} ({keyCount}K)
        </h2>

        {!isRecording ? (
          <button className="btn" onClick={handleStartRecording}>
            녹화 시작
          </button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={handlePauseResume}>
              {isPaused ? '재개' : '일시정지'}
            </button>
            <button className="btn btn-secondary" onClick={handleStop}>
              정지
            </button>
          </>
        )}

        <button
          className="btn btn-secondary"
          onClick={handleClear}
          disabled={recordedNotes.length === 0}
        >
          초기화
        </button>

        <button
          className="btn"
          onClick={handleSave}
          disabled={recordedNotes.length === 0}
        >
          저장 ({recordedNotes.length}개 노트)
        </button>

        <button className="btn btn-secondary" onClick={onCancel}>
          취소
        </button>
      </div>

      {/* 게임 캔버스 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            border: '2px solid #333'
          }}
        />
      </div>

      {/* 안내 */}
      {!isRecording && (
        <div style={{
          padding: '1rem',
          background: '#1a1a1a',
          borderTop: '2px solid #333',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
            녹화를 시작하고 노래에 맞춰 키를 눌러주세요.
          </p>
          <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>
            키 매핑: {keys.map(k => keyDisplayNames[k] || k).join(', ')}
          </p>
          <p style={{ margin: '0.5rem 0', opacity: 0.7 }}>
            200ms 이상 누르면 롱노트로 기록됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
