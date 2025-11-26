-- 랭크 리그 시스템 DB 스키마
-- 브론즈 ~ 챌린저 티어, LP 시스템, 시즌 보상

-- 랭크 티어 정의 테이블
CREATE TABLE IF NOT EXISTS ranked_tiers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tier_name VARCHAR(50) NOT NULL UNIQUE,
    tier_display VARCHAR(50) NOT NULL, -- 한글 이름
    min_lp INT NOT NULL, -- 최소 LP
    max_lp INT, -- 최대 LP (NULL이면 무한)
    tier_order INT NOT NULL, -- 티어 순서 (1=챌린저, 7=브론즈)
    season_reset_lp INT, -- 시즌 종료 시 리셋 LP
    reward_money BIGINT, -- 시즌 보상 금액
    reward_tactic_cards INT DEFAULT 0, -- 시즌 보상 작전 카드 개수
    tier_color VARCHAR(20), -- 티어 색상 (HEX)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 랭크 티어 데이터 삽입
INSERT INTO ranked_tiers (tier_name, tier_display, min_lp, max_lp, tier_order, season_reset_lp, reward_money, reward_tactic_cards, tier_color) VALUES
('CHALLENGER', '챌린저', 6500, NULL, 1, 2500, 100000000, 3, '#F4C430'),
('MASTER', '마스터', 4000, 6499, 2, 2000, 100000000, 1, '#9D4EDD'),
('DIAMOND', '다이아', 3500, 3999, 3, NULL, 50000000, 1, '#3A86FF'),
('PLATINUM', '플래티넘', 2500, 3499, 4, NULL, 50000000, 0, '#06FFA5'),
('GOLD', '골드', 2000, 2499, 5, NULL, 35000000, 0, '#FFD700'),
('SILVER', '실버', 1000, 1999, 6, NULL, 20000000, 0, '#C0C0C0'),
('BRONZE', '브론즈', 0, 999, 7, NULL, 10000000, 0, '#CD7F32');

-- 랭크 시즌 테이블
CREATE TABLE IF NOT EXISTS ranked_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_number INT NOT NULL UNIQUE,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, ENDED
    rewards_distributed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 팀 랭크 정보 테이블
CREATE TABLE IF NOT EXISTS team_ranked (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL UNIQUE,
    season_id INT NOT NULL,
    current_lp INT DEFAULT 0,
    tier_id INT NOT NULL,
    tier_rank INT, -- 티어 내 순위 (챌린저/마스터 전용)
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    highest_lp INT DEFAULT 0,
    highest_tier_id INT,
    last_match_at DATETIME,
    is_placement BOOLEAN DEFAULT TRUE, -- 배치고사 여부
    placement_matches INT DEFAULT 0, -- 배치고사 경기 수 (최대 10)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES ranked_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (tier_id) REFERENCES ranked_tiers(id),
    FOREIGN KEY (highest_tier_id) REFERENCES ranked_tiers(id),
    INDEX idx_lp (season_id, current_lp DESC),
    INDEX idx_tier_rank (season_id, tier_id, tier_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 랭크 매치 기록 테이블
CREATE TABLE IF NOT EXISTS ranked_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id INT NOT NULL,
    team1_id CHAR(36) NOT NULL,
    team2_id CHAR(36) NOT NULL,
    winner_id CHAR(36),
    match_date DATETIME NOT NULL,
    team1_lp_change INT, -- LP 변화량
    team2_lp_change INT,
    match_duration INT, -- 경기 시간 (초)
    match_type VARCHAR(20) DEFAULT 'RANKED', -- RANKED, PLACEMENT
    match_data JSON, -- 경기 상세 데이터 (페이즈별 결과 등)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES ranked_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_team_matches (team1_id, match_date DESC),
    INDEX idx_season_date (season_id, match_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LP 변화 내역 테이블
CREATE TABLE IF NOT EXISTS lp_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_ranked_id CHAR(36) NOT NULL,
    match_id CHAR(36),
    lp_change INT NOT NULL,
    previous_lp INT NOT NULL,
    new_lp INT NOT NULL,
    previous_tier_id INT,
    new_tier_id INT,
    change_reason VARCHAR(50) NOT NULL, -- MATCH_WIN, MATCH_LOSE, SEASON_RESET, PROMOTION, DEMOTION
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_ranked_id) REFERENCES team_ranked(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES ranked_matches(id) ON DELETE SET NULL,
    FOREIGN KEY (previous_tier_id) REFERENCES ranked_tiers(id),
    FOREIGN KEY (new_tier_id) REFERENCES ranked_tiers(id),
    INDEX idx_team_date (team_ranked_id, changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시즌 보상 지급 내역
CREATE TABLE IF NOT EXISTS season_rewards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    season_id INT NOT NULL,
    tier_id INT NOT NULL,
    final_lp INT NOT NULL,
    final_rank INT,
    reward_money BIGINT,
    reward_tactic_cards INT,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES ranked_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (tier_id) REFERENCES ranked_tiers(id),
    UNIQUE KEY (team_id, season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 랭크 시즌 1 생성
INSERT INTO ranked_seasons (season_number, start_date, end_date, status) VALUES
(1, '2026-01-01 00:00:00', '2026-03-31 23:59:59', 'ONGOING');
