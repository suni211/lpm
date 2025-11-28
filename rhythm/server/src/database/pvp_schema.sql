-- PvP 레더 매치 시스템 스키마

USE rhythm_db;

-- 레더 등급 테이블
CREATE TABLE ladder_ratings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    rating INT DEFAULT 1000 COMMENT 'ELO 레이팅',
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    winrate DECIMAL(5, 2) DEFAULT 0 COMMENT '승률 (%)',
    highest_rating INT DEFAULT 1000 COMMENT '최고 레이팅',
    rank_tier ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER') DEFAULT 'BRONZE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_rating (user_id),
    INDEX idx_rating (rating DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치 테이블
CREATE TABLE matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player1_id CHAR(36) NOT NULL COMMENT '플레이어 1',
    player2_id CHAR(36) NOT NULL COMMENT '플레이어 2',
    status ENUM('WAITING', 'BAN_PICK', 'PLAYING', 'COMPLETED', 'CANCELLED') DEFAULT 'WAITING',
    winner_id CHAR(36) NULL COMMENT '승자',
    player1_score INT DEFAULT 0 COMMENT '플레이어1 라운드 승수',
    player2_score INT DEFAULT 0 COMMENT '플레이어2 라운드 승수',
    current_round INT DEFAULT 0 COMMENT '현재 라운드 (1-3)',
    best_of INT DEFAULT 3 COMMENT '총 라운드 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치 곡 풀 (5곡, 4K 전용)
CREATE TABLE match_song_pool (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    match_id CHAR(36) NOT NULL,
    song_id CHAR(36) NOT NULL,
    beatmap_id CHAR(36) NOT NULL COMMENT '4K 비트맵만 사용',
    pool_order INT NOT NULL COMMENT '곡 순서 (1-5)',
    is_banned BOOLEAN DEFAULT FALSE,
    banned_by CHAR(36) NULL COMMENT '밴한 플레이어',
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (banned_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_match (match_id),
    CONSTRAINT chk_4k_only CHECK (
        beatmap_id IN (SELECT id FROM beatmaps WHERE key_count = 4)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='랭크 매치는 4K 전용';

-- 매치 라운드 기록
CREATE TABLE match_rounds (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    match_id CHAR(36) NOT NULL,
    round_number INT NOT NULL COMMENT '라운드 번호 (1, 2, 3)',
    song_id CHAR(36) NOT NULL,
    beatmap_id CHAR(36) NOT NULL,
    player1_score INT NOT NULL COMMENT '플레이어1 점수',
    player2_score INT NOT NULL COMMENT '플레이어2 점수',
    player1_judgments JSON NOT NULL COMMENT '플레이어1 판정',
    player2_judgments JSON NOT NULL COMMENT '플레이어2 판정',
    player1_max_combo INT NOT NULL,
    player2_max_combo INT NOT NULL,
    winner_id CHAR(36) NOT NULL COMMENT '라운드 승자',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
    FOREIGN KEY (beatmap_id) REFERENCES beatmaps(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_match (match_id),
    INDEX idx_round (match_id, round_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 매치메이킹 큐 테이블
CREATE TABLE matchmaking_queue (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    rating INT NOT NULL COMMENT '매칭 시점의 레이팅',
    status ENUM('SEARCHING', 'MATCHED', 'CANCELLED') DEFAULT 'SEARCHING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    matched_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_rating (rating),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
