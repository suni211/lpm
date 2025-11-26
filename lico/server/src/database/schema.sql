-- Lico Cryptocurrency Exchange Database Schema

CREATE DATABASE IF NOT EXISTS lico_exchange CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lico_exchange;

-- 관리자 계정 테이블
CREATE TABLE admins (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN') DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 코인 정보 테이블
CREATE TABLE coins (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    symbol VARCHAR(10) UNIQUE NOT NULL COMMENT '코인 약자 (BTC, ETH)',
    name VARCHAR(100) NOT NULL COMMENT '코인 이름 (Bitcoin, Ethereum)',
    logo_url VARCHAR(255) NULL COMMENT '코인 로고 이미지 URL',
    description TEXT NULL,
    initial_supply BIGINT NOT NULL COMMENT '초기 발행량',
    circulating_supply BIGINT NOT NULL COMMENT '현재 유통량',
    initial_price DECIMAL(20, 8) NOT NULL COMMENT '초기 가격 (Gold)',
    current_price DECIMAL(20, 8) NOT NULL COMMENT '현재 가격 (Gold)',
    price_change_24h DECIMAL(10, 2) DEFAULT 0 COMMENT '24시간 가격 변동률 (%)',
    volume_24h BIGINT DEFAULT 0 COMMENT '24시간 거래량',
    market_cap BIGINT AS (circulating_supply * current_price) STORED COMMENT '시가총액',
    status ENUM('ACTIVE', 'PAUSED', 'DELISTED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LICO 가입 설문조사 테이블
CREATE TABLE lico_questionnaires (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    minecraft_username VARCHAR(16) UNIQUE NOT NULL,
    question1_score INT NOT NULL COMMENT '계산적이며 골드 많고 감당 가능? 예(10) 아니요(0)',
    question2_score INT NOT NULL COMMENT '현실 주식 성과? 예(50) 보통(30) 아니요(0)',
    question3_score INT NOT NULL COMMENT '블록체인 책임 동의? 예(30) 아니요(0)',
    total_score INT AS (question1_score + question2_score + question3_score) STORED,
    is_approved BOOLEAN DEFAULT FALSE COMMENT '90점 이상 자동 승인',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (minecraft_username),
    INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 계좌 (Bank 연동)
CREATE TABLE user_wallets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_address VARCHAR(42) UNIQUE NOT NULL COMMENT '지갑 주소 (0x...)',
    minecraft_username VARCHAR(16) UNIQUE NOT NULL,
    minecraft_uuid VARCHAR(36) UNIQUE,
    bank_account_number VARCHAR(20) NULL COMMENT 'Bank 계좌번호 연동',
    gold_balance BIGINT DEFAULT 0 COMMENT 'Gold 잔액 (Bank 동기화)',
    total_deposit BIGINT DEFAULT 0 COMMENT '총 입금액',
    total_withdrawal BIGINT DEFAULT 0 COMMENT '총 출금액',
    questionnaire_completed BOOLEAN DEFAULT FALSE COMMENT '설문조사 완료 여부',
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_username (minecraft_username),
    INDEX idx_uuid (minecraft_uuid),
    INDEX idx_bank_account (bank_account_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 코인 보유 현황
CREATE TABLE user_coin_balances (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    coin_id CHAR(36) NOT NULL,
    available_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '사용 가능한 수량',
    locked_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '주문 중 잠금 수량',
    total_amount DECIMAL(20, 8) AS (available_amount + locked_amount) STORED,
    average_buy_price DECIMAL(20, 8) DEFAULT 0 COMMENT '평균 매수가',
    total_profit_loss DECIMAL(20, 2) DEFAULT 0 COMMENT '총 손익',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    UNIQUE KEY uk_wallet_coin (wallet_id, coin_id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_coin (coin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 주문 테이블 (매수/매도)
CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    coin_id CHAR(36) NOT NULL,
    order_type ENUM('BUY', 'SELL') NOT NULL,
    order_method ENUM('MARKET', 'LIMIT') NOT NULL COMMENT '시장가/지정가',
    price DECIMAL(20, 8) NULL COMMENT '지정가 (LIMIT만)',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '주문 수량',
    filled_quantity DECIMAL(20, 8) DEFAULT 0 COMMENT '체결된 수량',
    remaining_quantity DECIMAL(20, 8) AS (quantity - filled_quantity) STORED,
    total_amount DECIMAL(20, 2) AS (quantity * price) STORED COMMENT '총 금액',
    fee DECIMAL(20, 2) DEFAULT 0 COMMENT '수수료',
    status ENUM('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
    is_admin_order BOOLEAN DEFAULT FALSE COMMENT 'ADMIN 주문 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT '주문 만료 시간',
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    INDEX idx_coin_type (coin_id, order_type, status),
    INDEX idx_wallet (wallet_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 거래 체결 내역
CREATE TABLE trades (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coin_id CHAR(36) NOT NULL,
    buy_order_id CHAR(36) NOT NULL,
    sell_order_id CHAR(36) NOT NULL,
    buyer_wallet_id CHAR(36) NOT NULL,
    seller_wallet_id CHAR(36) NOT NULL,
    price DECIMAL(20, 8) NOT NULL COMMENT '체결 가격',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '체결 수량',
    total_amount DECIMAL(20, 2) AS (price * quantity) STORED,
    buy_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '매수 수수료 (5%)',
    sell_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '매도 수수료 (5%)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    FOREIGN KEY (buy_order_id) REFERENCES orders(id),
    FOREIGN KEY (sell_order_id) REFERENCES orders(id),
    FOREIGN KEY (buyer_wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (seller_wallet_id) REFERENCES user_wallets(id),
    INDEX idx_coin_created (coin_id, created_at),
    INDEX idx_buyer (buyer_wallet_id),
    INDEX idx_seller (seller_wallet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 블록체인 블록 테이블
CREATE TABLE blockchain_blocks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    block_number BIGINT UNIQUE NOT NULL AUTO_INCREMENT,
    previous_hash VARCHAR(64) NOT NULL COMMENT '이전 블록 해시',
    current_hash VARCHAR(64) UNIQUE NOT NULL COMMENT '현재 블록 해시',
    merkle_root VARCHAR(64) NOT NULL COMMENT '거래 머클 트리 루트',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nonce BIGINT DEFAULT 0 COMMENT '채굴 nonce',
    difficulty INT DEFAULT 4 COMMENT '채굴 난이도',
    miner_address VARCHAR(42) NULL COMMENT '채굴자 지갑 주소',
    reward BIGINT DEFAULT 0 COMMENT '채굴 보상',
    transaction_count INT DEFAULT 0 COMMENT '블록 내 거래 수',
    INDEX idx_block_number (block_number),
    INDEX idx_timestamp (timestamp),
    INDEX idx_miner (miner_address),
    UNIQUE INDEX idx_block (block_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 블록체인 거래 내역
CREATE TABLE blockchain_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    block_id CHAR(36) NULL COMMENT '포함된 블록 ID',
    tx_hash VARCHAR(64) UNIQUE NOT NULL COMMENT '거래 해시',
    from_address VARCHAR(42) NOT NULL COMMENT '송신 지갑',
    to_address VARCHAR(42) NOT NULL COMMENT '수신 지갑',
    amount DECIMAL(20, 8) NOT NULL COMMENT '금액',
    fee DECIMAL(20, 8) NOT NULL COMMENT '수수료',
    tx_type ENUM('TRANSFER', 'TRADE', 'DEPOSIT', 'WITHDRAWAL', 'MINING_REWARD') NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'FAILED') DEFAULT 'PENDING',
    reference_id CHAR(36) NULL COMMENT '원본 거래 ID (trades, transfers 등)',
    gas_price BIGINT DEFAULT 0,
    gas_used BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (block_id) REFERENCES blockchain_blocks(id),
    INDEX idx_block (block_id),
    INDEX idx_from (from_address),
    INDEX idx_to (to_address),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 수수료 설정 테이블
CREATE TABLE fee_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fee_type ENUM('TRADING', 'WITHDRAWAL', 'TRANSFER') NOT NULL UNIQUE,
    fee_percentage DECIMAL(5, 2) NOT NULL COMMENT '수수료율 (%)',
    min_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '최소 수수료',
    max_fee DECIMAL(20, 2) NULL COMMENT '최대 수수료',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (fee_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 수수료 설정
INSERT INTO fee_settings (fee_type, fee_percentage, min_fee, max_fee) VALUES
('TRADING', 5.00, 100, NULL),      -- 거래 수수료 5%
('WITHDRAWAL', 5.00, 500, NULL),   -- 출금 수수료 5%
('TRANSFER', 0.00, 0, NULL);       -- 내부 이체 수수료 0%

-- 캔들스틱 데이터 (1분봉)
CREATE TABLE candles_1m (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coin_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0 COMMENT '거래량',
    trade_count INT DEFAULT 0 COMMENT '거래 건수',
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    UNIQUE KEY uk_coin_time (coin_id, open_time),
    INDEX idx_coin_time (coin_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 캔들스틱 데이터 (1시간봉)
CREATE TABLE candles_1h (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coin_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0,
    trade_count INT DEFAULT 0,
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    UNIQUE KEY uk_coin_time (coin_id, open_time),
    INDEX idx_coin_time (coin_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 캔들스틱 데이터 (1일봉)
CREATE TABLE candles_1d (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coin_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 8) NOT NULL,
    high_price DECIMAL(20, 8) NOT NULL,
    low_price DECIMAL(20, 8) NOT NULL,
    close_price DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0,
    trade_count INT DEFAULT 0,
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    UNIQUE KEY uk_coin_time (coin_id, open_time),
    INDEX idx_coin_time (coin_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank 입출금 내역
CREATE TABLE bank_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL') NOT NULL,
    amount BIGINT NOT NULL,
    bank_transaction_id CHAR(36) NULL COMMENT 'Bank 시스템 거래 ID',
    status ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_type (transaction_type),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI 거래 로그
CREATE TABLE ai_trade_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    coin_id CHAR(36) NOT NULL,
    action ENUM('BUY', 'SELL', 'ADJUST_PRICE') NOT NULL,
    price_before DECIMAL(20, 8) NOT NULL,
    price_after DECIMAL(20, 8) NOT NULL,
    quantity DECIMAL(20, 8) NULL,
    reason VARCHAR(255) NULL COMMENT '조정 이유',
    volatility_factor DECIMAL(5, 4) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    INDEX idx_coin (coin_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 시스템 로그
CREATE TABLE system_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    admin_id CHAR(36) NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id CHAR(36) NULL,
    details TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id),
    INDEX idx_admin (admin_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 관리자 계정 생성
INSERT INTO admins (username, password, role) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'SUPER_ADMIN');

-- 샘플 코인 데이터
INSERT INTO coins (symbol, name, logo_url, initial_supply, circulating_supply, initial_price, current_price, description) VALUES
('LCO', 'Lico Coin', '/images/coins/lico.png', 1000000000, 100000000, 100.00000000, 100.00000000, 'Lico 거래소의 기본 코인'),
('BTG', 'Bitcoin Gold', '/images/coins/btg.png', 21000000, 5000000, 50000.00000000, 50000.00000000, '골드 기반 비트코인');
