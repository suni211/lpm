-- 특성 시스템 DB 스키마
-- 코스트별 특성 획득 확률과 포지션별 특성 정의

-- 특성 테이블
CREATE TABLE IF NOT EXISTS traits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    trait_name VARCHAR(100) NOT NULL UNIQUE,
    trait_description TEXT,
    position VARCHAR(20), -- TOP, JUNGLE, MID, ADC, SUPPORT, ALL (모든 포지션)
    category VARCHAR(50), -- LANING, TEAMFIGHT, MENTAL, SPECIAL
    effect_type VARCHAR(100), -- 효과 타입 (POWER_BOOST, SOLOKILL_CHANCE, etc)
    effect_value INT, -- 효과 값 (%)
    phase INT, -- 1(라인전), 2(오브젝트 한타), 3(마지막 한타), 0(전체)
    is_positive BOOLEAN DEFAULT TRUE, -- 긍정적 특성인지 부정적 특성인지
    rarity VARCHAR(20) DEFAULT 'NORMAL', -- NORMAL, RARE, EPIC, LEGEND
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 선수 특성 테이블 (선수가 보유한 특성)
CREATE TABLE IF NOT EXISTS player_traits (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    player_card_id INT NOT NULL,
    trait_id INT NOT NULL,
    acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE, -- 활성화 여부
    FOREIGN KEY (player_card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (trait_id) REFERENCES traits(id) ON DELETE CASCADE,
    UNIQUE KEY (player_card_id, trait_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 코스트별 특성 획득 확률 테이블
CREATE TABLE IF NOT EXISTS trait_acquisition_rates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cost INT NOT NULL UNIQUE, -- 1~10
    acquisition_rate DECIMAL(5,2) NOT NULL, -- 획득 확률 (%)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 코스트별 특성 획득 확률 데이터 삽입
INSERT INTO trait_acquisition_rates (cost, acquisition_rate) VALUES
(1, 0.9),
(2, 1.0),
(3, 1.1),
(4, 2.0),
(5, 2.1),
(6, 2.7),
(7, 4.2),
(8, 6.0),
(9, 8.0),
(10, 10.0);
