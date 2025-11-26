-- 리그 시스템 DB 스키마
-- 4개 리그: 챌린저(10팀), 유로니(20팀), 아마추어(20팀), 비기너(20팀)

-- 리그 테이블
CREATE TABLE IF NOT EXISTS leagues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    league_name VARCHAR(50) NOT NULL UNIQUE, -- CHALLENGER, EURONI, AMATEUR, BEGINNER
    league_display VARCHAR(50) NOT NULL, -- 챌린저, 유로니, 아마추어, 비기너
    max_teams INT NOT NULL,
    tier_level INT NOT NULL, -- 1=챌린저(최상위), 2=유로니, 3=아마추어, 4=비기너
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 초기 데이터
INSERT INTO leagues (league_name, league_display, max_teams, tier_level) VALUES
('CHALLENGER', '챌린저', 10, 1),
('EURONI', '유로니', 20, 2),
('AMATEUR', '아마추어', 20, 3),
('BEGINNER', '비기너', 20, 4);

-- 시즌 테이블
CREATE TABLE IF NOT EXISTS league_seasons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_number INT NOT NULL UNIQUE,
    season_name VARCHAR(100),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'UPCOMING', -- UPCOMING, ONGOING, PLAYOFFS, FINISHED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 참가 팀 테이블
CREATE TABLE IF NOT EXISTS league_participants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id INT NOT NULL,
    team_id CHAR(36), -- NULL이면 AI 팀
    league_id INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    is_ai BOOLEAN DEFAULT FALSE,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    points INT DEFAULT 0, -- 승점 (승 3점, 무 1점, 패 0점)
    goals_for INT DEFAULT 0, -- 득점
    goals_against INT DEFAULT 0, -- 실점
    goal_difference INT DEFAULT 0, -- 득실차
    final_rank INT, -- 시즌 종료 후 최종 순위
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    INDEX idx_season_league (season_id, league_id),
    INDEX idx_standings (season_id, league_id, points DESC, goal_difference DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리그 경기 테이블
CREATE TABLE IF NOT EXISTS league_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id INT NOT NULL,
    league_id INT NOT NULL,
    match_week INT NOT NULL, -- 몇 주차 경기인지
    home_participant_id CHAR(36) NOT NULL,
    away_participant_id CHAR(36) NOT NULL,
    home_score INT,
    away_score INT,
    match_date DATETIME,
    status VARCHAR(20) DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, FINISHED, CANCELLED
    match_data JSON, -- 경기 상세 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (home_participant_id) REFERENCES league_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (away_participant_id) REFERENCES league_participants(id) ON DELETE CASCADE,
    INDEX idx_season_league (season_id, league_id),
    INDEX idx_match_week (season_id, league_id, match_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 승강 플레이오프 매치 테이블
CREATE TABLE IF NOT EXISTS promotion_matches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    season_id INT NOT NULL,
    upper_league_id INT NOT NULL, -- 상위 리그
    lower_league_id INT NOT NULL, -- 하위 리그
    upper_participant_id CHAR(36) NOT NULL, -- 상위 리그 하위 2팀 중 하나
    lower_participant_id CHAR(36) NOT NULL, -- 하위 리그 상위 2팀 중 하나
    home_score INT,
    away_score INT,
    winner_participant_id CHAR(36), -- 승자
    match_date DATETIME,
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    match_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    FOREIGN KEY (upper_league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (lower_league_id) REFERENCES leagues(id) ON DELETE CASCADE,
    FOREIGN KEY (upper_participant_id) REFERENCES league_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (lower_participant_id) REFERENCES league_participants(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_participant_id) REFERENCES league_participants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 다음 시즌 일정 테이블
CREATE TABLE IF NOT EXISTS league_schedule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    season_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- MATCH_WEEK, PLAYOFFS, SEASON_END
    event_date DATETIME NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES league_seasons(id) ON DELETE CASCADE,
    INDEX idx_season_schedule (season_id, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
