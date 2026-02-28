-- 기존 코인 전부 삭제 후 마이그레이션 실행
USE lico_db;

-- 1. 외래 키 제약 조건 임시 비활성화
SET FOREIGN_KEY_CHECKS = 0;

-- 2. 기존 코인 관련 데이터 전부 삭제
DELETE FROM ai_trade_logs;
DELETE FROM trades;
DELETE FROM orders;
DELETE FROM user_coin_balances;
DELETE FROM candles_1m;
DELETE FROM candles_1h;
DELETE FROM candles_1d;
DELETE FROM coins;

-- 3. 외래 키 제약 조건 재활성화
SET FOREIGN_KEY_CHECKS = 1;

-- 4. coins 테이블에 컬럼 추가 (이미 있으면 오류 무시)
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS coin_type ENUM('MAJOR', 'MEME') DEFAULT 'MEME' COMMENT '코인 종류: MAJOR(기축코인, Gold로 거래), MEME(밈코인, MAJOR로 거래)';

ALTER TABLE coins
ADD COLUMN IF NOT EXISTS base_currency_id CHAR(36) NULL COMMENT '거래 기준 코인 ID (MEME의 경우 MAJOR 코인 ID, MAJOR의 경우 NULL)';

ALTER TABLE coins
ADD COLUMN IF NOT EXISTS high_24h DECIMAL(20, 8) NULL COMMENT '24시간 최고가';

ALTER TABLE coins
ADD COLUMN IF NOT EXISTS low_24h DECIMAL(20, 8) NULL COMMENT '24시간 최저가';

-- base_currency_id 외래 키 추가 (이미 있으면 오류 무시)
-- MariaDB는 IF NOT EXISTS를 지원하지 않으므로 수동으로 확인 필요
-- ALTER TABLE coins ADD FOREIGN KEY (base_currency_id) REFERENCES coins(id) ON DELETE SET NULL;

-- 5. 거래 쌍 테이블 생성
CREATE TABLE IF NOT EXISTS trading_pairs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    base_coin_id CHAR(36) NOT NULL COMMENT '기준 코인 (DOGE, SHIB 등)',
    quote_coin_id CHAR(36) NOT NULL COMMENT '견적 코인 (SOL, ETH, Gold 등)',
    symbol VARCHAR(20) NOT NULL COMMENT '거래 쌍 심볼 (DOGE/SOL)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (base_coin_id) REFERENCES coins(id) ON DELETE CASCADE,
    FOREIGN KEY (quote_coin_id) REFERENCES coins(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pair (base_coin_id, quote_coin_id),
    INDEX idx_symbol (symbol),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 환전 기록 테이블 생성
CREATE TABLE IF NOT EXISTS exchanges (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    from_coin_id CHAR(36) NOT NULL COMMENT '환전 전 코인',
    to_coin_id CHAR(36) NULL COMMENT '환전 후 코인 (NULL이면 Gold)',
    from_amount DECIMAL(20, 8) NOT NULL COMMENT '환전 전 수량',
    to_amount DECIMAL(20, 8) NOT NULL COMMENT '환전 후 수량',
    exchange_rate DECIMAL(20, 8) NOT NULL COMMENT '환전 비율',
    fee_percentage DECIMAL(5, 2) NOT NULL COMMENT '수수료 % (5.00 = 5%)',
    fee_amount DECIMAL(20, 8) NOT NULL COMMENT '수수료 금액',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (from_coin_id) REFERENCES coins(id) ON DELETE CASCADE,
    FOREIGN KEY (to_coin_id) REFERENCES coins(id) ON DELETE CASCADE,
    INDEX idx_wallet (wallet_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. orders 테이블에 거래 쌍 지원 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS trading_pair_id CHAR(36) NULL COMMENT '거래 쌍 ID (NULL이면 Gold 거래)';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS quote_currency_type ENUM('GOLD', 'COIN') DEFAULT 'GOLD' COMMENT '견적 화폐 종류';

-- 8. trades 테이블에도 거래 쌍 지원 추가
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS trading_pair_id CHAR(36) NULL COMMENT '거래 쌍 ID (NULL이면 Gold 거래)';

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS quote_currency_type ENUM('GOLD', 'COIN') DEFAULT 'GOLD' COMMENT '견적 화폐 종류';

SELECT '✅ 마이그레이션 완료!' as status;
