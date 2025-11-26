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
    reputation INT DEFAULT 1, -- 구단주 명성 (구 reputation_level)
    reputation_level INT DEFAULT 1, -- 구단주 명성 레벨
    reputation_points INT DEFAULT 0,
    fans INT DEFAULT 0, -- 팬덤 수치
    fandom INT DEFAULT 0, -- 팬덤 레벨
    fan_satisfaction INT DEFAULT 50, -- 팬 만족도
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
    team VARCHAR(50), -- 선수 소속 팀
    nationality VARCHAR(50), -- 국적
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
-- FUSION SYSTEM (카드 합성)
-- ============================================

-- 합성 레시피
CREATE TABLE fusion_recipes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recipe_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_cards INT NOT NULL, -- 필요한 카드 수
    min_cost INT, -- 최소 코스트
    max_cost INT, -- 최대 코스트
    result_type VARCHAR(20) NOT NULL, -- UPGRADE, RANDOM, SPECIFIC
    success_rate INT DEFAULT 100, -- 성공 확률 (%)
    fusion_cost BIGINT DEFAULT 0, -- 합성 비용
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 합성 기록
CREATE TABLE fusion_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    recipe_id CHAR(36),
    input_cards JSON, -- 투입된 카드 정보
    result_card_id CHAR(36), -- 결과 카드
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES fusion_recipes(id)
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
    seller_team_id CHAR(36),
    card_type VARCHAR(20) NOT NULL, -- PLAYER, COACH, TACTIC, SUPPORT
    card_id CHAR(36) NOT NULL, -- user_player_cards.id 등
    user_card_id CHAR(36), -- user_player_cards.id

    starting_price BIGINT NOT NULL,
    current_price BIGINT NOT NULL,
    highest_bidder_id CHAR(36),

    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SOLD, CANCELLED, active

    ends_at TIMESTAMP NOT NULL, -- 24시간 후
    end_time TIMESTAMP NOT NULL, -- 종료 시간
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_team_id) REFERENCES teams(id),
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

-- 경매 입찰
CREATE TABLE auction_bids (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    auction_id CHAR(36) NOT NULL,
    bidder_id CHAR(36) NOT NULL,
    bidder_team_id CHAR(36),
    bid_amount BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auction_id) REFERENCES postings(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_team_id) REFERENCES teams(id)
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
    sponsor_type VARCHAR(50) DEFAULT 'MAIN', -- MAIN, SUB

    required_reputation INT, -- 필요 명성
    required_fans INT, -- 필요 팬덤

    weekly_payment BIGINT, -- 주간 지급액
    monthly_payment BIGINT, -- 월간 지급액

    bonus_type VARCHAR(50), -- TRAINING_DISCOUNT, CARD_DISCOUNT 등
    bonus_value INT, -- % 또는 금액
    bonus_condition VARCHAR(100), -- 보너스 조건
    bonus_amount BIGINT, -- 보너스 금액

    logo_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_sponsors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    sponsor_id CHAR(36) NOT NULL,

    contract_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contract_end_date TIMESTAMP NULL,
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

    -- 작전 연구소 (작전 레벨당 3% 증가, 최대 5레벨 15%)
    tactic_lab_level INT DEFAULT 0 CHECK (tactic_lab_level >= 0 AND tactic_lab_level <= 5),
    tactic_lab_next_cost BIGINT DEFAULT 500000000, -- 다음 업그레이드 비용 (5억)

    -- 스킬 연구소 (스킬 카드 획득, 1주일마다 한 개, 레벨당 1일 단축)
    skill_lab_level INT DEFAULT 0 CHECK (skill_lab_level >= 0 AND skill_lab_level <= 5),
    skill_lab_next_cost BIGINT DEFAULT 1000000000, -- 다음 업그레이드 비용 (10억)
    skill_lab_last_claim TIMESTAMP NULL, -- 마지막 스킬 카드 획득 시간

    -- 집중 훈련소 (선수 특정 능력치 개선 및 특성 개방)
    training_center_level INT DEFAULT 0 CHECK (training_center_level >= 0 AND training_center_level <= 1),
    training_center_next_cost BIGINT DEFAULT 10000000000, -- 다음 업그레이드 비용 (100억)

    -- 레거시 시설
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
    category VARCHAR(50) NOT NULL, -- 경기, 카드, 승리, 티어, 컬렉션, 경매, 명성

    difficulty VARCHAR(20), -- EASY, NORMAL, HARD, HELL
    requirement INT NOT NULL, -- 달성 조건 값

    reward_money BIGINT DEFAULT 0,
    reward_reputation INT DEFAULT 0, -- 명성도 보상
    reward_items JSON, -- 작전 카드, 카드팩 등

    condition_type VARCHAR(50), -- WIN_STREAK, TOTAL_WINS, TIER_REACH 등
    condition_value INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    achievement_id CHAR(36) NOT NULL,
    team_id CHAR(36),

    progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    is_claimed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP NULL,
    claimed_at TIMESTAMP NULL,

    UNIQUE(user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
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

-- 선수별 솔로랭크 데이터
CREATE TABLE player_solo_rank (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_card_id CHAR(36) NOT NULL,
    user_player_card_id CHAR(36),
    season_id INT DEFAULT 1,

    solo_rating INT DEFAULT 1000,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    `rank` INT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(player_card_id, season_id),
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_player_card_id) REFERENCES user_player_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FANDOM SYSTEM
-- ============================================

-- 팬덤 이벤트
CREATE TABLE fandom_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_name VARCHAR(100) NOT NULL,
    event_description TEXT,
    event_type VARCHAR(50), -- MEET_GREET, AUTOGRAPH, STREAM

    cost BIGINT, -- 이벤트 비용
    fan_gain INT, -- 획득 팬 수
    satisfaction_gain INT, -- 만족도 증가

    start_date TIMESTAMP,
    end_date TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 업적 초기 데이터 - 자동 생성된 포괄적인 업적 시스템
INSERT INTO achievements (achievement_name, description, category, difficulty, requirement, reward_money, reward_reputation, condition_type, condition_value)
VALUES
    -- 경기 관련 업적
    ('첫 경기', '첫 경쟁전 경기 참가', '경기', 'EASY', 1, 1000000, 5, 'TOTAL_MATCHES', 1),
    ('10경기 달성', '경쟁전 10경기 참가', '경기', 'EASY', 10, 5000000, 10, 'TOTAL_MATCHES', 10),
    ('50경기 달성', '경쟁전 50경기 참가', '경기', 'NORMAL', 50, 15000000, 20, 'TOTAL_MATCHES', 50),
    ('100경기 달성', '경쟁전 100경기 참가', '경기', 'NORMAL', 100, 30000000, 30, 'TOTAL_MATCHES', 100),
    ('300경기 달성', '경쟁전 300경기 참가', '경기', 'HARD', 300, 50000000, 50, 'TOTAL_MATCHES', 300),
    ('500경기 달성', '경쟁전 500경기 참가', '경기', 'HELL', 500, 100000000, 100, 'TOTAL_MATCHES', 500),

    -- 승리 관련 업적
    ('첫 승리', '첫 경쟁전 승리 달성', '승리', 'EASY', 1, 5000000, 10, 'TOTAL_WINS', 1),
    ('10승 달성', '경쟁전 10승 달성', '승리', 'EASY', 10, 10000000, 20, 'TOTAL_WINS', 10),
    ('30승 달성', '경쟁전 30승 달성', '승리', 'NORMAL', 30, 20000000, 30, 'TOTAL_WINS', 30),
    ('50승 달성', '경쟁전 50승 달성', '승리', 'NORMAL', 50, 35000000, 40, 'TOTAL_WINS', 50),
    ('100승 달성', '경쟁전 100승 달성', '승리', 'HARD', 100, 60000000, 60, 'TOTAL_WINS', 100),
    ('200승 달성', '경쟁전 200승 달성', '승리', 'HELL', 200, 120000000, 120, 'TOTAL_WINS', 200),

    -- 연승 관련 업적
    ('연승 시작', '2연승 달성', '승리', 'EASY', 2, 10000000, 15, 'WIN_STREAK', 2),
    ('3연승', '3연승 달성', '승리', 'EASY', 3, 15000000, 20, 'WIN_STREAK', 3),
    ('5연승', '5연승 달성', '승리', 'NORMAL', 5, 25000000, 30, 'WIN_STREAK', 5),
    ('7연승', '7연승 달성', '승리', 'NORMAL', 7, 40000000, 40, 'WIN_STREAK', 7),
    ('10연승', '10연승 달성!', '승리', 'HARD', 10, 70000000, 70, 'WIN_STREAK', 10),
    ('15연승', '15연승 달성!', '승리', 'HELL', 15, 150000000, 150, 'WIN_STREAK', 15),

    -- 티어 관련 업적
    ('브론즈 탈출', '실버 티어 달성', '티어', 'EASY', 1, 20000000, 20, 'TIER_REACH', 1),
    ('골드 도달', '골드 티어 달성', '티어', 'NORMAL', 2, 30000000, 30, 'TIER_REACH', 2),
    ('플래티넘 도달', '플래티넘 티어 달성', '티어', 'NORMAL', 3, 50000000, 50, 'TIER_REACH', 3),
    ('다이아 도달', '다이아 티어 달성', '티어', 'HARD', 4, 80000000, 80, 'TIER_REACH', 4),
    ('마스터 도달', '마스터 티어 달성', '티어', 'HARD', 5, 120000000, 120, 'TIER_REACH', 5),
    ('그랜드마스터 도달', '그랜드마스터 티어 달성', '티어', 'HELL', 6, 200000000, 200, 'TIER_REACH', 6),
    ('챌린저 도달', '챌린저 티어 달성!', '티어', 'HELL', 7, 500000000, 500, 'TIER_REACH', 7),

    -- 카드 관련 업적
    ('카드 수집 시작', '선수 카드 5장 보유', '카드', 'EASY', 5, 3000000, 5, 'CARD_COUNT', 5),
    ('카드 수집가', '선수 카드 10장 보유', '카드', 'EASY', 10, 8000000, 10, 'CARD_COUNT', 10),
    ('카드 컬렉터', '선수 카드 20장 보유', '카드', 'NORMAL', 20, 20000000, 20, 'CARD_COUNT', 20),
    ('카드 마니아', '선수 카드 50장 보유', '카드', 'HARD', 50, 50000000, 50, 'CARD_COUNT', 50),
    ('카드 마스터', '선수 카드 100장 보유', '카드', 'HELL', 100, 120000000, 100, 'CARD_COUNT', 100),

    -- 레어 카드 관련
    ('첫 레어 카드', 'RARE 등급 카드 획득', '카드', 'EASY', 1, 5000000, 10, 'RARE_CARD', 1),
    ('레어 수집가', 'RARE 등급 카드 5장 보유', '카드', 'NORMAL', 5, 15000000, 20, 'RARE_CARD', 5),
    ('첫 에픽 카드', 'EPIC 등급 카드 획득', '카드', 'NORMAL', 1, 15000000, 30, 'EPIC_CARD', 1),
    ('에픽 수집가', 'EPIC 등급 카드 3장 보유', '카드', 'HARD', 3, 40000000, 50, 'EPIC_CARD', 3),
    ('첫 전설 카드', 'LEGEND 등급 카드 획득', '카드', 'HARD', 1, 50000000, 100, 'LEGEND_CARD', 1),
    ('전설 수집가', 'LEGEND 등급 카드 3장 보유', '카드', 'HELL', 3, 200000000, 300, 'LEGEND_CARD', 3),

    -- 컬렉션 관련
    ('TOP 컬렉션', 'TOP 포지션 선수 5명 보유', '컬렉션', 'NORMAL', 5, 10000000, 15, 'POS_TOP', 5),
    ('JUNGLE 컬렉션', 'JUNGLE 포지션 선수 5명 보유', '컬렉션', 'NORMAL', 5, 10000000, 15, 'POS_JUNGLE', 5),
    ('MID 컬렉션', 'MID 포지션 선수 5명 보유', '컬렉션', 'NORMAL', 5, 10000000, 15, 'POS_MID', 5),
    ('ADC 컬렉션', 'ADC 포지션 선수 5명 보유', '컬렉션', 'NORMAL', 5, 10000000, 15, 'POS_ADC', 5),
    ('SUPPORT 컬렉션', 'SUPPORT 포지션 선수 5명 보유', '컬렉션', 'NORMAL', 5, 10000000, 15, 'POS_SUPPORT', 5),
    ('LCK 컬렉션', 'LCK 소속 선수 10명 보유', '컬렉션', 'HARD', 10, 30000000, 40, 'TEAM_LCK', 10),
    ('LPL 컬렉션', 'LPL 소속 선수 10명 보유', '컬렉션', 'HARD', 10, 30000000, 40, 'TEAM_LPL', 10),

    -- 경매 관련
    ('첫 경매 참여', '경매에 처음 입찰', '경매', 'EASY', 1, 5000000, 5, 'AUCTION_BID', 1),
    ('경매 낙찰', '경매에서 선수 낙찰', '경매', 'EASY', 1, 10000000, 10, 'AUCTION_WIN', 1),
    ('경매 마스터', '경매 10회 낙찰', '경매', 'NORMAL', 10, 30000000, 30, 'AUCTION_WIN', 10),
    ('경매 판매', '경매에 선수 판매', '경매', 'EASY', 1, 5000000, 5, 'AUCTION_SELL', 1),
    ('경매 고수', '경매 판매 10회', '경매', 'NORMAL', 10, 25000000, 25, 'AUCTION_SELL', 10),

    -- 명성 관련
    ('명성의 시작', '명성도 100 달성', '명성', 'EASY', 100, 10000000, 10, 'REPUTATION', 100),
    ('인지도 상승', '명성도 500 달성', '명성', 'NORMAL', 500, 25000000, 25, 'REPUTATION', 500),
    ('유명 팀', '명성도 1000 달성', '명성', 'NORMAL', 1000, 50000000, 50, 'REPUTATION', 1000),
    ('명문 팀', '명성도 2000 달성', '명성', 'HARD', 2000, 100000000, 100, 'REPUTATION', 2000),
    ('레전드 팀', '명성도 5000 달성', '명성', 'HELL', 5000, 300000000, 300, 'REPUTATION', 5000);

-- 합성 레시피 초기 데이터
INSERT INTO fusion_recipes (recipe_name, description, required_cards, min_cost, max_cost, result_type, success_rate, fusion_cost)
VALUES
    ('기본 합성', '같은 코스트 카드 3장을 합성하여 랜덤 카드 획득', 3, 1, 10, 'RANDOM', 100, 5000000),
    ('코스트 업그레이드', '같은 카드 2장을 합성하여 상위 카드 획득', 2, 1, 10, 'UPGRADE', 80, 10000000),
    ('고급 합성', '고코스트 카드 2장으로 레어 등급 이상 보장', 2, 7, 10, 'RANDOM', 100, 20000000);
