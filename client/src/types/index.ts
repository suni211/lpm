// User & Auth
export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name?: string;
  profile_picture?: string;
}

export interface Team {
  id: string;
  user_id: string;
  team_name: string;
  team_logo?: string;
  slogan?: string;
  balance: number;
  reputation_level: number;
  reputation_points: number;
  fans: number;
  current_tier: string;
  lp: number;
  wins: number;
  losses: number;
  win_streak: number;
}

export interface AuthResponse {
  user: User;
  team: Team | null;
}

// Cards
export interface PlayerCard {
  id: string;
  card_name: string;
  card_image?: string;
  position: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  cost: number;
  mental: number;
  team_fight: number;
  cs_ability: number;
  vision: number;
  judgment: number;
  laning: number;
  power: number;
  rarity: 'NORMAL' | 'RARE' | 'EPIC' | 'LEGEND';
}

export interface UserPlayerCard extends PlayerCard {
  user_card_id: string;
  level: number;
  experience: number;
  condition: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'PURPLE';
  form: number;
  is_injured: boolean;
  burnout: boolean;
  games_played: number;
  total_wins: number;
  popularity: number;
  traits: string[];
  in_roster: boolean;
}

export interface CoachCard {
  id: string;
  coach_name: string;
  coach_image?: string;
  command: number;
  ban_pick: number;
  meta: number;
  cold: number;
  warm: number;
  power: number;
  rarity: 'NORMAL' | 'RARE' | 'EPIC' | 'LEGEND';
}

export interface TacticCard {
  id: string;
  tactic_name: string;
  tactic_image?: string;
  position?: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  effect_description: string;
  effect_type: string;
  effect_value: number;
  rarity: 'NORMAL' | 'RARE' | 'EPIC' | 'LEGEND';
}

export interface SupportCard {
  id: string;
  support_name: string;
  support_image?: string;
  effect_description: string;
  effect_type: string;
  effect_value: number;
  rarity: 'NORMAL' | 'RARE' | 'EPIC' | 'LEGEND';
}

// Gacha Result
export interface GachaResult {
  card_type: 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT';
  card: PlayerCard | CoachCard | TacticCard | SupportCard;
  is_duplicate: boolean; // 중복 여부
  experience_gained?: number; // 중복 시 얻은 경험치
}
