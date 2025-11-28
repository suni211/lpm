export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  totalScore: number;
  totalPlays: number;
  level: number;
  experience: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  duration: number;
  audio_file_path: string;
  cover_image_url?: string;
  bga_video_url?: string;
  preview_start: number;
  genre?: string;
  description?: string;
  status: 'ACTIVE' | 'HIDDEN' | 'MAINTENANCE';
  beatmap_count?: number;
  beatmaps?: Beatmap[];
}

export interface Beatmap {
  id: string;
  song_id: string;
  difficulty_name: string;
  difficulty_level: number;
  key_count: '4' | '5' | '6' | '8';
  note_count: number;
  max_combo: number;
  note_speed: number;
  notes_data: Note[];
  status: 'ACTIVE' | 'TESTING' | 'HIDDEN';
  title?: string;
  artist?: string;
  audio_file_path?: string;
  bga_video_url?: string;
}

export interface Note {
  time: number;
  lane: number;
  type: 'normal' | 'long';
  duration?: number;
}

export interface PlayRecord {
  id: string;
  user_id: string;
  beatmap_id: string;
  score: number;
  accuracy: number;
  max_combo: number;
  perfect_count: number;
  great_count: number;
  good_count: number;
  bad_count: number;
  miss_count: number;
  rank: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  is_full_combo: boolean;
  is_all_perfect: boolean;
  note_speed: number;
  play_date: Date;
}

export interface Judgments {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
}

export interface GameSettings {
  noteSpeed: number;
  keyBindings: { [key: number]: string };
  visualOffset: number;
  audioOffset: number;
}

export interface RankingEntry {
  position?: number;
  id?: string;
  user_id?: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  level?: number;
  total_score?: number;
  score?: number;
  accuracy: number;
  max_combo?: number;
  rank?: 'SSS' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  is_full_combo?: boolean;
  is_all_perfect?: boolean;
  achieved_at?: Date;
}
