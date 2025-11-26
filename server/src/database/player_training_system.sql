-- 선수 육성 시스템 DB 스키마
-- 교정, 멘토링, 특성 훈련

-- 훈련 타입 정의
-- CORRECTION: 교정 (부정적 특성 제거 또는 능력치 조정)
-- MENTORING: 멘토링 (1대1 선수 간 능력치 전수)
-- TRAIT_TRAINING: 특성 훈련 (새로운 특성 획득)

-- 교정 프로그램 테이블
CREATE TABLE IF NOT EXISTS correction_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    program_description TEXT,
    target_type VARCHAR(50) NOT NULL, -- NEGATIVE_TRAIT, STAT_BOOST, CONDITION_FIX
    cost BIGINT NOT NULL, -- 비용
    duration_days INT NOT NULL, -- 소요 기간 (일)
    success_rate DECIMAL(5,2) DEFAULT 100.00, -- 성공 확률
    facility_level_required INT DEFAULT 0, -- 필요한 멘탈리스트 룸 레벨
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 교정 프로그램 데이터
INSERT INTO correction_programs (program_name, program_description, target_type, cost, duration_days, success_rate, facility_level_required) VALUES
('기본 교정', '부정적 특성 제거 시도', 'NEGATIVE_TRAIT', 10000000, 7, 60.00, 1),
('집중 교정', '부정적 특성 확실히 제거', 'NEGATIVE_TRAIT', 30000000, 14, 90.00, 3),
('능력치 특훈', '특정 능력치 +1~3 상승', 'STAT_BOOST', 20000000, 10, 80.00, 2),
('컨디션 회복', '컨디션을 YELLOW 이상으로 회복', 'CONDITION_FIX', 15000000, 5, 100.00, 1);

-- 멘토링 프로그램 테이블
CREATE TABLE IF NOT EXISTS mentoring_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    program_description TEXT,
    mentor_min_level INT DEFAULT 50, -- 멘토 최소 레벨
    mentee_max_level INT DEFAULT 30, -- 멘티 최대 레벨
    cost BIGINT NOT NULL,
    duration_days INT NOT NULL,
    stat_transfer_rate DECIMAL(5,2) DEFAULT 10.00, -- 능력치 전수율 (%)
    exp_gain BIGINT DEFAULT 0, -- 멘티 경험치 획득
    facility_level_required INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 멘토링 프로그램 데이터
INSERT INTO mentoring_programs (program_name, program_description, mentor_min_level, mentee_max_level, cost, duration_days, stat_transfer_rate, exp_gain, facility_level_required) VALUES
('기본 멘토링', '선배가 후배에게 경험 전수', 50, 30, 5000000, 7, 5.00, 500000, 2),
('집중 멘토링', '1대1 심화 훈련', 60, 40, 15000000, 14, 10.00, 1500000, 3),
('마스터 멘토링', '최상급 선수의 노하우 전수', 80, 50, 50000000, 21, 15.00, 5000000, 5);

-- 특성 훈련 프로그램 테이블
CREATE TABLE IF NOT EXISTS trait_training_programs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    program_name VARCHAR(100) NOT NULL,
    program_description TEXT,
    target_trait_id INT, -- 특정 특성 (NULL이면 랜덤)
    cost BIGINT NOT NULL,
    duration_days INT NOT NULL,
    success_rate DECIMAL(5,2) DEFAULT 50.00,
    facility_level_required INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_trait_id) REFERENCES traits(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 특성 훈련 프로그램 데이터
INSERT INTO trait_training_programs (program_name, program_description, target_trait_id, cost, duration_days, success_rate, facility_level_required) VALUES
('랜덤 특성 훈련', '랜덤한 긍정 특성 획득 시도', NULL, 30000000, 14, 40.00, 4),
('포지션 특화 훈련', '포지션에 맞는 특성 획득 시도', NULL, 50000000, 21, 60.00, 5),
('특급 특성 훈련', '희귀 특성 획득 확률 증가', NULL, 100000000, 30, 30.00, 7);

-- 진행 중인 훈련 테이블
CREATE TABLE IF NOT EXISTS active_trainings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    player_card_id INT NOT NULL,
    training_type VARCHAR(50) NOT NULL, -- CORRECTION, MENTORING, TRAIT_TRAINING
    program_id INT NOT NULL, -- correction/mentoring/trait_training_programs의 ID
    mentor_player_id INT, -- 멘토링일 경우 멘토 선수 ID
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status VARCHAR(20) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, CANCELLED
    cost_paid BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_player_id) REFERENCES player_cards(id) ON DELETE SET NULL,
    INDEX idx_team_trainings (team_id, status, end_date),
    INDEX idx_player_trainings (player_card_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 훈련 완료 내역 테이블
CREATE TABLE IF NOT EXISTS training_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    active_training_id CHAR(36) NOT NULL,
    team_id CHAR(36) NOT NULL,
    player_card_id INT NOT NULL,
    training_type VARCHAR(50) NOT NULL,
    program_name VARCHAR(100) NOT NULL,
    success BOOLEAN NOT NULL,
    result_description TEXT, -- 훈련 결과 설명
    stat_changes JSON, -- 능력치 변화
    trait_acquired INT, -- 획득한 특성 ID
    trait_removed INT, -- 제거된 특성 ID
    completed_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (active_training_id) REFERENCES active_trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (trait_acquired) REFERENCES traits(id) ON DELETE SET NULL,
    FOREIGN KEY (trait_removed) REFERENCES traits(id) ON DELETE SET NULL,
    INDEX idx_player_history (player_card_id, completed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 훈련 통계 (팀별)
CREATE TABLE IF NOT EXISTS training_stats (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL UNIQUE,
    total_trainings INT DEFAULT 0,
    successful_trainings INT DEFAULT 0,
    failed_trainings INT DEFAULT 0,
    total_spent BIGINT DEFAULT 0, -- 총 지출
    traits_acquired INT DEFAULT 0,
    traits_removed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
