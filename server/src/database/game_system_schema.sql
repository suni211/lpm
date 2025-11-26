-- LPM 게임 시스템 전체 스키마

-- 1. 선수 카드 관련
-- 컨디션 상태 (빨강 > 주황 > 노랑 > 파랑 > 보라)
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `condition` ENUM('RED', 'ORANGE', 'YELLOW', 'BLUE', 'PURPLE') DEFAULT 'YELLOW';
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `cost` INT DEFAULT 5 CHECK (cost >= 1 AND cost <= 10);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `mental` INT DEFAULT 50 CHECK (mental >= 1 AND mental <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `teamfight` INT DEFAULT 50 CHECK (teamfight >= 1 AND teamfight <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `cs_ability` INT DEFAULT 50 CHECK (cs_ability >= 1 AND cs_ability <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `vision` INT DEFAULT 50 CHECK (vision >= 1 AND vision <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `judgement` INT DEFAULT 50 CHECK (judgement >= 1 AND judgement <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `laning` INT DEFAULT 50 CHECK (laning >= 1 AND laning <= 99);
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `experience` BIGINT DEFAULT 0;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `level` INT DEFAULT 1;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `max_experience` BIGINT DEFAULT 135000000;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `team_chemistry` INT DEFAULT 50;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `solo_rank_current` INT DEFAULT NULL;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `solo_rank_peak` INT DEFAULT NULL;
ALTER TABLE player_cards ADD COLUMN IF NOT EXISTS `solo_rank_previous` INT DEFAULT NULL;

-- 2. 특성 시스템
CREATE TABLE IF NOT EXISTS `traits` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `position` ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'ALL', 'TEAMFIGHT') NOT NULL,
    `description` TEXT,
    `effect_type` VARCHAR(50),
    `effect_value` INT,
    `activation_chance` DECIMAL(5,2),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 특성 데이터 삽입
INSERT INTO traits (name, position, description, activation_chance) VALUES
-- 탑 특성
('정신병자', 'TOP', '압도적인 라인전 압박', 8.0),
('솔로킬 머신', 'TOP', '솔로킬 확률 증가', 8.0),
('한타의 지배자', 'TOP', '한타 기여도 상승', 8.0),
('언더독', 'TOP', '불리할 때 더 강해짐', 8.0),
('갑작스런 쓰로잉', 'TOP', '예상치 못한 실수', 8.0),

-- 정글 특성
('카정충', 'JUNGLE', '적 정글 침입 특화', 8.0),
('갱크충', 'JUNGLE', '갱킹 성공률 증가', 8.0),
('미드만 봐줘', 'JUNGLE', '미드 라인 집중 지원', 8.0),
('바텀만 봐줘', 'JUNGLE', '바텀 라인 집중 지원', 8.0),
('탑은 버려', 'JUNGLE', '탑 라인 방치', 8.0),

-- 미드 특성
('기선 제압', 'MID', '초반 우위 점유', 8.0),
('공포심 자극', 'MID', '상대 멘탈 공격', 8.0),
('정글 도와줄게', 'MID', '정글러와 호흡', 8.0),
('SHOW MAKER', 'MID', '극한의 플레이메이킹', 10.0),
('고전파', 'MID', '전통적인 플레이', 8.0),
('갑작스런 그랩 끌리기', 'MID', '치명적 실수', 8.0),

-- 원딜 특성
('알파카임미다', 'ADC', 'DEFT 헌정 - 극한의 안정감', 10.0),
('땅땅땅 빵', 'ADC', '폭발적인 딜링', 8.0),
('F점멸 뒷 비전', 'ADC', '생존력 극대화', 8.0),

-- 서포터 특성은 추후 추가

-- 공통 특성
('추격의 시작', 'ALL', '적극적인 추격전', 6.0),
('자석', 'ALL', '그랩류 스킬에 자주 당함', 6.0),
('골든 루키', 'ALL', '신인의 패기', 10.0),
('영웅 놀이', 'ALL', '무리한 플레이 시도', 6.0),
('철인', 'ALL', '부상 면역', 4.0),

-- 한타 전용
('한타 던질게', 'TEAMFIGHT', '한타 패배 가능성', 8.0),
('한타 잡을게', 'TEAMFIGHT', '한타 승리 가능성', 8.0),
('한타, 지배해주지', 'TEAMFIGHT', '한타 완벽 수행', 10.0);

-- 3. 선수-특성 연결 테이블
CREATE TABLE IF NOT EXISTS `player_traits` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `card_id` INT NOT NULL,
    `trait_id` INT NOT NULL,
    `acquired_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (trait_id) REFERENCES traits(id),
    UNIQUE KEY unique_player_trait (card_id, trait_id)
);

-- 4. 작전 카드
CREATE TABLE IF NOT EXISTS `strategy_cards` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `position` ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT') NOT NULL,
    `description` TEXT,
    `effect_type` VARCHAR(50),
    `effect_value` INT,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') DEFAULT 'COMMON',
    `image_url` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 서포트 카드
CREATE TABLE IF NOT EXISTS `support_cards` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT,
    `target` ENUM('CONDITION', 'STRATEGY', 'STATS', 'ALL') NOT NULL,
    `effect_type` VARCHAR(50),
    `effect_value` INT,
    `rarity` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') DEFAULT 'COMMON',
    `image_url` VARCHAR(500),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 감독 시스템
CREATE TABLE IF NOT EXISTS `coaches` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `team_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `order_stat` INT DEFAULT 50 CHECK (order_stat >= 1 AND order_stat <= 99),
    `ban_pick` INT DEFAULT 50 CHECK (ban_pick >= 1 AND ban_pick <= 99),
    `meta` INT DEFAULT 50 CHECK (meta >= 1 AND meta <= 99),
    `cold` INT DEFAULT 50 CHECK (cold >= 1 AND cold <= 99),
    `hot` INT DEFAULT 50 CHECK (hot >= 1 AND hot <= 99),
    `salary` INT DEFAULT 10000000,
    `contract_end` DATE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- 7. 구단 시설
CREATE TABLE IF NOT EXISTS `facilities` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `team_id` VARCHAR(36) NOT NULL,
    `strategy_lab_level` INT DEFAULT 1 CHECK (strategy_lab_level >= 1 AND strategy_lab_level <= 5),
    `mentalist_room_level` INT DEFAULT 1 CHECK (mentalist_room_level >= 1 AND mentalist_room_level <= 10),
    `prediction_center_level` INT DEFAULT 1 CHECK (prediction_center_level >= 1 AND prediction_center_level <= 5),
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_facility (team_id)
);

-- 8. 스폰서 시스템
CREATE TABLE IF NOT EXISTS `sponsors` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `logo_url` VARCHAR(500),
    `tier` ENUM('S', 'A', 'B', 'C') DEFAULT 'C',
    `weekly_payment` INT DEFAULT 1000000,
    `bonus_type` VARCHAR(50),
    `bonus_value` INT,
    `requirements` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 스폰서 데이터 삽입
INSERT INTO sponsors (name, tier, weekly_payment, bonus_type) VALUES
('레드불', 'S', 10000000, 'CONDITION'),
('삼성', 'S', 12000000, 'FACILITY'),
('나이키', 'A', 8000000, 'TRAINING'),
('코카콜라', 'A', 7000000, 'FANS'),
('BMW', 'A', 9000000, 'STRATEGY'),
('소니', 'B', 5000000, 'STATS'),
('도미노', 'B', 4000000, 'CONDITION'),
('기아', 'C', 3000000, 'NONE'),
('TicTac', 'C', 2000000, 'NONE');

-- 9. 팀-스폰서 계약
CREATE TABLE IF NOT EXISTS `team_sponsors` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `team_id` VARCHAR(36) NOT NULL,
    `sponsor_id` INT NOT NULL,
    `contract_start` DATE NOT NULL,
    `contract_end` DATE NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (sponsor_id) REFERENCES sponsors(id)
);

-- 10. 경기 로스터 (코스트 체크 포함)
CREATE TABLE IF NOT EXISTS `match_rosters` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `match_id` VARCHAR(36) NOT NULL,
    `team_id` VARCHAR(36) NOT NULL,
    `top_player_id` INT,
    `jungle_player_id` INT,
    `mid_player_id` INT,
    `adc_player_id` INT,
    `support_player_id` INT,
    `total_cost` INT DEFAULT 0,
    `is_valid` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (top_player_id) REFERENCES player_cards(id),
    FOREIGN KEY (jungle_player_id) REFERENCES player_cards(id),
    FOREIGN KEY (mid_player_id) REFERENCES player_cards(id),
    FOREIGN KEY (adc_player_id) REFERENCES player_cards(id),
    FOREIGN KEY (support_player_id) REFERENCES player_cards(id),
    CHECK (total_cost <= 48)
);

-- 11. 경기 작전 카드 배치
CREATE TABLE IF NOT EXISTS `match_strategy_cards` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `roster_id` VARCHAR(36) NOT NULL,
    `position` ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT') NOT NULL,
    `strategy_card_id` INT,
    `support_card_id` INT,
    FOREIGN KEY (roster_id) REFERENCES match_rosters(id) ON DELETE CASCADE,
    FOREIGN KEY (strategy_card_id) REFERENCES strategy_cards(id),
    FOREIGN KEY (support_card_id) REFERENCES support_cards(id)
);

-- 12. 경기 시뮬레이션 로그
CREATE TABLE IF NOT EXISTS `match_simulations` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `match_id` VARCHAR(36) NOT NULL,
    `phase` ENUM('LANING', 'OBJECTIVE', 'TEAMFIGHT') NOT NULL,
    `home_power` INT DEFAULT 0,
    `away_power` INT DEFAULT 0,
    `narration` TEXT,
    `dice_roll` INT,
    `traits_activated` JSON,
    `phase_winner` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- 13. 친선 경기
CREATE TABLE IF NOT EXISTS `friendly_matches` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `host_team_id` VARCHAR(36) NOT NULL,
    `guest_team_id` VARCHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    `match_id` VARCHAR(36),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

-- 14. 포스팅 (경매)
CREATE TABLE IF NOT EXISTS `postings` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `card_id` INT NOT NULL,
    `seller_team_id` VARCHAR(36) NOT NULL,
    `starting_price` INT NOT NULL,
    `current_price` INT NOT NULL,
    `current_bidder_id` VARCHAR(36),
    `end_time` TIMESTAMP NOT NULL,
    `status` ENUM('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED') DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES player_cards(id),
    FOREIGN KEY (seller_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (current_bidder_id) REFERENCES teams(id)
);

-- 15. 포스팅 입찰 기록
CREATE TABLE IF NOT EXISTS `posting_bids` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `posting_id` VARCHAR(36) NOT NULL,
    `bidder_team_id` VARCHAR(36) NOT NULL,
    `bid_amount` INT NOT NULL,
    `bid_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posting_id) REFERENCES postings(id) ON DELETE CASCADE,
    FOREIGN KEY (bidder_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- 16. 시즌 보상
CREATE TABLE IF NOT EXISTS `season_rewards` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `season_number` INT NOT NULL,
    `team_id` VARCHAR(36) NOT NULL,
    `final_tier` VARCHAR(20) NOT NULL,
    `final_lp` INT NOT NULL,
    `money_reward` INT NOT NULL,
    `strategy_cards` JSON,
    `claimed` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- 17. 훈련 기록
CREATE TABLE IF NOT EXISTS `training_records` (
    `id` VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `card_id` INT NOT NULL,
    `training_type` ENUM('CORRECTION', 'MENTORING', 'TRAIT') NOT NULL,
    `mentor_id` INT,
    `stat_improved` VARCHAR(50),
    `improvement_value` INT,
    `cost` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES player_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES player_cards(id)
);

-- 18. 팀 통계 집계 뷰
CREATE OR REPLACE VIEW team_power_stats AS
SELECT
    t.id as team_id,
    t.team_name,
    t.current_tier,
    t.lp,
    COUNT(DISTINCT pc.id) as total_players,
    AVG(pc.cost) as avg_cost,
    AVG((pc.mental + pc.teamfight + pc.cs_ability + pc.vision + pc.judgement + pc.laning) / 6) as avg_overall,
    MAX(pc.level) as max_player_level,
    COUNT(DISTINCT pt.trait_id) as total_traits,
    f.strategy_lab_level,
    f.mentalist_room_level,
    f.prediction_center_level
FROM teams t
LEFT JOIN player_cards pc ON pc.owner_team_id = t.id
LEFT JOIN player_traits pt ON pt.card_id = pc.id
LEFT JOIN facilities f ON f.team_id = t.id
GROUP BY t.id;

-- 인덱스 생성
CREATE INDEX idx_player_cards_team ON player_cards(owner_team_id);
CREATE INDEX idx_player_cards_cost ON player_cards(cost);
CREATE INDEX idx_player_cards_level ON player_cards(level);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_postings_status_end ON postings(status, end_time);
CREATE INDEX idx_match_rosters_match ON match_rosters(match_id);
CREATE INDEX idx_match_simulations_match ON match_simulations(match_id);