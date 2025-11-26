-- 스폰서 시스템 DB 스키마
-- 팀이 스폰서와 계약하여 이점과 자금을 받는 시스템

-- 스폰서 테이블
CREATE TABLE IF NOT EXISTS sponsors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sponsor_name VARCHAR(100) NOT NULL UNIQUE,
    sponsor_logo VARCHAR(255), -- 스폰서 로고 경로
    monthly_payment BIGINT NOT NULL, -- 월급 (원)
    bonus_type VARCHAR(50), -- CONDITION, POWER, MONEY, CARD_CHANCE, XP
    bonus_value INT, -- 보너스 값 (%)
    bonus_description TEXT, -- 보너스 설명
    contract_duration INT DEFAULT 12, -- 계약 기간 (개월)
    tier VARCHAR(20) DEFAULT 'NORMAL', -- SMALL, NORMAL, BIG, MEGA
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 팀 스폰서 계약 테이블
CREATE TABLE IF NOT EXISTS team_sponsors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    sponsor_id INT NOT NULL,
    contract_start_date DATETIME NOT NULL,
    contract_end_date DATETIME NOT NULL,
    monthly_payment BIGINT NOT NULL, -- 계약 당시 월급 (고정)
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id) ON DELETE CASCADE,
    INDEX idx_team_active (team_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스폰서 지급 내역
CREATE TABLE IF NOT EXISTS sponsor_payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_sponsor_id CHAR(36) NOT NULL,
    payment_date DATETIME NOT NULL,
    amount BIGINT NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'MONTHLY', -- MONTHLY, BONUS, TERMINATION
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_sponsor_id) REFERENCES team_sponsors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
