import type { Note, Judgments, Effect } from '../types';

export interface JudgmentTiming {
  perfect: number;
  great: number;
  good: number;
  bad: number;
}

export type JudgmentType = 'perfect' | 'great' | 'good' | 'bad' | 'miss';

type NearestNote = {
  note: Note;
  index: number;
  timeDiff: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: Note[];
  private effects: Effect[];
  private keyCount: number;
  private audio: HTMLAudioElement;
  private noteSpeed: number;

  private startTime: number = 0;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private leadTime: number = 5000; // 5초 준비 시간 (노트가 내려오는 시간)

  // Game state
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private judgments: Judgments = {
    perfect: 0,
    great: 0,
    good: 0,
    bad: 0,
    miss: 0
  };

  // Visual
  private bgaVideo?: HTMLVideoElement;
  private gearY: number;
  private hitZoneY: number;
  private judmentText: string = '';
  private judgmentAlpha: number = 0;

  // Hit effects
  private hitEffects: Array<{ lane: number; alpha: number; time: number }> = [];
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
    size: number;
  }> = [];

  // Timing windows (milliseconds)
  private timingWindows: JudgmentTiming = {
    perfect: 40,
    great: 80,
    good: 120,
    bad: 160
  };

  // Key states
  private keysPressed: Set<string> = new Set();
  private processedNotes: Set<number> = new Set();
  private activeLongNotes: Map<number, { noteIndex: number; startTime: number }> = new Map();

  // Touch states (모바일 지원)
  private touchLanes: Map<number, number> = new Map(); // touchId -> lane
  private isMobile: boolean = false;

  // Callbacks
  private onScoreUpdate?: (score: number, combo: number, judgments: Judgments) => void;
  private onGameEnd?: (finalScore: number, judgments: Judgments, maxCombo: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    notes: Note[],
    keyCount: number,
    audio: HTMLAudioElement,
    noteSpeed: number = 5.0,
    bgaVideo?: HTMLVideoElement,
    effects: Effect[] = []
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.notes = notes.sort((a, b) => a.time - b.time);
    this.effects = effects.sort((a, b) => a.startTime - b.startTime);
    this.keyCount = keyCount;
    this.audio = audio;
    this.noteSpeed = noteSpeed;
    this.bgaVideo = bgaVideo;

    // Calculate positions
    this.gearY = canvas.height * 0.9;
    this.hitZoneY = this.gearY;

    // 모바일 감지
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    const keyBindings = this.getKeyBindings();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.isPlaying || this.isPaused) return;

      const keyCode = e.code;
      const laneIndex = keyBindings.indexOf(keyCode);
      if (laneIndex !== -1 && !this.keysPressed.has(keyCode)) {
        this.keysPressed.add(keyCode);
        this.handleKeyPress(laneIndex);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyCode = e.code;
      this.keysPressed.delete(keyCode);

      if (!this.isPlaying || this.isPaused) return;

      const laneIndex = keyBindings.indexOf(keyCode);
      if (laneIndex !== -1) {
        this.handleKeyRelease(laneIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 터치 이벤트 (모바일)
    if (this.isMobile) {
      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (!this.isPlaying || this.isPaused) return;

        const rect = this.canvas.getBoundingClientRect();
        const centerX = this.canvas.width / 2;
        const gearWidth = this.calculateGearWidth();
        const laneWidth = gearWidth / this.keyCount;
        const gearLeft = centerX - gearWidth / 2;

        Array.from(e.changedTouches).forEach(touch => {
          const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);

          // 터치가 gear 영역 내에 있는지 확인
          if (x >= gearLeft && x <= gearLeft + gearWidth) {
            const lane = Math.floor((x - gearLeft) / laneWidth);
            if (lane >= 0 && lane < this.keyCount) {
              this.touchLanes.set(touch.identifier, lane);
              this.handleKeyPress(lane);
            }
          }
        });
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        if (!this.isPlaying || this.isPaused) return;

        Array.from(e.changedTouches).forEach(touch => {
          const lane = this.touchLanes.get(touch.identifier);
          if (lane !== undefined) {
            this.handleKeyRelease(lane);
            this.touchLanes.delete(touch.identifier);
          }
        });
      };

      this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }
  }

  private getKeyBindings(): string[] {
    // Key bindings using KeyCode (physical key position - works regardless of language input)
    const bindings: { [key: number]: string[] } = {
      4: ['KeyD', 'KeyF', 'KeyJ', 'KeyK'],
      5: ['KeyD', 'KeyF', 'Space', 'KeyJ', 'KeyK'],
      6: ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'],
      8: ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon']
    };

    return bindings[this.keyCount] || bindings[4];
  }

  private handleKeyPress(lane: number) {
    // Find nearest note in this lane
    let nearestNote: NearestNote | null = null;

    this.notes.forEach((note, index) => {
      if (note.lane === lane && !this.processedNotes.has(index)) {
        const noteTiming = this.startTime + note.time;
        const timeDiff = Math.abs(this.currentTime - noteTiming);

        if (timeDiff <= this.timingWindows.bad) {
          if (!nearestNote || timeDiff < nearestNote.timeDiff) {
            nearestNote = { note, index, timeDiff } as NearestNote;
          }
        }
      }
    });

    if (nearestNote) {
      const note = nearestNote as NearestNote;
      const judgment = this.calculateJudgment(note.timeDiff);

      if (note.note.type === 'long') {
        // 롱노트 시작
        this.activeLongNotes.set(lane, { noteIndex: note.index, startTime: this.currentTime });
        this.processJudgment(judgment, lane);
      } else {
        // 일반 노트
        this.processJudgment(judgment, lane);
        this.processedNotes.add(note.index);
      }
    }
  }

  private handleKeyRelease(lane: number) {
    const activeLongNote = this.activeLongNotes.get(lane);

    if (activeLongNote) {
      const note = this.notes[activeLongNote.noteIndex];

      if (note && note.type === 'long' && note.duration) {
        const expectedEndTime = this.startTime + note.time + note.duration;
        const timeDiff = Math.abs(this.currentTime - expectedEndTime);

        // 롱노트 끝 판정
        const judgment = this.calculateJudgment(timeDiff);
        this.processJudgment(judgment, lane);

        this.processedNotes.add(activeLongNote.noteIndex);
        this.activeLongNotes.delete(lane);
      }
    }
  }

  private calculateJudgment(timeDiff: number): JudgmentType {
    if (timeDiff <= this.timingWindows.perfect) return 'perfect';
    if (timeDiff <= this.timingWindows.great) return 'great';
    if (timeDiff <= this.timingWindows.good) return 'good';
    if (timeDiff <= this.timingWindows.bad) return 'bad';
    return 'miss';
  }

  private processJudgment(judgment: JudgmentType, lane?: number) {
    this.judgments[judgment]++;

    if (judgment !== 'miss' && judgment !== 'bad') {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
    } else {
      this.combo = 0;
    }

    // Update score
    const points = {
      perfect: 100,
      great: 70,
      good: 40,
      bad: 10,
      miss: 0
    };

    this.score += points[judgment] + Math.floor(this.combo / 10);

    // Visual feedback - 재미있는 텍스트
    const judgmentTexts: { [key in JudgmentType]: string } = {
      perfect: 'YAS!',
      great: 'OH',
      good: 'GOOD',
      bad: 'AH...',
      miss: 'FUCK!'
    };
    this.judmentText = judgmentTexts[judgment];
    this.judgmentAlpha = 1.0;

    // Hit effects (파티클 및 플래시)
    if (lane !== undefined && judgment !== 'miss') {
      this.createHitEffect(lane, judgment);
    }

    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.combo, this.judgments);
    }
  }

  private createHitEffect(lane: number, judgment: JudgmentType) {
    // 히트 플래시 효과
    this.hitEffects.push({
      lane,
      alpha: 1.0,
      time: performance.now()
    });

    // 파티클 생성
    const centerX = this.canvas.width / 2;
    const gearWidth = this.calculateGearWidth();
    const laneWidth = gearWidth / this.keyCount;
    const gearLeft = centerX - gearWidth / 2;
    const laneX = gearLeft + lane * laneWidth + laneWidth / 2;

    const particleCount = judgment === 'perfect' ? 15 : judgment === 'great' ? 10 : 5;
    const colors = {
      perfect: '#00ff00',
      great: '#ffff00',
      good: '#ff9900',
      bad: '#ff3300',
      miss: '#ff0000'
    };

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: laneX,
        y: this.hitZoneY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1.0,
        color: colors[judgment],
        size: 3 + Math.random() * 2
      });
    }
  }

  public start() {
    this.isPlaying = true;
    // 시작 시간을 leadTime만큼 과거로 설정 (노트가 미리 내려오도록)
    this.startTime = performance.now() - this.leadTime;

    // 5초 후 오디오 재생
    setTimeout(() => {
      this.audio.play();

      if (this.bgaVideo) {
        this.bgaVideo.play();
      }
    }, this.leadTime);

    this.gameLoop();
  }

  public pause() {
    this.isPaused = true;
    this.audio.pause();

    if (this.bgaVideo) {
      this.bgaVideo.pause();
    }
  }

  public resume() {
    this.isPaused = false;
    this.audio.play();

    if (this.bgaVideo) {
      this.bgaVideo.play();
    }

    this.gameLoop();
  }

  public stop() {
    this.isPlaying = false;
    this.audio.pause();

    if (this.bgaVideo) {
      this.bgaVideo.pause();
    }
  }

  private gameLoop = () => {
    if (!this.isPlaying || this.isPaused) return;

    this.currentTime = performance.now();
    const elapsedTime = this.currentTime - this.startTime;

    // Check for missed notes
    this.checkMissedNotes(elapsedTime);

    // Render
    this.render(elapsedTime);

    // Check if game ended
    if (this.audio.ended || elapsedTime > this.audio.duration * 1000 + 3000) {
      this.endGame();
      return;
    }

    requestAnimationFrame(this.gameLoop);
  };

  private checkMissedNotes(elapsedTime: number) {
    this.notes.forEach((note, index) => {
      if (this.processedNotes.has(index)) return;

      // 롱노트가 현재 활성화되어 있으면 건너뛰기
      const isActiveLongNote = Array.from(this.activeLongNotes.values()).some(
        active => active.noteIndex === index
      );
      if (isActiveLongNote) return;

      // 일반 노트 또는 롱노트 시작 시간 체크
      const noteTiming = note.time;
      const missThreshold = noteTiming + this.timingWindows.bad;

      // 롱노트인 경우 끝 시간 기준으로 체크
      if (note.type === 'long' && note.duration) {
        const endTiming = note.time + note.duration;
        const endMissThreshold = endTiming + this.timingWindows.bad;

        if (elapsedTime > endMissThreshold) {
          this.processJudgment('miss');
          this.processedNotes.add(index);
        }
      } else {
        // 일반 노트
        if (elapsedTime > missThreshold) {
          this.processJudgment('miss');
          this.processedNotes.add(index);
        }
      }
    });
  }

  private applyEffects(elapsedTime: number) {
    // 현재 활성화된 효과들 찾기
    const activeEffects = this.effects.filter(effect => {
      const effectStart = effect.startTime;
      const effectEnd = effect.startTime + effect.duration;
      return elapsedTime >= effectStart && elapsedTime <= effectEnd;
    });

    // 각 효과 적용
    activeEffects.forEach(effect => {
      const progress = (elapsedTime - effect.startTime) / effect.duration;
      const intensity = (effect.intensity || 100) / 100;

      switch (effect.type) {
        case 'blackout':
          this.ctx.fillStyle = `rgba(0, 0, 0, ${intensity})`;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          break;

        case 'fadeout':
          const fadeOutAlpha = this.easeValue(progress, effect.easing) * intensity;
          this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeOutAlpha})`;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          break;

        case 'fadein':
          const fadeInAlpha = (1 - this.easeValue(progress, effect.easing)) * intensity;
          this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeInAlpha})`;
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          break;

        case 'blur':
          this.ctx.filter = `blur(${intensity * 10}px)`;
          break;

        case 'distortion':
          const distortAmount = Math.sin(progress * Math.PI * 4) * intensity * 20;
          this.ctx.setTransform(1, Math.sin(progress * Math.PI * 2) * 0.1 * intensity, 0, 1, distortAmount, 0);
          break;

        case 'shake':
          const shakeX = (Math.random() - 0.5) * intensity * 20;
          const shakeY = (Math.random() - 0.5) * intensity * 20;
          this.ctx.translate(shakeX, shakeY);
          break;

        case 'zoom':
          const scale = 1 + (this.easeValue(progress, effect.easing) * intensity * 0.5);
          const centerX = this.canvas.width / 2;
          const centerY = this.canvas.height / 2;
          this.ctx.translate(centerX, centerY);
          this.ctx.scale(scale, scale);
          this.ctx.translate(-centerX, -centerY);
          break;

        case 'spin':
          const angle = this.easeValue(progress, effect.easing) * Math.PI * 2 * intensity;
          const cx = this.canvas.width / 2;
          const cy = this.canvas.height / 2;
          this.ctx.translate(cx, cy);
          this.ctx.rotate(angle);
          this.ctx.translate(-cx, -cy);
          break;

        case 'invert':
          this.ctx.filter = `invert(${intensity * 100}%)`;
          break;
      }
    });
  }

  private easeValue(t: number, easing?: string): number {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - (1 - t) * (1 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: // linear
        return t;
    }
  }

  private resetEffects() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.filter = 'none';
  }

  private render(elapsedTime: number) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 효과 적용 전 상태 저장
    this.ctx.save();

    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a2a');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw BGA (전체 화면 배경)
    if (this.bgaVideo && this.bgaVideo.readyState >= 2) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.4; // 배경 투명도

      // 비디오를 캔버스 크기에 맞게 조정
      const videoAspect = this.bgaVideo.videoWidth / this.bgaVideo.videoHeight;
      const canvasAspect = this.canvas.width / this.canvas.height;

      let drawWidth = this.canvas.width;
      let drawHeight = this.canvas.height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > canvasAspect) {
        // 비디오가 더 넓음 - 높이 기준으로 맞춤
        drawWidth = this.canvas.height * videoAspect;
        offsetX = (this.canvas.width - drawWidth) / 2;
      } else {
        // 비디오가 더 좁음 - 너비 기준으로 맞춤
        drawHeight = this.canvas.width / videoAspect;
        offsetY = (this.canvas.height - drawHeight) / 2;
      }

      this.ctx.drawImage(this.bgaVideo, offsetX, offsetY, drawWidth, drawHeight);
      this.ctx.restore();
    }

    // Draw gear (note lanes)
    this.drawGear();

    // Draw notes
    this.drawNotes(elapsedTime);

    // Draw hit zone
    this.drawHitZone();

    // Draw UI elements
    this.drawUI();

    // Draw hit effects
    this.drawHitEffects();

    // Draw particles
    this.drawParticles();

    // Draw judgment text
    this.drawJudgment();

    // Update and fade out effects
    if (this.judgmentAlpha > 0) {
      this.judgmentAlpha -= 0.02;
    }

    // Update particles
    this.updateParticles();

    // Update hit effects
    this.updateHitEffects();

    // 효과 적용
    this.applyEffects(elapsedTime);

    // 효과 적용 후 상태 복원
    this.ctx.restore();

    // 효과 리셋 (다음 프레임을 위해)
    this.resetEffects();
  }

  private calculateGearWidth(): number {
    const laneWidth = 80;
    return this.keyCount * laneWidth;
  }

  private drawUI() {
    const centerX = this.canvas.width / 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3; // 더 반투명 (30%)

    // Draw combo (center top, like DJMAX)
    if (this.combo > 0) {
      this.ctx.font = 'bold 64px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(this.combo.toString(), centerX, 50);
    }

    // Calculate accuracy
    const totalNotes = Object.values(this.judgments).reduce((a, b) => a + b, 0);
    const accuracy = totalNotes > 0
      ? ((this.judgments.perfect * 100 + this.judgments.great * 70 + this.judgments.good * 40 + this.judgments.bad * 10) / (totalNotes * 100) * 100)
      : 100;

    // Draw MAX percentage (top center, below combo or instead of combo)
    this.ctx.font = 'bold 32px Arial';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const maxText = `MAX ${accuracy.toFixed(1)}%`;
    this.ctx.fillText(maxText, centerX, this.combo > 0 ? 130 : 80);

    // Draw speed indicator (bottom right)
    this.ctx.font = '24px Arial';
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`SPEED: ${this.noteSpeed.toFixed(1)}x`, this.canvas.width - 30, this.canvas.height - 30);

    // Draw score (top left)
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`SCORE: ${this.score.toLocaleString()}`, 30, 30);

    this.ctx.restore();
  }

  private drawGear() {
    const centerX = this.canvas.width / 2;
    const gearWidth = this.calculateGearWidth();
    const laneWidth = gearWidth / this.keyCount;
    const gearLeft = centerX - gearWidth / 2;
    const gearHeight = this.canvas.height;

    // Draw thin gear background (semi-transparent)
    this.ctx.fillStyle = 'rgba(10, 10, 30, 0.85)';
    this.ctx.fillRect(gearLeft, 0, gearWidth, gearHeight);

    // Draw outer borders (thicker)
    this.ctx.strokeStyle = 'rgba(150, 150, 200, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(gearLeft, 0, gearWidth, gearHeight);

    // Draw lane dividers (thin)
    this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.4)';
    this.ctx.lineWidth = 1;

    for (let i = 1; i < this.keyCount; i++) {
      const x = gearLeft + i * laneWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, gearHeight);
      this.ctx.stroke();
    }

    // Draw pressed key indicators
    this.keysPressed.forEach((keyCode) => {
      const keyBindings = this.getKeyBindings();
      const laneIndex = keyBindings.indexOf(keyCode);
      if (laneIndex !== -1) {
        const x = gearLeft + laneIndex * laneWidth;
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        this.ctx.fillRect(x, 0, laneWidth, gearHeight);
      }
    });
  }

  private drawNotes(elapsedTime: number) {
    const centerX = this.canvas.width / 2;
    const gearWidth = this.calculateGearWidth();
    const laneWidth = gearWidth / this.keyCount;
    const gearLeft = centerX - gearWidth / 2;

    // Draw notes
    this.notes.forEach((note, index) => {
      if (this.processedNotes.has(index)) return;

      const noteTiming = note.time;
      const timeUntilHit = noteTiming - elapsedTime;

      // Calculate note Y position based on time and speed
      const fallDistance = this.hitZoneY;
      const noteY = this.hitZoneY - (timeUntilHit / 1000) * (fallDistance / 2) * this.noteSpeed;

      const laneX = gearLeft + note.lane * laneWidth;
      const noteHeight = 25;
      const notePadding = 5;

      // 롱노트 처리
      if (note.type === 'long' && note.duration) {
        // 롱노트 끝 지점 계산
        const noteEndTiming = note.time + note.duration;
        const timeUntilEnd = noteEndTiming - elapsedTime;
        const noteEndY = this.hitZoneY - (timeUntilEnd / 1000) * (fallDistance / 2) * this.noteSpeed;

        // 롱노트가 화면에 보이는 경우에만 그리기
        if (noteEndY < this.canvas.height + 50 && noteY > -50) {
          const visibleStartY = Math.max(noteEndY, 0);
          const visibleEndY = Math.min(noteY, this.canvas.height);
          const visibleHeight = visibleEndY - visibleStartY;

          if (visibleHeight > 0) {
            // 롱노트 몸통 (세로로 긴 바)
            this.ctx.fillStyle = this.getNoteColor(note.lane);
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillRect(laneX + notePadding + 10, visibleStartY, laneWidth - notePadding * 2 - 20, visibleHeight);
            this.ctx.globalAlpha = 1.0;

            // 롱노트 테두리
            this.ctx.strokeStyle = this.getNoteColor(note.lane);
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(laneX + notePadding + 10, visibleStartY, laneWidth - notePadding * 2 - 20, visibleHeight);
          }

          // 롱노트 시작 부분 (헤드)
          if (noteY > -50 && noteY < this.canvas.height + 50) {
            this.ctx.shadowColor = this.getNoteColor(note.lane);
            this.ctx.shadowBlur = 10;

            this.ctx.fillStyle = this.getNoteColor(note.lane);
            this.ctx.fillRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);

            this.ctx.shadowBlur = 0;

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);

            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, 4);
          }

          // 롱노트 끝 부분 (테일)
          if (noteEndY > -50 && noteEndY < this.canvas.height + 50) {
            this.ctx.fillStyle = this.getNoteColor(note.lane);
            this.ctx.fillRect(laneX + notePadding, noteEndY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);

            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(laneX + notePadding, noteEndY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);
          }
        }
      } else {
        // 일반 노트
        if (noteY > -50 && noteY < this.canvas.height + 50) {
          // Note shadow/glow
          this.ctx.shadowColor = this.getNoteColor(note.lane);
          this.ctx.shadowBlur = 10;
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;

          // Draw main note body
          this.ctx.fillStyle = this.getNoteColor(note.lane);
          this.ctx.fillRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);

          // Reset shadow
          this.ctx.shadowBlur = 0;

          // Note outline (white border)
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, noteHeight);

          // Highlight on top (for 3D effect)
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.fillRect(laneX + notePadding, noteY - noteHeight / 2, laneWidth - notePadding * 2, 4);
        }
      }
    });
  }

  private getNoteColor(lane: number): string {
    const colors = [
      '#00d4ff',  // Cyan
      '#ff4757',  // Red
      '#ffd700',  // Yellow
      '#7bed9f',  // Green
      '#a29bfe',  // Purple
      '#fd79a8',  // Pink
      '#fdcb6e',  // Orange
      '#6c5ce7'   // Violet
    ];

    return colors[lane % colors.length];
  }

  private drawHitZone() {
    const centerX = this.canvas.width / 2;
    const gearWidth = this.calculateGearWidth();
    const gearLeft = centerX - gearWidth / 2;

    // Draw hit zone background glow
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
    this.ctx.fillRect(gearLeft, this.hitZoneY - 20, gearWidth, 40);

    // Draw hit zone line (glowing effect)
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 15;
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(gearLeft, this.hitZoneY);
    this.ctx.lineTo(gearLeft + gearWidth, this.hitZoneY);
    this.ctx.stroke();

    // Second line for double effect
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(gearLeft, this.hitZoneY);
    this.ctx.lineTo(gearLeft + gearWidth, this.hitZoneY);
    this.ctx.stroke();
  }

  private drawJudgment() {
    if (this.judgmentAlpha > 0) {
      this.ctx.save();

      // 판정 텍스트 더 반투명하게 (40%)
      this.ctx.globalAlpha = this.judgmentAlpha * 0.4;

      // 더 큰 폰트
      this.ctx.font = 'bold 80px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const colors: { [key: string]: string } = {
        'YAS!': '#00ff00',
        'OH': '#ffff00',
        'GOOD': '#ff9900',
        'AH...': '#ff3300',
        'FUCK!': '#ff0000'
      };

      // 빛나는 효과 (더 약하게)
      this.ctx.shadowColor = colors[this.judmentText] || '#ffffff';
      this.ctx.shadowBlur = 20;

      // 텍스트 그리기
      this.ctx.fillStyle = colors[this.judmentText] || '#ffffff';
      this.ctx.fillText(this.judmentText, this.canvas.width / 2, this.canvas.height / 2 - 100);

      // 테두리 그리기 (더 얇게)
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText(this.judmentText, this.canvas.width / 2, this.canvas.height / 2 - 100);

      this.ctx.restore();
    }
  }

  private drawHitEffects() {
    const centerX = this.canvas.width / 2;
    const gearWidth = this.calculateGearWidth();
    const laneWidth = gearWidth / this.keyCount;
    const gearLeft = centerX - gearWidth / 2;

    this.hitEffects.forEach(effect => {
      if (effect.alpha > 0) {
        const laneX = gearLeft + effect.lane * laneWidth;

        this.ctx.save();
        // 플래시도 반투명하게 (30%)
        this.ctx.globalAlpha = effect.alpha * 0.3;

        // 플래시 효과
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(laneX, this.hitZoneY - 50, laneWidth, 100);

        this.ctx.restore();
      }
    });
  }

  private drawParticles() {
    this.particles.forEach(particle => {
      if (particle.alpha > 0) {
        this.ctx.save();
        // 파티클도 살짝 반투명하게 (70%)
        this.ctx.globalAlpha = particle.alpha * 0.7;

        // 파티클 빛나는 효과 (약하게)
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = 5;

        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      }
    });
  }

  private updateParticles() {
    // 파티클 업데이트
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.2; // 중력
      particle.alpha -= 0.02;

      return particle.alpha > 0;
    });
  }

  private updateHitEffects() {
    // 히트 이펙트 업데이트
    this.hitEffects = this.hitEffects.filter(effect => {
      effect.alpha -= 0.1;
      return effect.alpha > 0;
    });
  }

  private endGame() {
    this.stop();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.judgments, this.maxCombo);
    }
  }

  public setOnScoreUpdate(callback: (score: number, combo: number, judgments: Judgments) => void) {
    this.onScoreUpdate = callback;
  }

  public setOnGameEnd(callback: (finalScore: number, judgments: Judgments, maxCombo: number) => void) {
    this.onGameEnd = callback;
  }

  public getScore(): number {
    return this.score;
  }

  public getCombo(): number {
    return this.combo;
  }

  public getJudgments(): Judgments {
    return { ...this.judgments };
  }
}
