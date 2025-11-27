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

  const [settings, setSettings] = useState({
    displaySync: 0,
    noteSpeed: 1.0,
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
      // 단축키 처리
      if (e.code === 'F1') {
        e.preventDefault();
        setSettings(s => ({ ...s, playbackSpeed: Math.max(0.5, s.playbackSpeed - 0.1) }));
        if (audioRef.current) audioRef.current.rate(Math.max(0.5, settings.playbackSpeed - 0.1));
      } else if (e.code === 'F2') {
        e.preventDefault();
        setSettings(s => ({ ...s, playbackSpeed: Math.min(2.0, s.playbackSpeed + 0.1) }));
        if (audioRef.current) audioRef.current.rate(Math.min(2.0, settings.playbackSpeed + 0.1));
      } else if (e.code === 'F7') {
        e.preventDefault();
        setSettings(s => ({ ...s, displaySync: s.displaySync + 1 }));
      } else if (e.code === 'F8') {
        e.preventDefault();
        setSettings(s => ({ ...s, displaySync: s.displaySync - 1 }));
      } else if (e.code === 'F9') {
        e.preventDefault();
        setSettings(s => ({ ...s, noteSpeed: s.noteSpeed * 0.5 }));
      } else if (e.code === 'F10') {
        e.preventDefault();
        setSettings(s => ({ ...s, noteSpeed: s.noteSpeed * 2 }));
      } else if (e.code === 'Escape') {
        togglePause();
      } else {
        // 게임 키 입력
        const keyBinding = settings.keyBindings[`key${beatmap.key_count}` as keyof typeof settings.keyBindings];
        const lane = keyBinding.indexOf(e.code);

        if (lane !== -1 && !keysPressed.current.has(e.code)) {
          keysPressed.current.add(e.code);
          handleNoteHit(lane);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);

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
  }, [settings, beatmap.key_count, gameState]);

  const startGame = () => {
    if (audioRef.current) {
      audioRef.current.play();
      audioRef.current.rate(settings.playbackSpeed);
      setGameState(s => ({ ...s, isPlaying: true, isPaused: false }));
      // 게임 루프 시작
      const loop = () => {
        if (audioRef.current) {
          const playing = audioRef.current.playing();
          if (playing) {
            const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
            setGameState(s => ({ ...s, currentTime, isPlaying: true }));

            // 이펙트 업데이트
            const activeEffs = beatmap.effect_data.filter(
              eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
            );
            setActiveEffects(activeEffs);

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

  const togglePause = () => {
    if (audioRef.current) {
      if (gameState.isPaused) {
        audioRef.current.play();
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        audioRef.current.pause();
        cancelAnimationFrame(animationFrameRef.current);
      }
      setGameState(s => ({ ...s, isPaused: !s.isPaused }));
    }
  };

  const gameLoop = () => {
    if (audioRef.current) {
      const playing = audioRef.current.playing();
      if (playing) {
        const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
        setGameState(s => ({ ...s, currentTime, isPlaying: true }));

        // 이펙트 업데이트
        const activeEffs = beatmap.effect_data.filter(
          eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
        );
        setActiveEffects(activeEffs);

        render(currentTime);
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      } else {
        // 재생이 끝났으면 게임 종료
        endGame();
      }
    }
  };

  const handleNoteHit = (lane: number) => {
    const currentTime = (audioRef.current?.seek() as number || 0) * 1000 + settings.displaySync;

    const candidateNotes = beatmap.note_data
      .filter(note => note.lane === lane && !processedNotes.current.has(note.id))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (candidateNotes.length === 0) return;

    const note = candidateNotes[0];
    const timeDiff = note.timestamp - currentTime;

    if (Math.abs(timeDiff) <= 200) {
      const judgement = judgeNote(timeDiff);
      const points = calculateScore(judgement, gameState.combo, beatmap.total_notes);

      if (note.type === NoteType.LONG) {
        longNotesHeld.current.set(note.id, true);
      } else {
        processedNotes.current.add(note.id);
      }

      updateGameState(judgement, points);
      showJudgement(judgement);
    }
  };

  const checkLongNoteRelease = (lane: number) => {
    beatmap.note_data
      .filter(note => note.lane === lane && note.type === NoteType.LONG && longNotesHeld.current.get(note.id))
      .forEach(note => {
        const currentTime = (audioRef.current?.seek() as number || 0) * 1000;
        const holdTime = currentTime - note.timestamp;

        if (note.duration && holdTime >= note.duration * 0.8) {
          const combo = calculateLongNoteCombo(note.duration);
          // 롱노트 성공
          setGameState(s => ({ ...s, combo: s.combo + combo }));
        } else {
          // 롱노트 실패
          setGameState(s => ({ ...s, combo: 0 }));
        }

        processedNotes.current.add(note.id);
        longNotesHeld.current.delete(note.id);
      });
  };

  const updateGameState = (judgement: JudgementType, points: number) => {
    setGameState(s => {
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

      return {
        ...s,
        score: s.score + points,
        combo: newCombo,
        maxCombo: Math.max(s.maxCombo, newCombo),
        judgements: newJudgements
      };
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

    onGameEnd({
      score: gameState.score,
      accuracy: (gameState.judgements.yas * 100 + gameState.judgements.oh * 70 + gameState.judgements.ah * 40) / beatmap.total_notes,
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
    // 중앙에 길고 얇은 레인 (양 옆에 여백)
    const margin = width * 0.2; // 양 옆 20% 여백
    const playAreaWidth = width - margin * 2;
    const centerX = width / 2;
    
    // 판정선 (중앙, 얇고 길게)
    const judgementLineY = height * 0.9;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, judgementLineY);
    ctx.lineTo(width - margin, judgementLineY);
    ctx.stroke();

    // 레인 그리기 (세로로 길고 얇게)
    const laneWidth = playAreaWidth / beatmap.key_count;
    const laneHeight = height * 0.8; // 화면의 80% 높이
    const laneStartY = height * 0.1; // 상단 10% 여백

    for (let i = 0; i <= beatmap.key_count; i++) {
      const x = margin + i * laneWidth;
      ctx.strokeStyle = '#333';
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

      const x = margin + note.lane * laneWidth;
      const y = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, laneHeight, laneStartY);

      if (note.type === NoteType.LONG && note.duration) {
        const noteLength = calculateLongNoteLength(note.duration, settings.noteSpeed, laneHeight);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.fillRect(x + 2, y - noteLength, laneWidth - 4, noteLength);
      }

      // 노트를 세로로 길고 얇게
      const noteHeight = 20;
      ctx.fillStyle = note.type === NoteType.SLIDE ? '#ff00ff' : '#00ff00';
      ctx.fillRect(x + 2, y, laneWidth - 4, noteHeight);
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
    score: number,
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
      const noteY = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, laneHeight, y + laneStartY);

      if (note.type === NoteType.LONG && note.duration) {
        const noteLength = calculateLongNoteLength(note.duration, settings.noteSpeed, laneHeight);
        ctx.fillStyle = isMyArea ? 'rgba(255, 255, 0, 0.6)' : 'rgba(255, 0, 255, 0.6)';
        ctx.fillRect(noteX + 2, noteY - noteLength, laneWidth - 4, noteLength);
      }

      const noteHeight = 20;
      ctx.fillStyle = note.type === NoteType.SLIDE 
        ? (isMyArea ? '#ff00ff' : '#00ffff')
        : (isMyArea ? '#00ff00' : '#ff0000');
      ctx.fillRect(noteX + 2, noteY, laneWidth - 4, noteHeight);
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
    ctx.fillText(`Speed: x${settings.playbackSpeed.toFixed(1)}`, 20, 100);

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
      // 초기 렌더링
      render(gameState.currentTime);
    }
  }, []);

  // 게임 상태 변경 시 렌더링
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      render(gameState.currentTime);
    }
  }, [gameState.currentTime, gameState.isPlaying, gameState.isPaused, activeEffects]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {!gameState.isPlaying && (
        <button
          onClick={startGame}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          Start Game
        </button>
      )}
    </div>
  );
};

export default GameCanvas;
