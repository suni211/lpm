-- ============================================
-- LICO: 코인 → 주식 마이그레이션 SQL
-- coins → stocks, coin_id → stock_id (gold_balance 유지)
-- ============================================

USE lico_db;

-- 1. 외래 키 제약 조건 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 불필요한 테이블 삭제 (밈코인, 환전)
DROP TABLE IF EXISTS meme_coin_applications;
DROP TABLE IF EXISTS exchanges;
DROP TABLE IF EXISTS coin_blacklist;
DROP TABLE IF EXISTS coin_restrictions;

-- 3. coins 테이블 → stocks 테이블로 이름 변경
RENAME TABLE coins TO stocks;

-- 4. user_coin_balances → user_stock_balances 이름 변경
RENAME TABLE user_coin_balances TO user_stock_balances;

-- 5. stocks 테이블 컬럼 수정
-- coin_type, base_currency_id 삭제 (존재하는 경우)
ALTER TABLE stocks DROP COLUMN IF EXISTS coin_type;
ALTER TABLE stocks DROP COLUMN IF EXISTS base_currency_id;
ALTER TABLE stocks DROP COLUMN IF EXISTS creator_wallet_id;
ALTER TABLE stocks DROP COLUMN IF EXISTS is_supply_limited;
ALTER TABLE stocks DROP COLUMN IF EXISTS creator_can_trade;
ALTER TABLE stocks DROP COLUMN IF EXISTS trading_lock_until;

-- founder_uuid 추가
ALTER TABLE stocks ADD COLUMN founder_uuid VARCHAR(36) NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' COMMENT '창업자 Minecraft UUID (매도 제한 적용)' AFTER group_id;
ALTER TABLE stocks ADD INDEX idx_founder (founder_uuid);

-- industry_id, group_id 추가 (없는 경우)
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS industry_id CHAR(36) NULL COMMENT '산업 분류' AFTER description;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS group_id CHAR(36) NULL COMMENT '그룹(계열사)' AFTER industry_id;

-- 가격 정밀도 변경 (8자리 → 2자리)
ALTER TABLE stocks MODIFY initial_price DECIMAL(20, 2) NOT NULL COMMENT '초기 가격 (Gold)';
ALTER TABLE stocks MODIFY current_price DECIMAL(20, 2) NOT NULL COMMENT '현재 가격 (Gold)';

-- 6. user_stock_balances: coin_id → stock_id
ALTER TABLE user_stock_balances CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 7. user_wallets: gold_balance 유지 (Gold is the correct currency)
-- No column rename needed - gold_balance stays as gold_balance

-- 8. orders: coin_id → stock_id
ALTER TABLE orders CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;
-- is_ai_order 추가 (없는 경우)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_ai_order BOOLEAN DEFAULT FALSE COMMENT 'AI 주문 여부 (뉴스 영향)';

-- 9. trades: coin_id → stock_id
ALTER TABLE trades CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 10. candles_1m: coin_id → stock_id
ALTER TABLE candles_1m CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 11. candles_1h: coin_id → stock_id
ALTER TABLE candles_1h CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 12. candles_1d: coin_id → stock_id
ALTER TABLE candles_1d CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 13. ai_trade_logs: coin_id → stock_id
ALTER TABLE ai_trade_logs CHANGE COLUMN coin_id stock_id CHAR(36) NOT NULL;

-- 14. industries 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS industries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL COMMENT '산업 이름 (IT, 금융, 제조 등)',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO industries (name, description) VALUES
('IT/기술', 'IT 및 기술 관련 기업'),
('금융', '은행, 증권, 보험 등 금융업'),
('제조', '제조업 전반'),
('유통/소비재', '유통 및 소비재 산업'),
('헬스케어', '의료, 제약, 바이오'),
('에너지', '에너지 및 자원'),
('건설/부동산', '건설 및 부동산 개발'),
('엔터테인먼트', '게임, 미디어, 콘텐츠');

-- 15. stock_groups 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS stock_groups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL COMMENT '그룹명',
    logo_url VARCHAR(255) NULL COMMENT '그룹 로고',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO stock_groups (name, description) VALUES
('CK그룹', 'CK 계열 기업들'),
('리코그룹', 'Lico 계열 기업들'),
('플래닛그룹', 'Planet 계열 기업들');

-- 16. founder_sell_requests 테이블 생성
CREATE TABLE IF NOT EXISTS founder_sell_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stock_id CHAR(36) NOT NULL COMMENT '매도 대상 주식',
    wallet_id CHAR(36) NOT NULL COMMENT '창업자 지갑 ID',
    founder_uuid VARCHAR(36) NOT NULL COMMENT '창업자 Minecraft UUID',
    order_method ENUM('MARKET', 'LIMIT') NOT NULL COMMENT '주문 방식',
    price DECIMAL(20, 2) NULL COMMENT '지정가 (LIMIT인 경우, 원)',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '매도 수량',
    reason TEXT NULL COMMENT '매도 사유',
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    reviewed_by CHAR(36) NULL COMMENT '검토한 관리자 ID',
    reviewed_at TIMESTAMP NULL COMMENT '검토 시간',
    admin_comment TEXT NULL COMMENT '관리자 코멘트',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (reviewed_by) REFERENCES admins(id),
    INDEX idx_stock (stock_id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_status (status),
    INDEX idx_founder_uuid (founder_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. stop_orders 테이블: coin_id → stock_id (존재하는 경우)
ALTER TABLE stop_orders CHANGE COLUMN IF EXISTS coin_id stock_id CHAR(36) NOT NULL;

-- 18. 외래 키 제약 조건 다시 활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 마이그레이션 완료
SELECT 'Migration complete: coins → stocks, coin_id → stock_id (gold_balance preserved)' AS status;
