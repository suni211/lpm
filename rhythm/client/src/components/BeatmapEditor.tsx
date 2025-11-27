import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Note, Effect, NoteType, EffectType } from '../types';
import { Howl } from 'howler';
import './BeatmapEditor.css';

interface BeatmapEditorProps {
  songFile: string;
  bpm?: number;
  keyCount: number;
  onSave: (notes: Note[], effects: Effect[], bpm: number) => void;
}

// 기본 키 설정
const DEFAULT_KEY_BINDINGS = {
  4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
  5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
  6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']
};

const BeatmapEditor: React.FC<BeatmapEditorProps> = ({ songFile, bpm: initialBpm, keyCount, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<Howl | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [bpm, setBpm] = useState(initialBpm || 120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [gridSnap, setGridSnap] = useState(true);
  const [selectedTool, setSelectedTool] = useState<'note' | 'long' | 'slide' | 'effect'>('note');
  const [selectedEffect, setSelectedEffect] = useState<EffectType>(EffectType.ROTATE);
  const [keyBindings, setKeyBindings] = useState<string[]>(DEFAULT_KEY_BINDINGS[keyCount as keyof typeof DEFAULT_KEY_BINDINGS] || []);
  const [isEditingKeys, setIsEditingKeys] = useState(false);
  const [editingKeyIndex, setEditingKeyIndex] = useState<number | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const keyPressStartTimeRef = useRef<{ [key: string]: number }>({}); // 키를 누른 시간
  const keyPressLaneRef = useRef<{ [key: string]: number }>({}); // 키의 레인 정보
  const lastNoteTimeRef = useRef<{ [lane: number]: number }>({});
  const allNoteTimestampsRef = useRef<Map<number, Set<number>>>(new Map()); // 타임스탬프별 레인 추적 (정확한 중복 방지)
  const activeLongNotesRef = useRef<{ [key: string]: Note }>({}); // 진행 중인 롱노트

  useEffect(() => {
    audioRef.current = new Howl({
      src: [songFile],
      html5: true,
      onload: () => console.log('에디터용 오디오 로드 완료'),
      onend: () => {
        setIsPlaying(false);
        setIsRecording(false);
      }
    });

    if (!initialBpm) {
      detectBPM();
    }

    return () => {
      audioRef.current?.unload();
    };
  }, [songFile]);

  useEffect(() => {
    // 키 설정이 변경되면 기본값으로 업데이트
    if (keyBindings.length !== keyCount) {
      setKeyBindings(DEFAULT_KEY_BINDINGS[keyCount as keyof typeof DEFAULT_KEY_BINDINGS] || []);
    }
  }, [keyCount]);

  const detectBPM = async () => {
    setBpm(120); // 기본값
  };

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isEditingKeys || !isRecording || !isPlaying) return;

    const keyIndex = keyBindings.indexOf(e.code);
    if (keyIndex === -1) return;

    // 중복 입력 방지
    if (pressedKeysRef.current.has(e.code)) return;
    pressedKeysRef.current.add(e.code);

    e.preventDefault();

    const lane = keyIndex;
    // 녹음 시에는 그리드 스냅을 사용하지 않고, 정확한 키 입력 순간의 타임스탬프를 저장
    // 1ms 단위로 정확하게 저장 (반올림 없음, 정렬화 없음)
    let timestamp = Math.floor(currentTime);
    
    // 정확히 같은 타임스탬프에 같은 레인에 노트가 있는지만 체크 (1ms 차이는 완전히 허용)
    // 각 노트는 1ms 단위로 변동이 있어야 하므로, 정확히 같은 타임스탬프만 방지
    const lanesAtTimestamp = allNoteTimestampsRef.current.get(timestamp);
    if (lanesAtTimestamp && lanesAtTimestamp.has(lane)) {
      // 정확히 같은 타임스탬프, 같은 레인에 노트가 이미 있으면 1ms 추가
      timestamp = timestamp + 1;
    }

    // 이전 노트 시간 저장 (슬라이드 판단용)
    const previousNoteTime = lastNoteTimeRef.current[lane] || 0;
    
    // 키를 누른 시간 기록
    keyPressStartTimeRef.current[e.code] = timestamp;
    keyPressLaneRef.current[e.code] = lane;
    keyPressStartTimeRef.current[`${e.code}_prev`] = previousNoteTime; // 이전 노트 시간 저장

    // 롱노트 시작 (키를 누르면 롱노트로 시작, 키를 떼면 duration 결정)
    const longNoteId = `long-${Date.now()}-${lane}-${e.code}`;
    const longNote: Note = {
      id: longNoteId,
      type: NoteType.LONG, // 롱노트로 시작
      lane,
      timestamp,
      duration: 200, // 임시 duration (키를 떼면 실제 duration으로 업데이트)
      slideDirection: undefined
    };

    activeLongNotesRef.current[e.code] = longNote;
    setNotes(prev => [...prev, longNote]);
    lastNoteTimeRef.current[lane] = timestamp;
    
    // 타임스탬프별 레인 추적 (정확한 중복 방지)
    if (!allNoteTimestampsRef.current.has(timestamp)) {
      allNoteTimestampsRef.current.set(timestamp, new Set());
    }
    allNoteTimestampsRef.current.get(timestamp)!.add(lane);
  }, [isRecording, isPlaying, isEditingKeys, keyBindings, currentTime, gridSnap, bpm]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (!pressedKeysRef.current.has(e.code)) return;

    pressedKeysRef.current.delete(e.code);

    if (!isRecording || !isPlaying) return;

    const keyIndex = keyBindings.indexOf(e.code);
    if (keyIndex === -1) return;

    const lane = keyPressLaneRef.current[e.code];
    const pressStartTime = keyPressStartTimeRef.current[e.code];
    
    if (pressStartTime === undefined || lane === undefined) return;

    const releaseTime = currentTime;
    const holdDuration = releaseTime - pressStartTime;

    // 롱노트 찾기
    const longNote = activeLongNotesRef.current[e.code];
    
    if (longNote) {
    // 이전 노트와의 간격 확인 (슬라이드 판단)
    const previousNoteTime = keyPressStartTimeRef.current[`${e.code}_prev`] || 0;
    const slideThreshold = 300; // 300ms 이내면 슬라이드
    const timeSincePreviousNote = pressStartTime - previousNoteTime;
    const isSlide = previousNoteTime > 0 && 
                    timeSincePreviousNote > 30 && 
                    timeSincePreviousNote < slideThreshold;

    // 롱노트 duration 업데이트 (키를 떼면 그 시점까지의 duration으로 저장)
    // 1ms 단위로 정확하게 계산
    const holdDurationMs = Math.floor(holdDuration);
    
    setNotes(prev => {
      const updatedNotes: Note[] = prev.map(note => {
        if (note.id === longNote.id) {
          // 200ms 기준으로 노트 타입 결정
          if (holdDurationMs < 200) {
            // 0~200ms: 일반 노트 또는 슬라이드 노트
            if (isSlide) {
              // 슬라이드 노트로 변경 (타임스탬프는 그대로 유지)
              return { ...note, type: NoteType.SLIDE, slideDirection: 'right' as const, duration: undefined };
            } else {
              // 일반 노트로 변경 (타임스탬프는 그대로 유지)
              return { ...note, type: NoteType.NORMAL, duration: undefined, slideDirection: undefined };
            }
          } else {
            // 200ms 이상: 롱노트 (키를 떼는 시점까지의 duration으로 저장)
            // 1ms 단위로 정확하게 저장, 길이 제한 없음 (무한정 길 수 있음)
            return { ...note, type: NoteType.LONG, duration: holdDurationMs };
          }
        }
        // 이전 노트도 슬라이드로 변경 (연속 입력인 경우)
        if (isSlide && 
            note.lane === lane && 
            Math.abs(note.timestamp - previousNoteTime) < 50 &&
            note.id !== longNote.id &&
            note.type === NoteType.NORMAL) {
          return { ...note, type: NoteType.SLIDE, slideDirection: 'right' as const };
        }
        return note;
      });
      return updatedNotes;
    });
      delete activeLongNotesRef.current[e.code];
    }

    delete keyPressStartTimeRef.current[e.code];
    delete keyPressStartTimeRef.current[`${e.code}_prev`];
    delete keyPressLaneRef.current[e.code];
  }, [isRecording, isPlaying, keyBindings, currentTime]);

  useEffect(() => {
    if (isRecording && isPlaying) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isRecording, isPlaying, handleKeyDown, handleKeyUp]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isRecording) return; // 녹음 중에는 클릭 비활성화

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const laneWidth = canvas.width / keyCount;
    const lane = Math.floor(x / laneWidth);

    // 녹음 모드가 아닐 때만 그리드 스냅 사용 (수동 배치 시)
    // 녹음 시에는 정확한 타임스탬프 사용
    let timestamp = Math.floor(currentTime);
    if (!isRecording && gridSnap) {
      const beatDuration = (60 / bpm) * 1000;
      timestamp = Math.round(timestamp / beatDuration) * beatDuration;
    }
    
      // 정확히 같은 타임스탬프에 같은 레인에 노트가 있는지 체크
      // 1ms 차이는 완전히 허용하므로, 정확히 같은 타임스탬프만 조정
      let finalTimestamp = timestamp;
      const lanesAtTimestamp = allNoteTimestampsRef.current.get(finalTimestamp);
      if (lanesAtTimestamp && lanesAtTimestamp.has(lane)) {
        // 정확히 같은 타임스탬프, 같은 레인에 노트가 이미 있으면 1ms 추가
        finalTimestamp = finalTimestamp + 1;
      }
      timestamp = finalTimestamp;

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

  // 시간 업데이트 루프 및 롱노트 실시간 업데이트
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    const updateLoop = () => {
      if (audioRef.current && isPlaying) {
        const time = (audioRef.current.seek() as number) * 1000;
        setCurrentTime(time);
        
        // 활성 롱노트들의 duration 실시간 업데이트
        if (isRecording) {
          const activeKeys = Object.keys(activeLongNotesRef.current);
          if (activeKeys.length > 0) {
            setNotes(prev => {
              const updatedNotes = prev.map(note => {
                const activeKey = activeKeys.find((key: string) => {
                  const longNote = activeLongNotesRef.current[key];
                  return longNote && longNote.id === note.id;
                });
                
                if (activeKey) {
                  const pressStartTime = keyPressStartTimeRef.current[activeKey];
                  if (pressStartTime !== undefined) {
                    // 1ms 단위로 정확하게 계산 (반올림 없음)
                    const holdDuration = time - pressStartTime;
                    // 실시간으로 duration 업데이트 (최소 200ms 이상이어야 롱노트)
                    // 정확한 1ms 단위로 저장
                    return { ...note, duration: Math.max(200, Math.floor(holdDuration)) };
                  }
                }
                return note;
              });
              return updatedNotes;
            });
          }
        }
        
        animationFrameId = requestAnimationFrame(updateLoop);
      }
    };
    animationFrameId = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, isRecording]);

  const togglePlayback = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsRecording(false);
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleRecording = () => {
    if (!isPlaying) {
      // 녹음 시작 시 재생도 함께 시작
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
    
    if (!isRecording) {
      // 녹음 시작 시 타임스탬프 추적 초기화
      allNoteTimestampsRef.current.clear();
      // 기존 노트들의 타임스탬프로 초기화
      notes.forEach(note => {
        const ts = Math.floor(note.timestamp);
        if (!allNoteTimestampsRef.current.has(ts)) {
          allNoteTimestampsRef.current.set(ts, new Set());
        }
        allNoteTimestampsRef.current.get(ts)!.add(note.lane);
      });
    }
    
    setIsRecording(!isRecording);
    pressedKeysRef.current.clear();
  };

  const handleSave = () => {
    // 노트를 타임스탬프 순으로 정렬
    // 1ms 단위로 정확하게 저장 및 중복 제거
    const processedNotes = notes.map(note => ({
      ...note,
      timestamp: Math.floor(note.timestamp), // 1ms 단위로 정확하게
      duration: note.duration ? Math.floor(note.duration) : undefined
    }));
    
    // 중복 제거: 같은 타임스탬프, 같은 레인에 여러 노트가 있으면 하나만 유지
    const noteMap = new Map<string, Note>();
    processedNotes.forEach(note => {
      const key = `${note.timestamp}-${note.lane}`;
      if (!noteMap.has(key)) {
        noteMap.set(key, note);
      } else {
        // 같은 타임스탬프, 같은 레인에 노트가 있으면 나중 것만 유지
        noteMap.set(key, note);
      }
    });
    
    const uniqueNotes = Array.from(noteMap.values());
    const sortedNotes = uniqueNotes.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.lane - b.lane;
    });
    
    onSave(sortedNotes, effects, bpm);
  };

  const handleKeyBindingChange = (index: number, newKey: string) => {
    const newBindings = [...keyBindings];
    newBindings[index] = newKey;
    setKeyBindings(newBindings);
  };

  const startKeyEdit = (index: number) => {
    setIsEditingKeys(true);
    setEditingKeyIndex(index);
  };

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    if (editingKeyIndex === null) return;
    e.preventDefault();
    handleKeyBindingChange(editingKeyIndex, e.code);
    setIsEditingKeys(false);
    setEditingKeyIndex(null);
  };

  const resetKeyBindings = () => {
    setKeyBindings(DEFAULT_KEY_BINDINGS[keyCount as keyof typeof DEFAULT_KEY_BINDINGS] || []);
  };

  const getKeyDisplayName = (keyCode: string) => {
    const keyMap: { [key: string]: string } = {
      'KeyD': 'D',
      'KeyF': 'F',
      'KeyJ': 'J',
      'KeyK': 'K',
      'KeyS': 'S',
      'KeyL': 'L',
      'Space': 'SPACE'
    };
    return keyMap[keyCode] || keyCode.replace('Key', '');
  };

  useEffect(() => {
    renderEditor();
  }, [notes, effects, currentTime, keyCount, isRecording]);

  const renderEditor = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // DJMAX 스타일: 중앙에 얇고 작은 레인 영역
    const playAreaWidth = Math.min(width * 0.15, 200); // 최대 200px, 화면의 15%
    const playAreaX = (width - playAreaWidth) / 2; // 중앙 정렬
    
    // 레인 그리기 (얇고 작게)
    const laneWidth = playAreaWidth / keyCount;
    for (let i = 0; i <= keyCount; i++) {
      const x = playAreaX + i * laneWidth;
      ctx.strokeStyle = i === keyCount / 2 ? '#00ffff' : '#333';
      ctx.lineWidth = i === keyCount / 2 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 타임라인 그리드
    const beatDuration = (60 / bpm) * 1000;
    const pixelsPerMs = height / 60000; // 60초 기준

    for (let t = 0; t < 60000; t += beatDuration) {
      const y = height - (t - currentTime) * pixelsPerMs;
      if (y < 0 || y > height) continue;

      ctx.strokeStyle = t % (beatDuration * 4) === 0 ? '#666' : '#333';
      ctx.lineWidth = t % (beatDuration * 4) === 0 ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 현재 시간 라인
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // 판정선 (현재 시간 기준)
    const judgementLineY = height;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playAreaX, judgementLineY);
    ctx.lineTo(playAreaX + playAreaWidth, judgementLineY);
    ctx.stroke();

    // 노트 그리기 (게임과 동일한 스타일)
    notes.forEach(note => {
      const x = playAreaX + note.lane * laneWidth;
      // 노트 위치 계산 (게임과 동일)
      const timeUntilHit = note.timestamp - currentTime;
      const fallTime = 2000 / 1; // 기본 속도
      const fallDistance = height * 0.7;
      const progress = 1 - (timeUntilHit / fallTime);
      const noteY = height * 0.15 + progress * fallDistance;

      if (noteY < -50 || noteY > height + 50) return;

      if (note.type === NoteType.LONG) {
        // 롱노트: 실시간 duration 확인
        const activeKey = Object.keys(activeLongNotesRef.current).find(key => {
          const longNote = activeLongNotesRef.current[key];
          return longNote && longNote.id === note.id;
        });
        
        let actualDuration = note.duration || 200;
        if (activeKey) {
          const pressStartTime = keyPressStartTimeRef.current[activeKey];
          if (pressStartTime !== undefined) {
            const holdDuration = currentTime - pressStartTime;
            actualDuration = Math.max(actualDuration, holdDuration);
          }
        }
        
        // 롱노트 길이 계산 (위로 올라가도록)
        const noteLength = (actualDuration / fallTime) * fallDistance;
        ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
        // 롱노트는 판정선에서 위로 올라감
        ctx.fillRect(x + 1, judgementLineY - noteLength, laneWidth - 2, noteLength);
        
        // 롱노트 시작 부분 (두껍게)
        ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
        const noteSize = Math.min(laneWidth * 0.9, 25);
        ctx.fillRect(x + (laneWidth - noteSize) / 2, judgementLineY - noteLength - noteSize / 2, noteSize, noteSize);
      }

      // 노트를 두껍고 짧게 (DJMAX 스타일: 정사각형에 가깝게)
      const noteSize = Math.min(laneWidth * 0.9, 25); // 최대 25px, 레인의 90%
      const noteX = x + (laneWidth - noteSize) / 2;
      ctx.fillStyle = note.type === NoteType.SLIDE ? '#ff00ff' : note.type === NoteType.LONG ? '#ffaa00' : '#00ff00';
      ctx.fillRect(noteX, noteY - noteSize / 2, noteSize, noteSize);
      
      // 노트 테두리
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(noteX, noteY - noteSize / 2, noteSize, noteSize);
      
      // 노트 테두리
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, noteY - 10, laneWidth - 10, 20);
    });

    // 현재 시간 표시
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`시간: ${(currentTime / 1000).toFixed(2)}초`, 10, 25);
    ctx.fillText(`BPM: ${bpm}`, 10, 50);
    ctx.fillText(`노트: ${notes.length}개`, 10, 75);
    
    if (isRecording) {
      ctx.fillStyle = '#ff0000';
      ctx.fillText('● 녹음 중', 10, 100);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1200;
      canvas.height = 800;
    }
  }, []);

  return (
    <div className="beatmap-editor">
      <div className="editor-header">
        <div className="editor-controls">
          <button 
            onClick={togglePlayback} 
            className={`control-btn ${isPlaying ? 'pause-btn' : 'play-btn'}`}
          >
            {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
          </button>
          <button 
            onClick={toggleRecording} 
            className={`control-btn record-btn ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? '● 녹음 중' : '● 녹음 시작'}
          </button>
          <button onClick={handleSave} className="control-btn save-btn">
            💾 비트맵 저장
          </button>
        </div>

        <div className="editor-settings">
          <label className="setting-item">
            BPM: 
            <input 
              type="number" 
              value={bpm} 
              onChange={(e) => setBpm(Number(e.target.value))}
              className="setting-input"
              min="60"
              max="300"
            />
          </label>
          <label className="setting-item">
            <input 
              type="checkbox" 
              checked={gridSnap} 
              onChange={(e) => setGridSnap(e.target.checked)}
            />
            그리드 스냅
          </label>
        </div>
      </div>

      <div className="editor-tools">
        {!isRecording && (
          <div className="tool-section">
            <h3>노트 타입 (수동 편집)</h3>
            <div className="tool-buttons">
              <button 
                onClick={() => setSelectedTool('note')}
                className={`tool-btn ${selectedTool === 'note' ? 'active' : ''}`}
              >
                일반 노트
              </button>
              <button 
                onClick={() => setSelectedTool('long')}
                className={`tool-btn ${selectedTool === 'long' ? 'active' : ''}`}
              >
                롱 노트
              </button>
              <button 
                onClick={() => setSelectedTool('slide')}
                className={`tool-btn ${selectedTool === 'slide' ? 'active' : ''}`}
              >
                슬라이드 노트
              </button>
              <button 
                onClick={() => setSelectedTool('effect')}
                className={`tool-btn ${selectedTool === 'effect' ? 'active' : ''}`}
              >
                이펙트
              </button>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="tool-section recording-info">
            <h3>🎵 자동 녹음 모드</h3>
            <div className="recording-instructions">
              <p>• 짧게 누르기 (0~200ms): 일반 노트</p>
              <p>• 길게 누르기 (200ms 이상): 롱 노트</p>
              <p>• 연달아 누르기 (300ms 이내): 슬라이드 노트</p>
            </div>
          </div>
        )}

        {selectedTool === 'effect' && (
          <div className="tool-section">
            <h3>이펙트 타입</h3>
            <select 
              value={selectedEffect} 
              onChange={(e) => setSelectedEffect(e.target.value as EffectType)}
              className="effect-select"
            >
              <option value={EffectType.ROTATE}>회전</option>
              <option value={EffectType.NOISE}>노이즈</option>
              <option value={EffectType.ZOOM}>줌</option>
            </select>
          </div>
        )}

        <div className="tool-section key-settings">
          <h3>키 설정 ({keyCount}키)</h3>
          <div className="key-bindings">
            {keyBindings.map((key, index) => (
              <div key={index} className="key-binding-item">
                <span className="key-label">레인 {index + 1}:</span>
                {editingKeyIndex === index ? (
                  <input
                    type="text"
                    className="key-input"
                    placeholder="키를 누르세요"
                    onKeyDown={handleKeyCapture}
                    autoFocus
                    onBlur={() => {
                      setIsEditingKeys(false);
                      setEditingKeyIndex(null);
                    }}
                  />
                ) : (
                  <button
                    onClick={() => startKeyEdit(index)}
                    className="key-btn"
                  >
                    {getKeyDisplayName(key)}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={resetKeyBindings} className="reset-keys-btn">
            기본값으로 초기화
          </button>
        </div>
      </div>

      <div className="editor-canvas-wrapper">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="editor-canvas"
        />
        {isRecording && (
          <div className="recording-overlay">
            <div className="recording-indicator pulse"></div>
            <p>키보드로 노트를 입력하세요</p>
          </div>
        )}
      </div>

      <div className="editor-info">
        <p>💡 팁: 녹음 모드에서 재생 버튼을 누르고 키보드로 노트를 입력하세요</p>
        <p>💡 팁: 키 설정을 클릭하여 원하는 키로 변경할 수 있습니다</p>
      </div>
    </div>
  );
};

export default BeatmapEditor;
