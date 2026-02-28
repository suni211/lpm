-- 기축 코인 시스템 마이그레이션
USE lico_db;

-- 1. coins 테이블에 컬럼 추가
ALTER TABLE coins
ADD COLUMN coin_type ENUM('MAJOR', 'MEME') DEFAULT 'MEME' COMMENT '코인 종류: MAJOR(기축코인, Gold로 거래), MEME(밈코인, MAJOR로 거래)',
ADD COLUMN base_currency_id CHAR(36) NULL COMMENT '거래 기준 코인 ID (MEME의 경우 MAJOR 코인 ID, MAJOR의 경우 NULL)',
ADD COLUMN high_24h DECIMAL(20, 8) NULL COMMENT '24시간 최고가',
ADD COLUMN low_24h DECIMAL(20, 8) NULL COMMENT '24시간 최저가',
ADD FOREIGN KEY (base_currency_id) REFERENCES coins(id) ON DELETE SET NULL;

-- 2. 거래 쌍 테이블 생성
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

-- 3. 환전 기록 테이블 생성
CREATE TABLE IF NOT EXISTS exchanges (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    from_coin_id CHAR(36) NOT NULL COMMENT '환전 전 코인',
    to_coin_id CHAR(36) NOT NULL COMMENT '환전 후 코인',
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

-- 4. 기존 코인들을 MEME로 설정 (기본값)
-- 나중에 관리자가 수동으로 MAJOR로 변경할 수 있음

-- 5. orders 테이블에 거래 쌍 지원 추가
ALTER TABLE orders
ADD COLUMN trading_pair_id CHAR(36) NULL COMMENT '거래 쌍 ID (NULL이면 Gold 거래)',
ADD COLUMN quote_currency_type ENUM('GOLD', 'COIN') DEFAULT 'GOLD' COMMENT '견적 화폐 종류',
ADD FOREIGN KEY (trading_pair_id) REFERENCES trading_pairs(id) ON DELETE SET NULL;

-- 6. trades 테이블에도 거래 쌍 지원 추가
ALTER TABLE trades
ADD COLUMN trading_pair_id CHAR(36) NULL COMMENT '거래 쌍 ID (NULL이면 Gold 거래)',
ADD COLUMN quote_currency_type ENUM('GOLD', 'COIN') DEFAULT 'GOLD' COMMENT '견적 화폐 종류',
ADD FOREIGN KEY (trading_pair_id) REFERENCES trading_pairs(id) ON DELETE SET NULL;
