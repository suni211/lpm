// User & Team Types
export interface User {
  id: string;
  google_id: string;
  email: string;
  display_name?: string;
  profile_picture?: string;
  created_at: Date;
  last_login: Date;
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
  created_at: Date;
}

// Card Types
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
  created_at: Date;
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
  created_at: Date;
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
  created_at: Date;
}

export interface SupportCard {
  id: string;
  support_name: string;
  support_image?: string;
  effect_description: string;
  effect_type: string;
  effect_value: number;
  rarity: 'NORMAL' | 'RARE' | 'EPIC' | 'LEGEND';
  created_at: Date;
}

// User Card Inventory
export interface UserPlayerCard {
  id: string;
  user_id: string;
  player_card_id: string;
  level: number;
  experience: number;
  condition: 'RED' | 'ORANGE' | 'YELLOW' | 'BLUE' | 'PURPLE';
  form: number;
  is_injured: boolean;
  injury_recovery_date?: Date;
  burnout: boolean;
  games_played: number;
  total_wins: number;
  popularity: number;
  traits: string[];
  in_roster: boolean;
  acquired_at: Date;
}

// Match Types
export interface Match {
  id: string;
  match_type: 'RANKED' | 'FRIENDLY';
  team1_id: string;
  team2_id: string;
  winner_id?: string;
  team1_power: number;
  team2_power: number;
  phase1_result: any;
  phase2_result: any;
  phase3_result: any;
  match_log: any;
  lp_change: number;
  played_at: Date;
}

// Roster
export interface Roster {
  id: string;
  team_id: string;
  top_player_id?: string;
  jungle_player_id?: string;
  mid_player_id?: string;
  adc_player_id?: string;
  support_player_id?: string;
  top_tactic_id?: string;
  jungle_tactic_id?: string;
  mid_tactic_id?: string;
  adc_tactic_id?: string;
  support_tactic_id?: string;
  support_card_id?: string;
  total_cost: number;
  team_chemistry: number;
  updated_at: Date;
}

// Guild
export interface Guild {
  id: string;
  guild_name: string;
  guild_tag: string;
  guild_description?: string;
  guild_logo?: string;
  leader_id: string;
  level: number;
  experience: number;
  max_members: number;
  guild_points: number;
  total_wins: number;
  total_losses: number;
  created_at: Date;
}

// Achievement
export interface Achievement {
  id: string;
  achievement_name: string;
  description: string;
  difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'HELL';
  reward_money: number;
  reward_items?: any;
  condition_type: string;
  condition_value: number;
  created_at: Date;
}

// Posting (Auction)
export interface Posting {
  id: string;
  seller_id: string;
  card_type: 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT';
  card_id: string;
  starting_price: number;
  current_price: number;
  highest_bidder_id?: string;
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED';
  ends_at: Date;
  created_at: Date;
}

// Sponsor
export interface Sponsor {
  id: string;
  sponsor_name: string;
  sponsor_logo?: string;
  required_reputation: number;
  required_fans: number;
  weekly_payment: number;
  bonus_type: string;
  bonus_value: number;
  created_at: Date;
}

// Express Request with User
declare global {
  namespace Express {
    interface User {
      id: string;
      google_id: string;
      email: string;
      display_name?: string;
      profile_picture?: string;
    }
  }
}
