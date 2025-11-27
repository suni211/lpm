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
}

const GameCanvas: React.FC<GameCanvasProps> = ({ beatmap, onGameEnd }) => {
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
          if (playing && gameState.isPlaying && !gameState.isPaused) {
            const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
            setGameState(s => ({ ...s, currentTime }));

            // 이펙트 업데이트
            const activeEffs = beatmap.effect_data.filter(
              eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
            );
            setActiveEffects(activeEffs);

            render(currentTime);
            animationFrameRef.current = requestAnimationFrame(loop);
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
      if (playing && gameState.isPlaying && !gameState.isPaused) {
        const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
        setGameState(s => ({ ...s, currentTime }));

        // 이펙트 업데이트
        const activeEffs = beatmap.effect_data.filter(
          eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
        );
        setActiveEffects(activeEffs);

        render(currentTime);
        animationFrameRef.current = requestAnimationFrame(gameLoop);
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

    // 레인 그리기
    const laneWidth = width / beatmap.key_count;
    for (let i = 0; i <= beatmap.key_count; i++) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    // 판정선
    const judgementLineY = height * 0.85;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, judgementLineY);
    ctx.lineTo(width, judgementLineY);
    ctx.stroke();

    // 노트 그리기
    beatmap.note_data.forEach(note => {
      if (processedNotes.current.has(note.id)) return;
      if (!isNoteVisible(note.timestamp, currentTime, settings.noteSpeed)) return;

      const x = note.lane * laneWidth;
      const y = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, height);

      if (note.type === NoteType.LONG && note.duration) {
        const noteLength = calculateLongNoteLength(note.duration, settings.noteSpeed, height);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
        ctx.fillRect(x + 5, y - noteLength, laneWidth - 10, noteLength);
      }

      ctx.fillStyle = note.type === NoteType.SLIDE ? '#ff00ff' : '#00ff00';
      ctx.fillRect(x + 5, y, laneWidth - 10, 10);
    });

    // UI
    renderUI(ctx, width, height);
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
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 20, 40);
    ctx.fillText(`Combo: ${gameState.combo}`, 20, 70);
    ctx.fillText(`Speed: x${settings.playbackSpeed.toFixed(1)}`, 20, 100);

    // 판정 표시
    recentJudgements.forEach((j, i) => {
      ctx.fillStyle = getJudgementColor(j.type);
      ctx.font = 'bold 48px Arial';
      ctx.fillText(j.type, width / 2 - 50, height / 2 + i * 60);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

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
