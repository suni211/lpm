// 난이도 enum
export enum Difficulty {
  HAMGU = 'HAMGU',
  YETTI = 'YETTI',
  DAIN = 'DAIN',
  KBG = 'KBG',
  MANGO = 'MANGO'
}

// 티어 enum
export enum Tier {
  HAMGU = 'HAMGU',
  YETTI = 'YETTI',
  DAIN = 'DAIN',
  KBG = 'KBG',
  MANGO = 'MANGO'
}

// 판정 타입
export enum JudgementType {
  YAS = 'YAS',
  OH = 'OH',
  AH = 'AH',
  FUCK = 'FUCK'
}

// 노트 타입
export enum NoteType {
  NORMAL = 'NORMAL',
  LONG = 'LONG',
  SLIDE = 'SLIDE'
}

// 이펙트 타입
export enum EffectType {
  ROTATE = 'ROTATE',
  NOISE = 'NOISE',
  ZOOM = 'ZOOM'
}

// 유저 인터페이스
export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  tier: Tier;
  rating: number;
  total_plays: number;
  total_score: number;
  profile_image?: string;
  created_at: string;
}

// 곡 인터페이스
export interface Song {
  id: number;
  title: string;
  artist: string;
  audio_file: string;
  cover_image?: string;
  duration: number;
  bpm: number;
  creator_id: number;
  created_at: string;
}

// 노트 인터페이스
export interface Note {
  id: string;
  type: NoteType;
  lane: number;
  timestamp: number;
  duration?: number;
  slideDirection?: 'left' | 'right';
}

// 이펙트 인터페이스
export interface Effect {
  id: string;
  type: EffectType;
  timestamp: number;
  duration: number;
  intensity: number;
}

// 비트맵 인터페이스
export interface Beatmap {
  id: number;
  song_id: number;
  difficulty: Difficulty;
  key_count: number;
  note_data: Note[];
  effect_data: Effect[];
  creator_id: number;
  total_notes: number;
  max_combo: number;
  level: number;
  is_ranked: boolean;
  created_at: string;
  updated_at: string;
  title?: string;
  artist?: string;
  audio_file?: string;
  cover_image?: string;
  bpm?: number;
}

// 스코어 인터페이스
export interface Score {
  id: number;
  user_id: number;
  beatmap_id: number;
  score: number;
  accuracy: number;
  max_combo: number;
  count_yas: number;
  count_oh: number;
  count_ah: number;
  count_fuck: number;
  mods?: string;
  play_date: string;
}

// 게임 상태
export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  judgements: {
    yas: number;
    oh: number;
    ah: number;
    fuck: number;
  };
}

// 유저 설정
export interface UserSettings {
  display_sync: number;
  note_speed: number;
  playback_speed: number;
  note_skin: string;
  key_bindings: {
    key4: string[];
    key5: string[];
    key6: string[];
  };
  auto_offset: number;
}

// 매치 인터페이스
export interface Match {
  id: number;
  match_type: 'RANK' | 'SOLO';
  status: 'pending' | 'in_progress' | 'finished';
  current_round: number;
  max_rounds: number;
  created_at: string;
  finished_at?: string;
}
