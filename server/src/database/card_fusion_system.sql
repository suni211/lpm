-- 전력 보강 (카드 합성) 시스템 DB 스키마
-- 1~8 코스트 선수 카드를 갈아서 작전 카드 획득

-- 합성 레시피 테이블
CREATE TABLE IF NOT EXISTS fusion_recipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_name VARCHAR(100) NOT NULL,
    required_cards INT NOT NULL, -- 필요한 카드 개수
    min_cost INT NOT NULL, -- 최소 코스트
    max_cost INT NOT NULL, -- 최대 코스트
    reward_type VARCHAR(50) NOT NULL, -- TACTIC_CARD, SUPPORT_CARD, MONEY
    reward_rarity VARCHAR(20), -- 보상 카드 레어도 (NORMAL, RARE, EPIC, LEGEND)
    success_rate DECIMAL(5,2) DEFAULT 100.00, -- 성공 확률 (%)
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 합성 레시피 데이터 삽입
INSERT INTO fusion_recipes (recipe_name, required_cards, min_cost, max_cost, reward_type, reward_rarity, success_rate, description) VALUES
('기본 합성', 3, 1, 3, 'TACTIC_CARD', 'NORMAL', 100.00, '낮은 코스트 카드 3장으로 노멀 작전 카드 획득'),
('중급 합성', 3, 4, 5, 'TACTIC_CARD', 'RARE', 80.00, '중급 코스트 카드 3장으로 레어 작전 카드 획득 (80%)'),
('고급 합성', 4, 6, 7, 'TACTIC_CARD', 'EPIC', 60.00, '고급 코스트 카드 4장으로 에픽 작전 카드 획득 (60%)'),
('전설 합성', 5, 8, 8, 'TACTIC_CARD', 'LEGEND', 30.00, '최고 코스트 카드 5장으로 전설 작전 카드 획득 (30%)'),
('서포트 합성', 2, 1, 5, 'SUPPORT_CARD', 'NORMAL', 100.00, '저~중급 카드 2장으로 노멀 서포트 카드 획득'),
('고급 서포트 합성', 3, 6, 8, 'SUPPORT_CARD', 'RARE', 70.00, '고급 카드 3장으로 레어 서포트 카드 획득 (70%)'),
('돈 합성', 5, 1, 4, 'MONEY', NULL, 100.00, '저급 카드 5장을 2000만원으로 전환');

-- 합성 기록 테이블
CREATE TABLE IF NOT EXISTS fusion_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL,
    recipe_id INT NOT NULL,
    sacrificed_cards JSON NOT NULL, -- 사용된 카드 ID 배열
    success BOOLEAN NOT NULL, -- 합성 성공 여부
    reward_type VARCHAR(50) NOT NULL,
    reward_card_id INT, -- 획득한 카드 ID (작전/서포트)
    reward_money BIGINT, -- 획득한 돈
    fusion_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES fusion_recipes(id) ON DELETE CASCADE,
    INDEX idx_team_fusions (team_id, fusion_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 합성 통계 (팀별)
CREATE TABLE IF NOT EXISTS fusion_stats (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    team_id CHAR(36) NOT NULL UNIQUE,
    total_fusions INT DEFAULT 0,
    successful_fusions INT DEFAULT 0,
    failed_fusions INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    total_cards_sacrificed INT DEFAULT 0,
    legendary_obtained INT DEFAULT 0, -- 전설 카드 획득 수
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
