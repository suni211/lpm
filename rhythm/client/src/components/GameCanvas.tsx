import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import {
  Effect,
  Beatmap,
  JudgementType,
  NoteType,
  EffectType,
  GameState
} from '../types';
import {
  judgeNote,
  calculateScore,
  calculateLongNoteCombo,
  isNoteVisible,
  calculateNoteYPosition,
  calculateLongNoteLength,
  getJudgementColor
} from '../services/gameEngine';

interface GameCanvasProps {
  beatmap: Beatmap;
  onGameEnd: (results: any) => void;
  isMultiplayer?: boolean;
  opponentScore?: number;
  scoreDiff?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ beatmap, onGameEnd, isMultiplayer = false, opponentScore = 0, scoreDiff = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<Howl | null>(null);
  const animationFrameRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());

  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    judgements: { yas: 0, oh: 0, ah: 0, fuck: 0 }
  });
  
  const [isGameStarted, setIsGameStarted] = useState(false);

  const [settings, setSettings] = useState({
    displaySync: 0,
    noteSpeed: 1, // 1~12배 노트 속도
    playbackSpeed: 1.0,
    keyBindings: {
      key4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
      key5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
      key6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']
    }
  });

  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);
  const [recentJudgements, setRecentJudgements] = useState<Array<{
    type: JudgementType;
    timestamp: number;
  }>>([]);

  const processedNotes = useRef<Set<string>>(new Set());
  const longNotesHeld = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    // 오디오 로드
    audioRef.current = new Howl({
      src: [beatmap.audio_file!],
      html5: true,
      onload: () => {
        console.log('Audio loaded');
        // 오디오 로드 완료 시 자동으로 게임 시작
        setTimeout(() => {
          startGame();
        }, 500);
      },
      onend: () => {
        endGame();
      }
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.unload();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [beatmap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 게임 시작 전에는 배속 설정만 가능
      if (!isGameStarted) {
        if (e.code === 'F1') {
          e.preventDefault();
          setSettings(s => {
            const newSpeed = Math.max(0.5, s.playbackSpeed - 0.1);
            return { ...s, playbackSpeed: newSpeed };
          });
        } else if (e.code === 'F2') {
          e.preventDefault();
          setSettings(s => {
            const newSpeed = Math.min(2.0, s.playbackSpeed + 0.1);
            return { ...s, playbackSpeed: newSpeed };
          });
        } else if (e.code === 'F9') {
          e.preventDefault();
          setSettings(s => ({ ...s, noteSpeed: Math.max(1, s.noteSpeed - 1) }));
        } else if (e.code === 'F10') {
          e.preventDefault();
          setSettings(s => ({ ...s, noteSpeed: Math.min(12, s.noteSpeed + 1) }));
        }
        return;
      }
      
      if (!gameState.isPlaying) return;

      // 게임 중에는 게임 키 입력만 처리 (단축키 제거)
      const keyBinding = settings.keyBindings[`key${beatmap.key_count}` as keyof typeof settings.keyBindings];
      const lane = keyBinding.indexOf(e.code);

      if (lane !== -1 && !keysPressed.current.has(e.code)) {
        keysPressed.current.add(e.code);
        handleNoteHit(lane);
      }
    };

      const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);

      if (!gameState.isPlaying || !isGameStarted) return;

      // 롱노트 릴리즈 체크
      const keyBinding = settings.keyBindings[`key${beatmap.key_count}` as keyof typeof settings.keyBindings];
      const lane = keyBinding.indexOf(e.code);

      if (lane !== -1) {
        checkLongNoteRelease(lane);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings, beatmap.key_count, gameState.isPlaying, isGameStarted]);

  const startGame = () => {
    if (audioRef.current) {
      setIsGameStarted(true);
      audioRef.current.play();
      audioRef.current.rate(settings.playbackSpeed);
      setGameState(s => ({ ...s, isPlaying: true, isPaused: false }));
      // 게임 루프 시작
      const loop = () => {
        if (audioRef.current && gameState.isPlaying) {
          const playing = audioRef.current.playing();
          if (playing) {
            const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
            setGameState(s => ({ ...s, currentTime, isPlaying: true }));

            // 이펙트 업데이트
            const activeEffs = beatmap.effect_data.filter(
              eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
            );
            setActiveEffects(activeEffs);

            // 판정선을 지나친 노트 자동 처리
            checkMissedNotes(currentTime);
            
            // 롱노트를 누르고 있는 동안 지속적으로 업데이트
            updateLongNoteDurations(currentTime);
            
            render(currentTime);
            animationFrameRef.current = requestAnimationFrame(loop);
          } else {
            // 재생이 끝났으면 게임 종료
            endGame();
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    }
  };


  const handleNoteHit = (lane: number) => {
    const currentTime = (audioRef.current?.seek() as number || 0) * 1000 + settings.displaySync;

    const candidateNotes = beatmap.note_data
      .filter(note => 
        note.lane === lane && 
        !processedNotes.current.has(note.id) &&
        !longNotesHeld.current.get(note.id)
      )
      .sort((a, b) => Math.abs(a.timestamp - currentTime) - Math.abs(b.timestamp - currentTime));

    if (candidateNotes.length === 0) return;

    const note = candidateNotes[0];
    const timeDiff = note.timestamp - currentTime;

    // 판정 윈도우 내에 있는 노트만 처리
    if (Math.abs(timeDiff) <= 200) {
      const judgement = judgeNote(timeDiff);
      setGameState(s => {
        const points = calculateScore(judgement, s.combo, beatmap.total_notes);
        const newCombo = judgement === JudgementType.FUCK ? 0 : s.combo + 1;
        const newJudgements = { ...s.judgements };

        switch (judgement) {
          case JudgementType.YAS:
            newJudgements.yas++;
            break;
          case JudgementType.OH:
            newJudgements.oh++;
            break;
          case JudgementType.AH:
            newJudgements.ah++;
            break;
          case JudgementType.FUCK:
            newJudgements.fuck++;
            break;
        }

        if (note.type === NoteType.LONG) {
          longNotesHeld.current.set(note.id, true);
        } else {
          processedNotes.current.add(note.id);
        }

        showJudgement(judgement);

        return {
          ...s,
          score: s.score + points,
          combo: newCombo,
          maxCombo: Math.max(s.maxCombo, newCombo),
          judgements: newJudgements
        };
      });
    }
  };

  const updateLongNoteDurations = (_currentTime: number) => {
    // 롱노트 duration은 렌더링 시 실시간으로 계산됨
    // 매 프레임마다 정확하게 업데이트됨
  };

  const checkMissedNotes = (currentTime: number) => {
    // 판정선을 지나친 노트를 자동으로 MISS 처리
    beatmap.note_data.forEach(note => {
      if (processedNotes.current.has(note.id)) return;
      if (longNotesHeld.current.get(note.id)) return; // 롱노트는 제외
      
      const timeDiff = note.timestamp - currentTime;
      // 판정선을 지나쳤고 (200ms 이상 지남) 아직 처리되지 않은 노트
      if (timeDiff < -200) {
        processedNotes.current.add(note.id);
        setGameState(s => {
          const newJudgements = { ...s.judgements };
          newJudgements.fuck++;
          showJudgement(JudgementType.FUCK);
          return {
            ...s,
            combo: 0,
            judgements: newJudgements
          };
        });
      }
    });
  };

  const checkLongNoteRelease = (lane: number) => {
    beatmap.note_data
      .filter(note => note.lane === lane && note.type === NoteType.LONG && longNotesHeld.current.get(note.id))
      .forEach(note => {
        const currentTime = (audioRef.current?.seek() as number || 0) * 1000;
        const holdTime = currentTime - note.timestamp;

        setGameState(s => {
          if (note.duration && holdTime >= note.duration * 0.8) {
            const combo = calculateLongNoteCombo(note.duration);
            // 롱노트 성공
            processedNotes.current.add(note.id);
            longNotesHeld.current.delete(note.id);
            return { ...s, combo: s.combo + combo, maxCombo: Math.max(s.maxCombo, s.combo + combo) };
          } else {
            // 롱노트 실패
            processedNotes.current.add(note.id);
            longNotesHeld.current.delete(note.id);
            const newJudgements = { ...s.judgements };
            newJudgements.fuck++;
            showJudgement(JudgementType.FUCK);
            return { ...s, combo: 0, judgements: newJudgements };
          }
        });
      });
  };

  const showJudgement = (judgement: JudgementType) => {
    const now = Date.now();
    setRecentJudgements(prev => [...prev, { type: judgement, timestamp: now }]);
    setTimeout(() => {
      setRecentJudgements(prev => prev.filter(j => j.timestamp !== now));
    }, 500);
  };

  const endGame = () => {
    setGameState(s => ({ ...s, isPlaying: false }));
    cancelAnimationFrame(animationFrameRef.current);

    const totalJudgements = gameState.judgements.yas + gameState.judgements.oh + gameState.judgements.ah + gameState.judgements.fuck;
    const accuracy = totalJudgements > 0 
      ? (gameState.judgements.yas * 100 + gameState.judgements.oh * 70 + gameState.judgements.ah * 40) / totalJudgements
      : 0;

    onGameEnd({
      score: gameState.score,
      accuracy,
      maxCombo: gameState.maxCombo,
      judgements: gameState.judgements
    });
  };

  const render = (currentTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // 배경
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // 이펙트 적용
    applyEffects(ctx, width, height);

    if (isMultiplayer) {
      // 멀티플레이 모드: 왼쪽(내꺼), 오른쪽(상대방꺼), 중간(점수차이)
      renderMultiplayer(ctx, width, height, currentTime);
    } else {
      // 솔로 플레이 모드: 중앙에 길고 얇게
      renderSolo(ctx, width, height, currentTime);
    }

    // UI
    renderUI(ctx, width, height);
  };

  const renderSolo = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTime: number) => {
    // DJMAX 스타일: 중앙에 얇고 작은 레인 영역
    const playAreaWidth = Math.min(width * 0.15, 200); // 최대 200px, 화면의 15%
    const playAreaX = (width - playAreaWidth) / 2; // 중앙 정렬
    
    // 판정선 (중앙, 얇고 짧게)
    const judgementLineY = height * 0.85;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playAreaX, judgementLineY);
    ctx.lineTo(playAreaX + playAreaWidth, judgementLineY);
    ctx.stroke();

    // 레인 그리기 (DJMAX 스타일: 얇고 작게)
    const laneWidth = playAreaWidth / beatmap.key_count;
    const laneHeight = height * 0.7; // 화면의 70% 높이
    const laneStartY = height * 0.15; // 상단 15% 여백

    for (let i = 0; i <= beatmap.key_count; i++) {
      const x = playAreaX + i * laneWidth;
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, laneStartY);
      ctx.lineTo(x, laneStartY + laneHeight);
      ctx.stroke();
    }

    // 노트 그리기 (세로로 길고 얇게)
    beatmap.note_data.forEach(note => {
      if (processedNotes.current.has(note.id)) return;
      if (!isNoteVisible(note.timestamp, currentTime, settings.noteSpeed)) return;

      const x = playAreaX + note.lane * laneWidth;
      const y = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, laneHeight, laneStartY, judgementLineY);

      // 노트가 판정선을 지나갔으면 표시하지 않음
      if (y > judgementLineY + 10) return;

      if (note.type === NoteType.LONG) {
        // 롱노트를 누르고 있는지 확인
        const isHeld = longNotesHeld.current.get(note.id);
        let actualDuration = note.duration || 200;
        
        // 누르고 있으면 실시간 duration 계산 (1ms 단위로 정확하게, 위로 올라가도록)
        if (isHeld) {
          // 1ms 단위로 정확하게 계산 (반올림 없음)
          const holdDuration = currentTime - note.timestamp;
          actualDuration = Math.max(actualDuration, Math.floor(holdDuration));
        }
        
        // 롱노트 길이 계산 (위로 올라가도록)
        const noteLength = calculateLongNoteLength(actualDuration, settings.noteSpeed, laneHeight);
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
      ctx.fillStyle = note.type === NoteType.SLIDE ? '#ff00ff' : '#00ff00';
      ctx.fillRect(noteX, y - noteSize / 2, noteSize, noteSize);
      
      // 노트 테두리
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(noteX, y - noteSize / 2, noteSize, noteSize);
    });
  };

  const renderMultiplayer = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTime: number) => {
    // 왼쪽: 내 플레이 영역
    const leftAreaWidth = width * 0.4;
    const rightAreaWidth = width * 0.4;
    const centerAreaWidth = width * 0.2;

    // 왼쪽 영역 (내꺼)
    renderPlayerArea(ctx, 0, 0, leftAreaWidth, height, currentTime, gameState.score, true);

    // 중앙 영역 (점수차이)
    const centerX = leftAreaWidth;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(centerX, 0, centerAreaWidth, height);
    
    // 점수차이 표시
    ctx.fillStyle = scoreDiff > 0 ? '#00ff00' : scoreDiff < 0 ? '#ff0000' : '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${scoreDiff > 0 ? '+' : ''}${scoreDiff.toLocaleString()}`, centerX + centerAreaWidth / 2, height / 2);
    
    // 내 점수
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`나: ${gameState.score.toLocaleString()}`, centerX + centerAreaWidth / 2, height / 2 - 40);
    
    // 상대방 점수
    ctx.fillText(`상대: ${opponentScore.toLocaleString()}`, centerX + centerAreaWidth / 2, height / 2 + 40);

    // 오른쪽 영역 (상대방꺼)
    renderPlayerArea(ctx, leftAreaWidth + centerAreaWidth, 0, rightAreaWidth, height, currentTime, opponentScore, false);
  };

  const renderPlayerArea = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    areaWidth: number, 
    areaHeight: number, 
    currentTime: number,
    _score: number,
    isMyArea: boolean
  ) => {
    // 배경
    ctx.fillStyle = isMyArea ? '#0a0a0a' : '#1a0a0a';
    ctx.fillRect(x, y, areaWidth, areaHeight);

    // 판정선
    const judgementLineY = y + areaHeight * 0.9;
    ctx.strokeStyle = isMyArea ? '#00ffff' : '#ff00ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + areaWidth * 0.1, judgementLineY);
    ctx.lineTo(x + areaWidth * 0.9, judgementLineY);
    ctx.stroke();

    // 레인 그리기
    const playWidth = areaWidth * 0.8;
    const marginX = areaWidth * 0.1;
    const laneWidth = playWidth / beatmap.key_count;
    const laneHeight = areaHeight * 0.8;
    const laneStartY = areaHeight * 0.1;

    for (let i = 0; i <= beatmap.key_count; i++) {
      const laneX = x + marginX + i * laneWidth;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(laneX, y + laneStartY);
      ctx.lineTo(laneX, y + laneStartY + laneHeight);
      ctx.stroke();
    }

    // 노트 그리기
    beatmap.note_data.forEach(note => {
      if (!isMyArea && processedNotes.current.has(note.id)) return;
      if (!isNoteVisible(note.timestamp, currentTime, settings.noteSpeed)) return;

      const noteX = x + marginX + note.lane * laneWidth;
      const noteY = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, laneHeight, y + laneStartY, judgementLineY);

      // 노트가 판정선을 지나갔으면 표시하지 않음
      if (noteY > judgementLineY + 10) return;

      if (note.type === NoteType.LONG) {
        // 롱노트를 누르고 있는지 확인
        const isHeld = isMyArea && longNotesHeld.current.get(note.id);
        let actualDuration = note.duration || 100;
        
        // 누르고 있으면 실시간 duration 계산
        if (isHeld) {
          const holdDuration = currentTime - note.timestamp;
          actualDuration = Math.max(actualDuration, holdDuration);
        }
        
        const noteLength = calculateLongNoteLength(actualDuration, settings.noteSpeed, laneHeight);
        ctx.fillStyle = isMyArea ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 255, 0.6)';
        ctx.fillRect(noteX + 2, noteY - noteLength, laneWidth - 4, noteLength);
      }

      // 노트를 작고 두껍게 (너비는 레인의 80%, 높이는 30px)
      const noteWidth = laneWidth * 0.8;
      const noteHeight = 30;
      const adjustedNoteX = noteX + (laneWidth - noteWidth) / 2;
      ctx.fillStyle = note.type === NoteType.SLIDE 
        ? (isMyArea ? '#ff00ff' : '#00ffff')
        : (isMyArea ? '#00ff00' : '#ff0000');
      ctx.fillRect(adjustedNoteX, noteY - noteHeight / 2, noteWidth, noteHeight);
      
      // 노트 테두리
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(adjustedNoteX, noteY - noteHeight / 2, noteWidth, noteHeight);
    });
  };

  const applyEffects = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    activeEffects.forEach(effect => {
      switch (effect.type) {
        case EffectType.ROTATE:
          ctx.translate(width / 2, height / 2);
          ctx.rotate((effect.intensity / 100) * Math.PI / 180);
          ctx.translate(-width / 2, -height / 2);
          break;
        case EffectType.ZOOM:
          const scale = 1 + (effect.intensity / 100);
          ctx.scale(scale, scale);
          break;
        case EffectType.NOISE:
          ctx.globalAlpha = 1 - (effect.intensity / 100);
          break;
      }
    });
  };

  const renderUI = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (isMultiplayer) {
      // 멀티플레이 UI는 각 영역에 표시
      return;
    }

    // 솔로 플레이 UI
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameState.score.toLocaleString()}`, 20, 40);
    ctx.fillText(`Combo: ${gameState.combo}`, 20, 70);
    ctx.fillText(`노트 속도: ${settings.noteSpeed}배`, 20, 100);
    ctx.fillText(`재생 속도: x${settings.playbackSpeed.toFixed(1)}`, 20, 130);

    // 판정 표시 (중앙)
    ctx.textAlign = 'center';
    recentJudgements.forEach((j, i) => {
      ctx.fillStyle = getJudgementColor(j.type);
      ctx.font = 'bold 48px Arial';
      ctx.fillText(j.type, width / 2, height / 2 + i * 60);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  // 게임 상태 변경 시 렌더링
  useEffect(() => {
    if (gameState.isPlaying) {
      render(gameState.currentTime);
    }
  }, [gameState.currentTime, gameState.isPlaying, activeEffects, settings.noteSpeed]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {/* 노트 속도 조절 UI */}
      {gameState.isPlaying && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '15px',
          borderRadius: '10px',
          border: '1px solid rgba(0, 255, 255, 0.3)'
        }}>
          <div style={{ color: '#fff', marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            노트 속도: {settings.noteSpeed}배
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setSettings(s => ({ ...s, noteSpeed: Math.max(1, s.noteSpeed - 1) }))}
              disabled={settings.noteSpeed <= 1}
              style={{
                padding: '8px 16px',
                background: settings.noteSpeed <= 1 ? '#333' : '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '5px',
                cursor: settings.noteSpeed <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              -
            </button>
            <input
              type="range"
              min="1"
              max="12"
              value={settings.noteSpeed}
              onChange={(e) => setSettings(s => ({ ...s, noteSpeed: parseInt(e.target.value) }))}
              style={{ width: '150px' }}
            />
            <button
              onClick={() => setSettings(s => ({ ...s, noteSpeed: Math.min(12, s.noteSpeed + 1) }))}
              disabled={settings.noteSpeed >= 12}
              style={{
                padding: '8px 16px',
                background: settings.noteSpeed >= 12 ? '#333' : '#00ffff',
                color: '#000',
                border: 'none',
                borderRadius: '5px',
                cursor: settings.noteSpeed >= 12 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              +
            </button>
          </div>
          <div style={{ color: '#aaa', fontSize: '12px', marginTop: '10px' }}>
            F9: -1배 | F10: +1배
          </div>
        </div>
      )}
      {!isGameStarted && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#fff',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '30px',
          borderRadius: '10px'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>게임 준비 중...</div>
          <div style={{ fontSize: '16px', marginBottom: '10px' }}>재생 속도: x{settings.playbackSpeed.toFixed(1)}</div>
          <div style={{ fontSize: '16px', marginBottom: '10px' }}>노트 속도: {settings.noteSpeed}배</div>
          <div style={{ fontSize: '14px', color: '#aaa', marginTop: '20px' }}>
            F1/F2: 재생 속도 조절 | F9/F10: 노트 속도 조절
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
