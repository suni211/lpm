-- 구단 시설 시스템
-- 작전 연구소, 멘탈리스트 룸, 기록 예측 센터

-- 시설 정의 테이블
CREATE TABLE IF NOT EXISTS facilities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    facility_name VARCHAR(100) NOT NULL UNIQUE,
    facility_description TEXT,
    max_level INT NOT NULL,
    facility_type VARCHAR(50) NOT NULL, -- TACTIC_LAB, MENTALIST_ROOM, PREDICTION_CENTER
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시설 레벨별 비용 및 효과 테이블
CREATE TABLE IF NOT EXISTS facility_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    facility_id INT NOT NULL,
    level INT NOT NULL,
    upgrade_cost BIGINT NOT NULL, -- 업그레이드 비용 (원)
    effect_description TEXT, -- 효과 설명
    effect_value INT, -- 효과 값
    unlock_feature VARCHAR(100), -- 해금되는 기능
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    UNIQUE KEY (facility_id, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 팀 시설 보유 현황 테이블
CREATE TABLE IF NOT EXISTS team_facilities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    facility_id INT NOT NULL,
    current_level INT DEFAULT 0,
    last_upgraded_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    UNIQUE KEY (team_id, facility_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시설 업그레이드 내역
CREATE TABLE IF NOT EXISTS facility_upgrade_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_facility_id CHAR(36) NOT NULL,
    from_level INT NOT NULL,
    to_level INT NOT NULL,
    cost_paid BIGINT NOT NULL,
    upgraded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_facility_id) REFERENCES team_facilities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시설 데이터 삽입
INSERT INTO facilities (facility_name, facility_description, max_level, facility_type) VALUES
('작전 연구소', '작전 카드와 서포트 카드를 연구하고 획득할 수 있는 시설', 5, 'TACTIC_LAB'),
('멘탈리스트 룸', '선수의 교정, 멘토링, 특성 훈련을 종합적으로 관리하는 시설', 10, 'MENTALIST_ROOM'),
('기록 예측 센터', '경기 결과를 예측하고 데이터를 분석하는 시설', 10, 'PREDICTION_CENTER');

-- 작전 연구소 레벨별 데이터
INSERT INTO facility_levels (facility_id, level, upgrade_cost, effect_description, effect_value, unlock_feature) VALUES
(1, 1, 50000000, '작전/서포트 카드 획득 확률 +5%', 5, '기본 카드 획득'),
(1, 2, 100000000, '작전/서포트 카드 획득 확률 +10%', 10, 'RARE 카드 획득 가능'),
(1, 3, 200000000, '작전/서포트 카드 획득 확률 +15%', 15, 'EPIC 카드 획득 가능'),
(1, 4, 300000000, '작전/서포트 카드 획득 확률 +20%', 20, 'LEGEND 카드 획득 확률 증가'),
(1, 5, 500000000, '작전/서포트 카드 획득 확률 +30%', 30, '전설 카드 높은 확률로 획득');

-- 멘탈리스트 룸 레벨별 데이터 (총 100억)
INSERT INTO facility_levels (facility_id, level, upgrade_cost, effect_description, effect_value, unlock_feature) VALUES
(2, 1, 50000000, '교정 효과 +5%', 5, '기본 교정 가능'),
(2, 2, 200000000, '교정 효과 +10%, 멘토링 해금', 10, '멘토링 시스템 해금'),
(2, 3, 500000000, '교정 효과 +15%, 멘토링 효율 +10%', 15, '고급 멘토링'),
(2, 4, 1000000000, '교정 효과 +20%, 특성 훈련 해금', 20, '특성 훈련 시스템 해금'),
(2, 5, 1500000000, '모든 효과 +25%', 25, '특성 재훈련 가능'),
(2, 6, 2000000000, '모든 효과 +30%', 30, '동시 훈련 2명'),
(2, 7, 2250000000, '모든 효과 +35%', 35, '동시 훈련 3명'),
(2, 8, 2500000000, '모든 효과 +40%', 40, '특성 강화 가능'),
(2, 9, 3000000000, '모든 효과 +50%', 50, '동시 훈련 5명'),
(2, 10, 5000000000, '모든 효과 +70%, 특급 훈련', 70, '특성 2개 동시 훈련');

-- 기록 예측 센터 레벨별 데이터
INSERT INTO facility_levels (facility_id, level, upgrade_cost, effect_description, effect_value, unlock_feature) VALUES
(3, 1, 100000000, '예측 정확도 60%', 60, '기본 예측 기능'),
(3, 2, 200000000, '예측 정확도 65%', 65, '상대 전력 분석'),
(3, 3, 300000000, '예측 정확도 70%', 70, '라인별 매치업 분석'),
(3, 4, 500000000, '예측 정확도 75%', 75, '작전 카드 효과 예측'),
(3, 5, 700000000, '예측 정확도 80%', 80, '특성 발동 확률 표시'),
(3, 6, 1000000000, '예측 정확도 85%', 85, '한타 승률 예측'),
(3, 7, 1500000000, '예측 정확도 88%', 88, '페이즈별 승률 예측'),
(3, 8, 2000000000, '예측 정확도 91%', 91, '변수 시뮬레이션'),
(3, 9, 2500000000, '예측 정확도 94%', 94, '최적 로스터 추천'),
(3, 10, 3000000000, '예측 정확도 97%', 97, 'AI 기반 완벽 예측');
