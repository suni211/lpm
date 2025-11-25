-- 리그 시스템 DB 스키마
-- 4개 리그: 코카콜라 제로 챌린지, 레전드, 라이너, 비기너

-- 리그 테이블
CREATE TABLE IF NOT EXISTS leagues (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    league_name VARCHAR(100) NOT NULL, -- '코카콜라 제로 챌린지', '레전드', '라이너', '비기너'
    league_level INT NOT NULL, -- 1(최상위), 2, 3, 4(최하위)
    max_teams INT NOT NULL, -- 12, 12, 20, 무한
    promotion_spots INT NOT NULL, -- 승격 자리수
    relegation_spots INT NOT NULL, -- 강등 자리수
    playoff_spots INT DEFAULT 0, -- PO 진출 팀 수
    season_matches INT NOT NULL, -- 리그 총 경기 수 (22, 22, 38, 18)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시즌 테이블
CREATE TABLE IF NOT EXISTS seasons (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_number INT NOT NULL, -- 시즌 번호
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ONGOING, PLAYOFFS, COMPLETED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (season_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 시즌 (어느 시즌에 어떤 리그가 돌아가는지)
CREATE TABLE IF NOT EXISTS league_seasons (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id CHAR(36) NOT NULL,
    league_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ONGOING, PLAYOFFS, COMPLETED
    current_round INT DEFAULT 0, -- 현재 라운드 (1라운드, 2라운드)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    UNIQUE KEY (season_id, league_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 참가 팀 (teams 테이블과 연결)
CREATE TABLE IF NOT EXISTS league_participants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    league_season_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    points INT DEFAULT 0, -- 승점
    ranking INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY (league_season_id, team_id),
    INDEX idx_ranking (league_season_id, ranking)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 경기 스케줄
CREATE TABLE IF NOT EXISTS league_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    league_season_id CHAR(36) NOT NULL,
    home_team_id CHAR(36) NOT NULL,
    away_team_id CHAR(36) NOT NULL,
    round_number INT NOT NULL, -- 라운드 번호 (1, 2)
    match_day INT NOT NULL, -- 경기 일차 (1~6일)
    status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, ONGOING, COMPLETED
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    winner_id CHAR(36),
    match_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_match_day (league_season_id, match_day, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 플레이오프 경기
CREATE TABLE IF NOT EXISTS playoff_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id CHAR(36) NOT NULL,
    league_id CHAR(36) NOT NULL,
    round_name VARCHAR(50) NOT NULL, -- '준플레이오프', '플레이오프', '결승'
    match_order INT NOT NULL, -- 경기 순서
    team1_id CHAR(36) NOT NULL,
    team2_id CHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    winner_id CHAR(36),
    match_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 승강전
CREATE TABLE IF NOT EXISTS promotion_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id CHAR(36) NOT NULL,
    upper_league_id CHAR(36) NOT NULL, -- 상위 리그
    lower_league_id CHAR(36) NOT NULL, -- 하위 리그
    upper_team_id CHAR(36) NOT NULL, -- 상위 리그 하위권 팀
    lower_team_id CHAR(36) NOT NULL, -- 하위 리그 상위권 팀
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    winner_id CHAR(36),
    match_date DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (upper_league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (lower_league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (upper_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (lower_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES teams(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 리그 데이터 삽입
INSERT INTO leagues (league_name, league_level, max_teams, promotion_spots, relegation_spots, playoff_spots, season_matches) VALUES
('코카콜라 제로 챌린지', 1, 12, 0, 2, 5, 22),
('레전드', 2, 12, 2, 2, 0, 22),
('라이너', 3, 20, 2, 2, 0, 38),
('비기너', 4, 99999, 2, 0, 0, 18);
