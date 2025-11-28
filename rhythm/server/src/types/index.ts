export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  total_score: number;
  total_plays: number;
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
}

export interface Note {
  time: number; // milliseconds from start
  lane: number; // 0-3 for 4K, 0-4 for 5K, 0-5 for 6K
  type: 'normal' | 'long';
  duration?: number; // for long notes
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

export interface JudgmentResult {
  perfect: number;
  great: number;
  good: number;
  bad: number;
  miss: number;
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    adminId?: string;
    username?: string;
  }
}
