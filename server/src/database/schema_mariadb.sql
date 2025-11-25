-- LPM Database Schema (MariaDB)
-- LoL Pro Manager

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teams (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    team_logo TEXT,
    slogan TEXT,
    balance BIGINT DEFAULT 100000000, -- 초기 자금 1억
    reputation_level INT DEFAULT 1, -- 구단주 명성
    reputation_points INT DEFAULT 0,
    fans INT DEFAULT 0, -- 팬덤 수치
    current_tier VARCHAR(20) DEFAULT 'BRONZE',
    lp INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_streak INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CARDS SYSTEM
-- ============================================

-- 선수 카드
CREATE TABLE player_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    card_name VARCHAR(100) NOT NULL,
    card_image TEXT,
    position VARCHAR(20) NOT NULL, -- TOP, JUNGLE, MID, ADC, SUPPORT
    cost INT NOT NULL CHECK (cost >= 1 AND cost <= 10),

    -- 능력치 (1-99)
    mental INT DEFAULT 50 CHECK (mental >= 1 AND mental <= 99),
    team_fight INT DEFAULT 50 CHECK (team_fight >= 1 AND team_fight <= 99),
    cs_ability INT DEFAULT 50 CHECK (cs_ability >= 1 AND cs_ability <= 99),
    vision INT DEFAULT 50 CHECK (vision >= 1 AND vision <= 99),
    judgment INT DEFAULT 50 CHECK (judgment >= 1 AND judgment <= 99),
    laning INT DEFAULT 50 CHECK (laning >= 1 AND laning <= 99),

    power INT GENERATED ALWAYS AS (mental + team_fight + cs_ability + vision + judgment + laning) STORED,

    rarity VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, RARE, EPIC, LEGEND
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 감독 카드
CREATE TABLE coach_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coach_name VARCHAR(100) NOT NULL,
    coach_image TEXT,

    -- 능력치 (1-99)
    command INT DEFAULT 50 CHECK (command >= 1 AND command <= 99),
    ban_pick INT DEFAULT 50 CHECK (ban_pick >= 1 AND ban_pick <= 99),
    meta INT DEFAULT 50 CHECK (meta >= 1 AND meta <= 99),
    cold INT DEFAULT 50 CHECK (cold >= 1 AND cold <= 99),
    warm INT DEFAULT 50 CHECK (warm >= 1 AND warm <= 99),

    power INT GENERATED ALWAYS AS (command + ban_pick + meta + cold + warm) STORED,

    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 작전 카드
CREATE TABLE tactic_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tactic_name VARCHAR(100) NOT NULL,
    tactic_image TEXT,
    position VARCHAR(20), -- TOP, JUNGLE, MID, ADC, SUPPORT (NULL이면 팀 전체)
    effect_description TEXT,
    effect_type VARCHAR(50), -- STAT_BOOST, PHASE_BONUS 등
    effect_value INT, -- % 증가량
    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 서포트 카드
CREATE TABLE support_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    support_name VARCHAR(100) NOT NULL,
    support_image TEXT,
    effect_description TEXT,
    effect_type VARCHAR(50), -- CONDITION_HEAL, STAT_BOOST, STRATEGY_BUFF
    effect_value INT,
    rarity VARCHAR(20) DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USER CARD INVENTORY
-- ============================================

-- 유저가 소유한 선수 카드
CREATE TABLE user_player_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    player_card_id CHAR(36) NOT NULL,
    level INT DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    experience BIGINT DEFAULT 0,
    `condition` VARCHAR(20) DEFAULT 'YELLOW', -- RED, ORANGE, YELLOW, BLUE, PURPLE (condition은 예약어)
    form INT DEFAULT 0, -- -15 ~ +15 (최근 5경기 기반)
    is_injured BOOLEAN DEFAULT false,
    injury_recovery_date TIMESTAMP NULL,
    burnout BOOLEAN DEFAULT false,
    games_played INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    popularity INT DEFAULT 50, -- SNS 인기도
    traits JSON, -- 특성 배열 (TEXT[] -> JSON)
    in_roster BOOLEAN DEFAULT false, -- 1군 로스터 여부
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저가 소유한 감독 카드
CREATE TABLE user_coach_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    coach_card_id CHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT false, -- 현재 사용 중인 감독
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_card_id) REFERENCES coach_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저가 소유한 작전 카드
CREATE TABLE user_tactic_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    tactic_card_id CHAR(36) NOT NULL,
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tactic_card_id) REFERENCES tactic_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 유저가 소유한 서포트 카드
CREATE TABLE user_support_cards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    support_card_id CHAR(36) NOT NULL,
    quantity INT DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (support_card_id) REFERENCES support_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ROSTER & LINEUP
-- ============================================

CREATE TABLE rosters (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,

    -- 포지션별 선수 (1군 로스터)
    top_player_id CHAR(36),
    jungle_player_id CHAR(36),
    mid_player_id CHAR(36),
    adc_player_id CHAR(36),
    support_player_id CHAR(36),

    -- 포지션별 작전 카드
    top_tactic_id CHAR(36),
    jungle_tactic_id CHAR(36),
    mid_tactic_id CHAR(36),
    adc_tactic_id CHAR(36),
    support_tactic_id CHAR(36),

    -- 서포트 카드
    support_card_id CHAR(36),

    total_cost INT DEFAULT 0,
    team_chemistry INT DEFAULT 50, -- 팀 케미스트리

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (top_player_id) REFERENCES user_player_cards(id),
    FOREIGN KEY (jungle_player_id) REFERENCES user_player_cards(id),
    FOREIGN KEY (mid_player_id) REFERENCES user_player_cards(id),
    FOREIGN KEY (adc_player_id) REFERENCES user_player_cards(id),
    FOREIGN KEY (support_player_id) REFERENCES user_player_cards(id),
    FOREIGN KEY (top_tactic_id) REFERENCES user_tactic_cards(id),
    FOREIGN KEY (jungle_tactic_id) REFERENCES user_tactic_cards(id),
    FOREIGN KEY (mid_tactic_id) REFERENCES user_tactic_cards(id),
    FOREIGN KEY (adc_tactic_id) REFERENCES user_tactic_cards(id),
    FOREIGN KEY (support_tactic_id) REFERENCES user_tactic_cards(id),
    FOREIGN KEY (support_card_id) REFERENCES user_support_cards(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MATCH SYSTEM
-- ============================================

CREATE TABLE matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    match_type VARCHAR(20) NOT NULL, -- RANKED, FRIENDLY

    team1_id CHAR(36) NOT NULL,
    team2_id CHAR(36) NOT NULL,

    winner_id CHAR(36),

    team1_power INT,
    team2_power INT,

    -- 경기 기록
    phase1_result JSON, -- 라인전 결과 (JSONB -> JSON)
    phase2_result JSON, -- 오브젝트 한타 결과
    phase3_result JSON, -- 최종 한타 결과

    match_log JSON, -- 경기 전체 로그

    lp_change INT, -- LP 변동

    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- POSTING (AUCTION)
-- ============================================

CREATE TABLE postings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    seller_id CHAR(36) NOT NULL,
    card_type VARCHAR(20) NOT NULL, -- PLAYER, COACH, TACTIC, SUPPORT
    card_id CHAR(36) NOT NULL, -- user_player_cards.id 등

    starting_price BIGINT NOT NULL,
    current_price BIGINT NOT NULL,
    highest_bidder_id CHAR(36),

    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SOLD, CANCELLED

    ends_at TIMESTAMP NOT NULL, -- 24시간 후
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (highest_bidder_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bids (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    posting_id CHAR(36) NOT NULL,
    bidder_id CHAR(36) NOT NULL,
    bid_amount BIGINT NOT NULL,
    bid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posting_id) REFERENCES postings(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- GUILD SYSTEM
-- ============================================

CREATE TABLE guilds (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    guild_name VARCHAR(100) UNIQUE NOT NULL,
    guild_tag VARCHAR(10) UNIQUE NOT NULL,
    guild_description TEXT,
    guild_logo TEXT,

    leader_id CHAR(36),

    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    max_members INT DEFAULT 10,

    guild_points INT DEFAULT 0, -- 길드 포인트 (길드샵 화폐)

    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE guild_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    guild_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'MEMBER', -- LEADER, OFFICER, MEMBER
    contribution_points INT DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SPONSORS
-- ============================================

CREATE TABLE sponsors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sponsor_name VARCHAR(100) UNIQUE NOT NULL,
    sponsor_logo TEXT,

    required_reputation INT, -- 필요 명성
    required_fans INT, -- 필요 팬덤

    weekly_payment BIGINT, -- 주간 지급액

    bonus_type VARCHAR(50), -- TRAINING_DISCOUNT, CARD_DISCOUNT 등
    bonus_value INT, -- % 또는 금액

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_sponsors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    sponsor_id CHAR(36) NOT NULL,

    contract_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contract_end TIMESTAMP NULL,

    is_active BOOLEAN DEFAULT true,

    UNIQUE(team_id, sponsor_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FACILITIES (구단 관리)
-- ============================================

CREATE TABLE facilities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,

    tactic_lab_level INT DEFAULT 0 CHECK (tactic_lab_level >= 0 AND tactic_lab_level <= 5),
    mentalist_room_level INT DEFAULT 0 CHECK (mentalist_room_level >= 0 AND mentalist_room_level <= 10),
    prediction_center_level INT DEFAULT 0 CHECK (prediction_center_level >= 0 AND prediction_center_level <= 5),

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACHIEVEMENTS
-- ============================================

CREATE TABLE achievements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    achievement_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,

    difficulty VARCHAR(20), -- EASY, NORMAL, HARD, HELL

    reward_money BIGINT DEFAULT 0,
    reward_items JSON, -- 작전 카드, 카드팩 등

    condition_type VARCHAR(50), -- WIN_STREAK, TOTAL_WINS, TIER_REACH 등
    condition_value INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    achievement_id CHAR(36) NOT NULL,

    progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP NULL,

    UNIQUE(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- RECORDS & HALL OF FAME
-- ============================================

CREATE TABLE team_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,

    max_win_streak INT DEFAULT 0,
    highest_tier VARCHAR(20) DEFAULT 'BRONZE',
    season_most_wins INT DEFAULT 0,
    total_matches INT DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(team_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE player_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_player_card_id CHAR(36) NOT NULL,

    total_matches INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    mvp_count INT DEFAULT 0,
    max_win_streak INT DEFAULT 0,
    highest_tier VARCHAR(20) DEFAULT 'BRONZE',
    trait_activations INT DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_player_card_id),
    FOREIGN KEY (user_player_card_id) REFERENCES user_player_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE hall_of_fame (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_player_card_id CHAR(36),

    inducted_reason TEXT,
    inducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_player_card_id) REFERENCES user_player_cards(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SOLO RANK SYSTEM
-- ============================================

CREATE TABLE solo_ranks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_player_card_id CHAR(36) NOT NULL,

    current_rank INT,
    highest_rank INT,
    previous_season_rank INT,

    rating INT DEFAULT 1000,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_player_card_id),
    FOREIGN KEY (user_player_card_id) REFERENCES user_player_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- IP TRACKING (계정 생성 제한)
-- ============================================

CREATE TABLE user_ip_tracking (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    ip_address VARCHAR(45) NOT NULL, -- IPv6 지원
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ip_address (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ADMIN SYSTEM
-- ============================================

CREATE TABLE admins (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role VARCHAR(20) DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- 업적 초기 데이터 샘플
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
