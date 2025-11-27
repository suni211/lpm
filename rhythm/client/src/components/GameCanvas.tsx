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

  // localStorage에서 노트 속도 로드
  const loadSettings = () => {
    const savedNoteSpeed = localStorage.getItem('rhythm_noteSpeed');
    const savedPlaybackSpeed = localStorage.getItem('rhythm_playbackSpeed');
    return {
      displaySync: 0,
      noteSpeed: savedNoteSpeed ? parseInt(savedNoteSpeed, 10) : 1, // 1~12배 노트 속도
      playbackSpeed: savedPlaybackSpeed ? parseFloat(savedPlaybackSpeed) : 1.0,
      keyBindings: {
        key4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
        key5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
        key6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']
      }
    };
  };

  const [settings, setSettings] = useState(loadSettings());

  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);
  const [recentJudgements, setRecentJudgements] = useState<Array<{
    type: JudgementType;
    timestamp: number;
    accuracy: number; // 정확도 (0-100)
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

      // 롱노트는 키를 떼면 끝남 (비트맵 녹음과 동일)
      const keyBinding = settings.keyBindings[`key${beatmap.key_count}` as keyof typeof settings.keyBindings];
      const lane = keyBinding.indexOf(e.code);

      if (lane !== -1) {
        // 롱노트를 키를 떼면 끝남
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
      
      // 디버깅: 게임 시작 정보
      console.log('게임 시작:', {
        beatmapId: beatmap.id,
        totalNotes: beatmap.note_data.length,
        noteData: beatmap.note_data.slice(0, 5), // 처음 5개 노트만
        keyCount: beatmap.key_count
      });
      
      // 게임 루프 시작
      const loop = () => {
        if (audioRef.current) {
          const playing = audioRef.current.playing();
          const currentTime = (audioRef.current.seek() as number) * 1000 + settings.displaySync;
          
          setGameState(s => {
            if (!s.isPlaying) return s;
            return { ...s, currentTime, isPlaying: true };
          });

          if (playing) {
            // 이펙트 업데이트
            const activeEffs = beatmap.effect_data.filter(
              eff => currentTime >= eff.timestamp && currentTime <= eff.timestamp + eff.duration
            );
            setActiveEffects(activeEffs);

            // 판정선을 지나친 노트 자동 처리
            checkMissedNotes(currentTime);
            
            // 롱노트를 누르고 있는 동안 지속적으로 업데이트
            updateLongNoteDurations(currentTime);
            
            // 롱노트가 duration 만큼 지났는지 확인 (모든 레인 체크)
            for (let lane = 0; lane < beatmap.key_count; lane++) {
              checkLongNoteRelease(lane);
            }
            
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
          // 롱노트는 키를 누르면 시작하고, duration 만큼 지날 때까지 계속 유지
          longNotesHeld.current.set(note.id, true);
        } else {
          // 일반 노트는 즉시 처리
          processedNotes.current.add(note.id);
        }

        // 정확도 계산 후 판정 표시
        const tempTotal = newJudgements.yas + newJudgements.oh + newJudgements.ah + newJudgements.fuck;
        const tempAccuracy = tempTotal > 0
          ? Math.round(((newJudgements.yas * 100 + newJudgements.oh * 70 + newJudgements.ah * 40) / tempTotal) * 100) / 100
          : 0;
        
        // 정확도에 따른 최종 판정 결정
        const finalJudgement = tempAccuracy >= 100 ? JudgementType.YAS
          : tempAccuracy >= 70 ? JudgementType.OH
          : tempAccuracy >= 30 ? JudgementType.AH
          : JudgementType.FUCK;
        
        const now = Date.now();
        setRecentJudgements(prev => [...prev, { type: finalJudgement, timestamp: now, accuracy: tempAccuracy }]);
        setTimeout(() => {
          setRecentJudgements(prev => prev.filter(j => j.timestamp !== now));
        }, 1500);

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
          
          // 정확도 계산 후 판정 표시
          const tempTotal = newJudgements.yas + newJudgements.oh + newJudgements.ah + newJudgements.fuck;
          const tempAccuracy = tempTotal > 0
            ? Math.round(((newJudgements.yas * 100 + newJudgements.oh * 70 + newJudgements.ah * 40) / tempTotal) * 100) / 100
            : 0;
          
          const finalJudgement = tempAccuracy >= 100 ? JudgementType.YAS
            : tempAccuracy >= 70 ? JudgementType.OH
            : tempAccuracy >= 30 ? JudgementType.AH
            : JudgementType.FUCK;
          
          const now = Date.now();
          setRecentJudgements(prev => [...prev, { type: finalJudgement, timestamp: now, accuracy: tempAccuracy }]);
          setTimeout(() => {
            setRecentJudgements(prev => prev.filter(j => j.timestamp !== now));
          }, 1500);
          
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
    // 롱노트는 키를 떼면 끝남 (비트맵 녹음과 동일)
    // 현재 누르고 있는 롱노트를 찾아서 처리
    beatmap.note_data
      .filter(note => 
        note.lane === lane && 
        note.type === NoteType.LONG && 
        longNotesHeld.current.get(note.id) &&
        !processedNotes.current.has(note.id)
      )
      .forEach(note => {
        // 롱노트는 duration이 필수
        if (!note.duration) return;
        
        const currentTime = (audioRef.current?.seek() as number || 0) * 1000;
        const holdTime = currentTime - note.timestamp;

        // 롱노트가 시작되었고 아직 끝나지 않았는지 확인
        if (holdTime >= 0 && holdTime < note.duration) {
          // 롱노트를 키를 떼면 끝남
          // holdTime이 duration의 80% 이상이면 성공, 아니면 실패
          if (holdTime >= note.duration * 0.8) {
            // 롱노트 성공 (80% 이상 누름)
            const combo = calculateLongNoteCombo(note.duration);
            processedNotes.current.add(note.id);
            longNotesHeld.current.delete(note.id);
            setGameState(s => ({
              ...s,
              combo: s.combo + combo,
              maxCombo: Math.max(s.maxCombo, s.combo + combo)
            }));
          } else {
            // 롱노트 실패 (80% 미만)
            processedNotes.current.add(note.id);
            longNotesHeld.current.delete(note.id);
            setGameState(s => {
              const newJudgements = { ...s.judgements };
              newJudgements.fuck++;
              
              // 정확도 계산 후 판정 표시
              const tempTotal = newJudgements.yas + newJudgements.oh + newJudgements.ah + newJudgements.fuck;
              const tempAccuracy = tempTotal > 0
                ? Math.round(((newJudgements.yas * 100 + newJudgements.oh * 70 + newJudgements.ah * 40) / tempTotal) * 100) / 100
                : 0;
              
              const finalJudgement = tempAccuracy >= 100 ? JudgementType.YAS
                : tempAccuracy >= 70 ? JudgementType.OH
                : tempAccuracy >= 30 ? JudgementType.AH
                : JudgementType.FUCK;
              
              const now = Date.now();
              setRecentJudgements(prev => [...prev, { type: finalJudgement, timestamp: now, accuracy: tempAccuracy }]);
              setTimeout(() => {
                setRecentJudgements(prev => prev.filter(j => j.timestamp !== now));
              }, 1500);
              
              return { ...s, combo: 0, judgements: newJudgements };
            });
          }
        } else if (note.duration && holdTime >= note.duration) {
          // 롱노트가 이미 끝났으면 완료 처리
          if (longNotesHeld.current.get(note.id)) {
            const combo = calculateLongNoteCombo(note.duration);
            processedNotes.current.add(note.id);
            longNotesHeld.current.delete(note.id);
            setGameState(s => ({
              ...s,
              combo: s.combo + combo,
              maxCombo: Math.max(s.maxCombo, s.combo + combo)
            }));
          }
        }
      });
  };

  // 정확도에 따른 판정 텍스트 결정
  const getJudgementText = (accuracy: number): string => {
    if (accuracy >= 100) return 'YAS';
    if (accuracy >= 70) return 'OH!';
    if (accuracy >= 30) return 'AH...';
    return 'FUCK';
  };


  const endGame = () => {
    setGameState(s => ({ ...s, isPlaying: false }));
    setIsGameStarted(false);
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = 0;

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

    // 이펙트 적용
    applyEffects(ctx, width, height);

    if (isMultiplayer) {
      // 멀티플레이 모드: 왼쪽(내꺼), 오른쪽(상대방꺼), 중간(점수차이)
      renderMultiplayer(ctx, width, height, currentTime);
    } else {
      // 솔로 플레이 모드: 새로운 UI 스타일
      renderSolo(ctx, width, height, currentTime);
    }

    // UI
    renderUI(ctx, width, height);
  };

  const renderSolo = (ctx: CanvasRenderingContext2D, width: number, height: number, currentTime: number) => {
    // 전체 배경 (검은색)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // 메탈릭 프레임 (은색-회색, 좌우 하단)
    const frameThickness = 15;
    const frameGradient = ctx.createLinearGradient(0, 0, width, 0);
    frameGradient.addColorStop(0, '#e8e8e8');
    frameGradient.addColorStop(0.5, '#c0c0c0');
    frameGradient.addColorStop(1, '#a8a8a8');
    ctx.fillStyle = frameGradient;
    
    // 왼쪽 프레임
    ctx.fillRect(0, 0, frameThickness, height);
    // 오른쪽 프레임 (스크롤바 영역 포함)
    ctx.fillRect(width - 50, 0, 50, height);
    // 하단 프레임
    ctx.fillRect(0, height - 80, width, 80);
    
    // 하단 프레임 그라데이션 (청록색 계열)
    const bottomGradient = ctx.createLinearGradient(0, height - 80, 0, height);
    bottomGradient.addColorStop(0, '#00a0a0');
    bottomGradient.addColorStop(1, '#008080');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, height - 30, width, 30);
    
    // 플레이 필드 (검은색 중앙 영역)
    const playAreaX = frameThickness;
    const playAreaWidth = width - frameThickness - 50; // 오른쪽 스크롤바 제외
    const playAreaY = 0;
    const playAreaHeight = height - 80; // 하단 버튼 영역 제외
    
    ctx.fillStyle = '#000';
    ctx.fillRect(playAreaX, playAreaY, playAreaWidth, playAreaHeight);
    
    // 판정선 영역 (하단 빨간색 그라데이션)
    const judgementLineY = playAreaHeight - 20;
    const gradientRed = ctx.createLinearGradient(playAreaX, judgementLineY, playAreaX, playAreaHeight);
    gradientRed.addColorStop(0, 'rgba(139, 0, 0, 0.9)'); // 진한 빨강
    gradientRed.addColorStop(0.5, 'rgba(139, 0, 0, 0.5)');
    gradientRed.addColorStop(1, 'rgba(139, 0, 0, 0)'); // 투명
    ctx.fillStyle = gradientRed;
    ctx.fillRect(playAreaX, judgementLineY, playAreaWidth, playAreaHeight - judgementLineY);
    
    // 판정선 (얇은 파란색 선)
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playAreaX, judgementLineY);
    ctx.lineTo(playAreaX + playAreaWidth, judgementLineY);
    ctx.stroke();

    // 레인 구분선 (얇은 흰색 선)
    const laneWidth = playAreaWidth / beatmap.key_count;
    const laneStartY = playAreaY;

    for (let i = 0; i <= beatmap.key_count; i++) {
      const x = playAreaX + i * laneWidth;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, laneStartY);
      ctx.lineTo(x, playAreaHeight);
      ctx.stroke();
    }
    
    // 하단 버튼 영역 (7개 버튼: 흰색, 파란색, 흰색, 노란색, 흰색, 파란색, 흰색)
    const buttonAreaY = height - 70;
    const buttonHeight = 40;
    const buttonWidth = playAreaWidth / beatmap.key_count;
    const buttonColors = ['#fff', '#0066ff', '#fff', '#ffd700', '#fff', '#0066ff', '#fff'];
    
    for (let i = 0; i < beatmap.key_count; i++) {
      const buttonX = playAreaX + i * buttonWidth;
      const color = buttonColors[i % buttonColors.length];
      
      // 버튼 배경
      ctx.fillStyle = color;
      ctx.fillRect(buttonX + 2, buttonAreaY + 2, buttonWidth - 4, buttonHeight);
      
      // 버튼 3D 효과 (상단 하이라이트)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(buttonX + 2, buttonAreaY + 2, buttonWidth - 4, buttonHeight / 3);
      
      // 버튼 3D 효과 (하단 그림자)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(buttonX + 2, buttonAreaY + buttonHeight - buttonHeight / 3, buttonWidth - 4, buttonHeight / 3);
    }
    
    // "JAM" 레이블 (하단 중앙)
    ctx.fillStyle = '#00a0a0';
    ctx.fillRect(playAreaX, height - 30, playAreaWidth, 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JAM', playAreaX + playAreaWidth / 2, height - 20);
    
    // 오른쪽 스크롤바 (은색 원통형)
    const scrollbarX = width - 45;
    const scrollbarWidth = 30;
    const scrollbarY = 0;
    const scrollbarHeight = playAreaHeight;
    
    // 스크롤바 배경 (은색 그라데이션)
    const scrollbarGradient = ctx.createLinearGradient(scrollbarX, 0, scrollbarX + scrollbarWidth, 0);
    scrollbarGradient.addColorStop(0, '#d8d8d8');
    scrollbarGradient.addColorStop(0.5, '#b0b0b0');
    scrollbarGradient.addColorStop(1, '#888888');
    ctx.fillStyle = scrollbarGradient;
    
    // 둥근 사각형 그리기
    ctx.beginPath();
    const radius = 15;
    ctx.moveTo(scrollbarX + radius, scrollbarY);
    ctx.lineTo(scrollbarX + scrollbarWidth - radius, scrollbarY);
    ctx.quadraticCurveTo(scrollbarX + scrollbarWidth, scrollbarY, scrollbarX + scrollbarWidth, scrollbarY + radius);
    ctx.lineTo(scrollbarX + scrollbarWidth, scrollbarY + scrollbarHeight - radius);
    ctx.quadraticCurveTo(scrollbarX + scrollbarWidth, scrollbarY + scrollbarHeight, scrollbarX + scrollbarWidth - radius, scrollbarY + scrollbarHeight);
    ctx.lineTo(scrollbarX + radius, scrollbarY + scrollbarHeight);
    ctx.quadraticCurveTo(scrollbarX, scrollbarY + scrollbarHeight, scrollbarX, scrollbarY + scrollbarHeight - radius);
    ctx.lineTo(scrollbarX, scrollbarY + radius);
    ctx.quadraticCurveTo(scrollbarX, scrollbarY, scrollbarX + radius, scrollbarY);
    ctx.closePath();
    ctx.fill();
    
    // 스크롤바 인디케이터 (진행률에 따라, 어두운 회색)
    const audioDuration = (audioRef.current?.duration() || 1) * 1000;
    const progress = Math.min(1, Math.max(0, currentTime / audioDuration));
    const indicatorHeight = 30;
    const indicatorY = scrollbarY + (scrollbarHeight - indicatorHeight) * progress;
    ctx.fillStyle = '#505050';
    ctx.fillRect(scrollbarX + 5, indicatorY, scrollbarWidth - 10, indicatorHeight);

    // 노트 그리기 (세로로 길고 얇게)
    // 디버깅: 노트 데이터 확인
    if (beatmap.note_data.length === 0) {
      console.warn('비트맵에 노트가 없습니다:', beatmap);
    } else {
      // 첫 프레임에만 로그 출력
      if (currentTime < 100) {
        console.log('노트 렌더링 시작:', {
          totalNotes: beatmap.note_data.length,
          currentTime,
          noteSpeed: settings.noteSpeed,
          playAreaX,
          playAreaWidth,
          laneWidth,
          laneStartY,
          judgementLineY
        });
      }
    }
    
    let visibleNotesCount = 0;
    beatmap.note_data.forEach(note => {
      if (processedNotes.current.has(note.id)) return;
      
      const x = playAreaX + note.lane * laneWidth;
      const laneStartY = playAreaY;
      const laneHeight = playAreaHeight;
      const y = calculateNoteYPosition(note.timestamp, currentTime, settings.noteSpeed, laneHeight, laneStartY, judgementLineY);

      // 노트가 화면 범위 내에 있는지 확인 (더 관대하게)
      // 노트가 위쪽에서 아래쪽으로 내려오므로, laneStartY(위) ~ judgementLineY(아래) 사이에 있으면 표시
      if (y > judgementLineY + 100) return; // 판정선을 많이 지나간 노트는 표시하지 않음
      if (y < laneStartY - 500) return; // 아직 보이지 않는 위치의 노트는 표시하지 않음 (더 위쪽까지 허용)
      
      // 노트가 보이는 범위 내에 있으면 렌더링
      visibleNotesCount++;

      if (note.type === NoteType.LONG) {
        // 롱노트: 위에서 아래로 내려오는 긴 노트
        const holdTime = currentTime - note.timestamp;
        const isHeld = longNotesHeld.current.get(note.id);
        
        // 롱노트가 보이는 범위 내에 있는지 확인
        if (holdTime >= -200 && holdTime < (note.duration || 200) + 200) {
          let actualDuration = note.duration || 200;
          
          // 키를 누르고 있으면 현재 시간까지의 duration 계산
          if (isHeld && holdTime > 0 && holdTime < actualDuration) {
            actualDuration = Math.floor(holdTime);
          }
          
          // 롱노트 길이 계산 (위에서 아래로)
          const noteLength = calculateLongNoteLength(actualDuration, settings.noteSpeed, laneHeight);
          
          // 롱노트 시작 위치 (y는 노트의 상단)
          const noteTopY = y;
          const noteBottomY = y + noteLength;
          
          // 롱노트가 보이는 범위 내에 있으면 렌더링
          if (noteBottomY >= laneStartY - 100 && noteTopY <= judgementLineY + 50) {
            // 롱노트 본체 (노란색)
            ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
            ctx.fillRect(x + 1, noteTopY, laneWidth - 2, noteLength);
            
            // 롱노트 시작 부분 (두껍게, 밝은 노란색)
            const noteSize = Math.min(laneWidth * 0.9, 30);
            ctx.fillStyle = 'rgba(255, 255, 0, 1)';
            ctx.fillRect(x + (laneWidth - noteSize) / 2, noteTopY - noteSize / 2, noteSize, noteSize);
            
            // 롱노트 테두리
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, noteTopY, laneWidth - 2, noteLength);
          }
        }
        return;
      }

      // 노트를 두껍고 짧게 (DJMAX 스타일: 정사각형에 가깝게)
      const noteSize = Math.min(laneWidth * 0.9, 25); // 최대 25px, 레인의 90%
      const noteX = x + (laneWidth - noteSize) / 2;
      ctx.fillStyle = '#00ff00'; // 슬라이드 제거, 일반 노트만 녹색
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
        let actualDuration = note.duration || 200;
        
        // 누르고 있으면 실시간 duration 계산 (1ms 단위로 정확하게)
        // 길이 제한 없음 (무한정 길 수 있음)
        if (isHeld) {
          const holdDuration = currentTime - note.timestamp;
          actualDuration = Math.max(actualDuration, Math.floor(holdDuration));
        }
        
        // 롱노트 길이 계산 (위로 올라가도록, 길이 제한 없음)
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

    // 판정 표시 (중앙, 반투명하게)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    recentJudgements.forEach((j, i) => {
      const elapsed = Date.now() - j.timestamp;
      const fadeDuration = 1500; // 1.5초
      const opacity = Math.max(0, 1 - (elapsed / fadeDuration)); // 페이드 아웃
      
      const judgementText = getJudgementText(j.accuracy);
      const color = getJudgementColor(j.type);
      
      // 반투명 효과를 위해 rgba 사용
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`; // 최대 80% 투명도
      ctx.font = 'bold 72px Arial';
      ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
      ctx.lineWidth = 4;
      
      // 텍스트 그림자 효과
      ctx.strokeText(judgementText, width / 2, height / 2 - 50 + i * 80);
      ctx.fillText(judgementText, width / 2, height / 2 - 50 + i * 80);
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }, []);

  // 게임 상태 변경 시 렌더링 (게임 루프가 아닐 때만)
  useEffect(() => {
    if (gameState.isPlaying && animationFrameRef.current === 0) {
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
