-- LPM Database Schema
-- LoL Pro Manager

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    team_logo TEXT,
    slogan TEXT,
    balance BIGINT DEFAULT 100000000, -- 초기 자금 1억
    reputation_level INTEGER DEFAULT 1, -- 구단주 명성
    reputation_points INTEGER DEFAULT 0,
    fans INTEGER DEFAULT 0, -- 팬덤 수치
    current_tier VARCHAR(20) DEFAULT 'BRONZE',
    lp INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ============================================
-- CARDS SYSTEM
-- ============================================

-- 선수 카드
CREATE TABLE player_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_name VARCHAR(100) NOT NULL,
    card_image TEXT,
    position VARCHAR(20) NOT NULL, -- TOP, JUNGLE, MID, ADC, SUPPORT
    cost INTEGER NOT NULL CHECK (cost >= 1 AND cost <= 10),

    -- 능력치 (1-99)
    mental INTEGER DEFAULT 50 CHECK (mental >= 1 AND mental <= 99),
    team_fight INTEGER DEFAULT 50 CHECK (team_fight >= 1 AND team_fight <= 99),
    cs_ability INTEGER DEFAULT 50 CHECK (cs_ability >= 1 AND cs_ability <= 99),
    vision INTEGER DEFAULT 50 CHECK (vision >= 1 AND vision <= 99),
    judgment INTEGER DEFAULT 50 CHECK (judgment >= 1 AND judgment <= 99),
    laning INTEGER DEFAULT 50 CHECK (laning >= 1 AND laning <= 99),

    power INTEGER GENERATED ALWAYS AS (mental + team_fight + cs_ability + vision + judgment + laning) STORED,

    rarity VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, RARE, EPIC, LEGEND
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 감독 카드
CREATE TABLE coach_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_name VARCHAR(100) NOT NULL,
    coach_image TEXT,

    -- 능력치 (1-99)
    command INTEGER DEFAULT 50 CHECK (command >= 1 AND command <= 99),
    ban_pick INTEGER DEFAULT 50 CHECK (ban_pick >= 1 AND ban_pick <= 99),
    meta INTEGER DEFAULT 50 CHECK (meta >= 1 AND meta <= 99),
    cold INTEGER DEFAULT 50 CHECK (cold >= 1 AND cold <= 99),
    warm INTEGER DEFAULT 50 CHECK (warm >= 1 AND warm <= 99),

    power INTEGER GENERATED ALWAYS AS (command + ban_pick + meta + cold + warm) STORED,

    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 작전 카드
CREATE TABLE tactic_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tactic_name VARCHAR(100) NOT NULL,
    tactic_image TEXT,
    position VARCHAR(20), -- TOP, JUNGLE, MID, ADC, SUPPORT (NULL이면 팀 전체)
    effect_description TEXT,
    effect_type VARCHAR(50), -- STAT_BOOST, PHASE_BONUS 등
    effect_value INTEGER, -- % 증가량
    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 서포트 카드
CREATE TABLE support_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    support_name VARCHAR(100) NOT NULL,
    support_image TEXT,
    effect_description TEXT,
    effect_type VARCHAR(50), -- CONDITION_HEAL, STAT_BOOST, STRATEGY_BUFF
    effect_value INTEGER,
    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER CARD INVENTORY
-- ============================================

-- 유저가 소유한 선수 카드
CREATE TABLE user_player_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    player_card_id UUID REFERENCES player_cards(id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience BIGINT DEFAULT 0,
    condition VARCHAR(20) DEFAULT 'YELLOW', -- RED, ORANGE, YELLOW, BLUE, PURPLE
    form INTEGER DEFAULT 0, -- -15 ~ +15 (최근 5경기 기반)
    is_injured BOOLEAN DEFAULT false,
    injury_recovery_date TIMESTAMP,
    burnout BOOLEAN DEFAULT false,
    games_played INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    popularity INTEGER DEFAULT 50, -- SNS 인기도
    traits TEXT[], -- 특성 배열
    in_roster BOOLEAN DEFAULT false, -- 1군 로스터 여부
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 유저가 소유한 감독 카드
CREATE TABLE user_coach_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    coach_card_id UUID REFERENCES coach_cards(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT false, -- 현재 사용 중인 감독
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 유저가 소유한 작전 카드
CREATE TABLE user_tactic_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tactic_card_id UUID REFERENCES tactic_cards(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 유저가 소유한 서포트 카드
CREATE TABLE user_support_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    support_card_id UUID REFERENCES support_cards(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ROSTER & LINEUP
-- ============================================

CREATE TABLE rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    -- 포지션별 선수 (1군 로스터)
    top_player_id UUID REFERENCES user_player_cards(id),
    jungle_player_id UUID REFERENCES user_player_cards(id),
    mid_player_id UUID REFERENCES user_player_cards(id),
    adc_player_id UUID REFERENCES user_player_cards(id),
    support_player_id UUID REFERENCES user_player_cards(id),

    -- 포지션별 작전 카드
    top_tactic_id UUID REFERENCES user_tactic_cards(id),
    jungle_tactic_id UUID REFERENCES user_tactic_cards(id),
    mid_tactic_id UUID REFERENCES user_tactic_cards(id),
    adc_tactic_id UUID REFERENCES user_tactic_cards(id),
    support_tactic_id UUID REFERENCES user_tactic_cards(id),

    -- 서포트 카드
    support_card_id UUID REFERENCES user_support_cards(id),

    total_cost INTEGER DEFAULT 0,
    team_chemistry INTEGER DEFAULT 50, -- 팀 케미스트리

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

-- ============================================
-- MATCH SYSTEM
-- ============================================

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_type VARCHAR(20) NOT NULL, -- RANKED, FRIENDLY

    team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    winner_id UUID REFERENCES teams(id),

    team1_power INTEGER,
    team2_power INTEGER,

    -- 경기 기록
    phase1_result JSONB, -- 라인전 결과
    phase2_result JSONB, -- 오브젝트 한타 결과
    phase3_result JSONB, -- 최종 한타 결과

    match_log JSONB, -- 경기 전체 로그

    lp_change INTEGER, -- LP 변동

    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- POSTING (AUCTION)
-- ============================================

CREATE TABLE postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    card_type VARCHAR(20) NOT NULL, -- PLAYER, COACH, TACTIC, SUPPORT
    card_id UUID NOT NULL, -- user_player_cards.id 등

    starting_price BIGINT NOT NULL,
    current_price BIGINT NOT NULL,
    highest_bidder_id UUID REFERENCES users(id),

    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SOLD, CANCELLED

    ends_at TIMESTAMP NOT NULL, -- 24시간 후
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_id UUID REFERENCES postings(id) ON DELETE CASCADE,
    bidder_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bid_amount BIGINT NOT NULL,
    bid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GUILD SYSTEM
-- ============================================

CREATE TABLE guilds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_name VARCHAR(100) UNIQUE NOT NULL,
    guild_tag VARCHAR(10) UNIQUE NOT NULL,
    guild_description TEXT,
    guild_logo TEXT,

    leader_id UUID REFERENCES users(id),

    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 10,

    guild_points INTEGER DEFAULT 0, -- 길드 포인트 (길드샵 화폐)

    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guild_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER', -- LEADER, OFFICER, MEMBER
    contribution_points INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ============================================
-- SPONSORS
-- ============================================

CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sponsor_name VARCHAR(100) UNIQUE NOT NULL,
    sponsor_logo TEXT,

    required_reputation INTEGER, -- 필요 명성
    required_fans INTEGER, -- 필요 팬덤

    weekly_payment BIGINT, -- 주간 지급액

    bonus_type VARCHAR(50), -- TRAINING_DISCOUNT, CARD_DISCOUNT 등
    bonus_value INTEGER, -- % 또는 금액

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_sponsors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    sponsor_id UUID REFERENCES sponsors(id) ON DELETE CASCADE,

    contract_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contract_end TIMESTAMP,

    is_active BOOLEAN DEFAULT true,

    UNIQUE(team_id, sponsor_id)
);

-- ============================================
-- FACILITIES (구단 관리)
-- ============================================

CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    tactic_lab_level INTEGER DEFAULT 0 CHECK (tactic_lab_level >= 0 AND tactic_lab_level <= 5),
    mentalist_room_level INTEGER DEFAULT 0 CHECK (mentalist_room_level >= 0 AND mentalist_room_level <= 10),
    prediction_center_level INTEGER DEFAULT 0 CHECK (prediction_center_level >= 0 AND prediction_center_level <= 5),

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

-- ============================================
-- ACHIEVEMENTS
-- ============================================

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    achievement_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    difficulty VARCHAR(20), -- EASY, NORMAL, HARD, HELL

    reward_money BIGINT DEFAULT 0,
    reward_items JSONB, -- 작전 카드, 카드팩 등

    condition_type VARCHAR(50), -- WIN_STREAK, TOTAL_WINS, TIER_REACH 등
    condition_value INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,

    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,

    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- RECORDS & HALL OF FAME
-- ============================================

CREATE TABLE team_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

    max_win_streak INTEGER DEFAULT 0,
    highest_tier VARCHAR(20) DEFAULT 'BRONZE',
    season_most_wins INTEGER DEFAULT 0,
    total_matches INTEGER DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id)
);

CREATE TABLE player_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_player_card_id UUID REFERENCES user_player_cards(id) ON DELETE CASCADE,

    total_matches INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    mvp_count INTEGER DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    highest_tier VARCHAR(20) DEFAULT 'BRONZE',
    trait_activations INTEGER DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_player_card_id)
);

CREATE TABLE hall_of_fame (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_player_card_id UUID REFERENCES user_player_cards(id),

    inducted_reason TEXT,
    inducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SOLO RANK SYSTEM
-- ============================================

CREATE TABLE solo_ranks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_player_card_id UUID REFERENCES user_player_cards(id) ON DELETE CASCADE,

    current_rank INTEGER,
    highest_rank INTEGER,
    previous_season_rank INTEGER,

    rating INTEGER DEFAULT 1000,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_player_card_id)
);

-- ============================================
-- ADMIN SYSTEM
-- ============================================

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_teams_tier_lp ON teams(current_tier, lp);
CREATE INDEX idx_user_player_cards_user_id ON user_player_cards(user_id);
CREATE INDEX idx_user_player_cards_roster ON user_player_cards(in_roster);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_postings_status ON postings(status);
CREATE INDEX idx_postings_ends_at ON postings(ends_at);
CREATE INDEX idx_guild_members_guild_id ON guild_members(guild_id);
CREATE INDEX idx_guild_members_user_id ON guild_members(user_id);
CREATE INDEX idx_solo_ranks_rank ON solo_ranks(current_rank);

-- ============================================
-- INITIAL DATA
-- ============================================

-- 스폰서 초기 데이터
INSERT INTO sponsors (sponsor_name, sponsor_logo, required_reputation, required_fans, weekly_payment, bonus_type, bonus_value)
VALUES
    ('Red Bull', '/sponsors/redbull.png', 1, 0, 5000000, 'NONE', 0),
    ('Shell', '/sponsors/shell.png', 5, 50000, 10000000, 'NONE', 0),
    ('TicTac', '/sponsors/tictac.png', 10, 100000, 15000000, 'TRAINING_DISCOUNT', 10),
    ('Fila', '/sponsors/fila.png', 15, 200000, 20000000, 'NONE', 0),
    ('Nike', '/sponsors/nike.png', 20, 500000, 30000000, 'CARD_DISCOUNT', 15),
    ('Domino', '/sponsors/domino.png', 25, 1000000, 50000000, 'TRAINING_DISCOUNT', 15),
    ('Sega', '/sponsors/sega.png', 30, 2000000, 70000000, 'NONE', 0),
    ('Sony', '/sponsors/sony.png', 35, 5000000, 100000000, 'CARD_DISCOUNT', 20),
    ('Samsung', '/sponsors/samsung.png', 40, 10000000, 150000000, 'ALL_BOOST', 20),
    ('Coca Cola', '/sponsors/cocacola.png', 50, 20000000, 300000000, 'ALL_BOOST', 30);

-- 업적 초기 데이터 샘플 (30개 전체는 나중에 추가)
INSERT INTO achievements (achievement_name, description, difficulty, reward_money, condition_type, condition_value)
VALUES
    ('첫 승리', '경쟁전 첫 승리 달성', 'EASY', 5000000, 'TOTAL_WINS', 1),
    ('연승 시작', '2연승 달성', 'EASY', 10000000, 'WIN_STREAK', 2),
    ('실버의 길', '실버 티어 달성', 'EASY', 20000000, 'TIER_REACH', 1),
    ('골드 도달', '골드 티어 달성', 'EASY', 30000000, 'TIER_REACH', 2),
    ('플래티넘 입성', '플래티넘 티어 달성', 'EASY', 50000000, 'TIER_REACH', 3),
    ('연승 질주', '5연승 달성', 'NORMAL', 50000000, 'WIN_STREAK', 5),
    ('다이아의 빛', '다이아 티어 달성', 'NORMAL', 100000000, 'TIER_REACH', 4),
    ('100승의 사나이', '경쟁전 누적 100승', 'NORMAL', 150000000, 'TOTAL_WINS', 100),
    ('마스터 등극', '마스터 티어 달성', 'HARD', 300000000, 'TIER_REACH', 5),
    ('연승 폭풍', '10연승 달성', 'HARD', 200000000, 'WIN_STREAK', 10),
    ('정상의 자리', '챌린저 티어 달성', 'HELL', 1000000000, 'TIER_REACH', 6),
    ('연승 폭군', '20연승 달성', 'HELL', 800000000, 'WIN_STREAK', 20),
    ('전설의 시작', '500승 달성', 'HELL', 2000000000, 'TOTAL_WINS', 500);
