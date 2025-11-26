-- 솔랭 시스템 DB 스키마
-- 모든 서버 통합, 실시간 Socket.IO 랭킹, 선수 개인 성장

-- 솔랭 시즌 테이블
CREATE TABLE IF NOT EXISTS solo_rank_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_number INT NOT NULL UNIQUE,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, ENDED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 선수 솔랭 정보 테이블
CREATE TABLE IF NOT EXISTS player_solo_rank (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_card_id INT NOT NULL,
    season_id INT NOT NULL,
    current_rank INT, -- 현재 순위
    highest_rank INT, -- 최고 순위
    previous_rank INT, -- 지난 달 순위
    solo_rating INT DEFAULT 1500, -- MMR 시스템 (1500 기본)
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    last_match_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (season_id) REFERENCES solo_rank_seasons(id) ON DELETE CASCADE,
    UNIQUE KEY (player_card_id, season_id),
    INDEX idx_rank (season_id, current_rank),
    INDEX idx_rating (season_id, solo_rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 솔랭 매치 기록 테이블
CREATE TABLE IF NOT EXISTS solo_rank_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id INT NOT NULL,
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    winner_id INT,
    match_date DATETIME NOT NULL,
    player1_rating_change INT,
    player2_rating_change INT,
    player1_exp_gained BIGINT,
    player2_exp_gained BIGINT,
    player1_chemistry_change INT, -- 케미스트리 변화
    player2_chemistry_change INT,
    match_duration INT, -- 경기 시간 (초)
    match_data JSON, -- 경기 상세 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES solo_rank_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES player_cards(id) ON DELETE SET NULL,
    INDEX idx_player_matches (player1_id, match_date DESC),
    INDEX idx_season_date (season_id, match_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 솔랭 매치메이킹 큐 (실시간 매칭)
CREATE TABLE IF NOT EXISTS solo_rank_queue (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_card_id INT NOT NULL,
    solo_rating INT NOT NULL,
    position VARCHAR(20) NOT NULL, -- 포지션
    queue_joined_at DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'SEARCHING', -- SEARCHING, MATCHED, CANCELLED
    matched_with_player_id INT,
    match_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_with_player_id) REFERENCES player_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (match_id) REFERENCES solo_rank_matches(id) ON DELETE SET NULL,
    INDEX idx_queue (status, position, solo_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 솔랭 순위 변동 내역 (매달 기록)
CREATE TABLE IF NOT EXISTS solo_rank_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_solo_rank_id CHAR(36) NOT NULL,
    month INT NOT NULL, -- 1~12월
    year INT NOT NULL,
    final_rank INT,
    final_rating INT,
    total_matches INT,
    total_wins INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_solo_rank_id) REFERENCES player_solo_rank(id) ON DELETE CASCADE,
    UNIQUE KEY (player_solo_rank_id, year, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 솔랭 시즌 1 생성
INSERT INTO solo_rank_seasons (season_number, start_date, end_date, status) VALUES
(1, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'ONGOING');
