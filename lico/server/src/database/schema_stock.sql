-- Lico Stock Exchange Database Schema

CREATE DATABASE IF NOT EXISTS lico_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lico_db;

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

-- 산업 분류 테이블
CREATE TABLE industries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL COMMENT '산업 이름 (IT, 금융, 제조 등)',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 산업 분류
INSERT INTO industries (name, description) VALUES
('IT/기술', 'IT 및 기술 관련 기업'),
('금융', '은행, 증권, 보험 등 금융업'),
('제조', '제조업 전반'),
('유통/소비재', '유통 및 소비재 산업'),
('헬스케어', '의료, 제약, 바이오'),
('에너지', '에너지 및 자원'),
('건설/부동산', '건설 및 부동산 개발'),
('엔터테인먼트', '게임, 미디어, 콘텐츠');

-- 그룹(계열사) 테이블
CREATE TABLE stock_groups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL COMMENT '그룹명 (삼성그룹, 현대그룹 등)',
    logo_url VARCHAR(255) NULL COMMENT '그룹 로고',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 그룹 데이터
INSERT INTO stock_groups (name, description) VALUES
('CK그룹', 'CK 계열 기업들'),
('리코그룹', 'Lico 계열 기업들'),
('플래닛그룹', 'Planet 계열 기업들');

-- 주식 정보 테이블 (기존 coins → stocks)
CREATE TABLE stocks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    symbol VARCHAR(10) UNIQUE NOT NULL COMMENT '주식 코드 (AAPL, TSLA)',
    name VARCHAR(100) NOT NULL COMMENT '기업명 (Apple Inc., Tesla)',
    logo_url VARCHAR(255) NULL COMMENT '기업 로고 이미지 URL',
    description TEXT NULL,
    industry_id CHAR(36) NULL COMMENT '산업 분류',
    group_id CHAR(36) NULL COMMENT '그룹(계열사)',
    founder_uuid VARCHAR(36) NOT NULL COMMENT '창업자 Minecraft UUID (매도 제한 적용)',
    initial_supply BIGINT NOT NULL COMMENT '초기 발행량',
    circulating_supply BIGINT NOT NULL COMMENT '현재 유통량',
    initial_price DECIMAL(20, 2) NOT NULL COMMENT '초기 가격 (Gold)',
    current_price DECIMAL(20, 2) NOT NULL COMMENT '현재 가격 (Gold)',
    price_change_24h DECIMAL(10, 2) DEFAULT 0 COMMENT '24시간 가격 변동률 (%)',
    volume_24h BIGINT DEFAULT 0 COMMENT '24시간 거래량',
    market_cap BIGINT AS (circulating_supply * current_price) STORED COMMENT '시가총액',
    min_volatility DECIMAL(10, 5) DEFAULT 0.00001 COMMENT 'AI 최소 변동성 (0.001%)',
    max_volatility DECIMAL(10, 5) DEFAULT 0.00999 COMMENT 'AI 최대 변동성 (0.999%)',
    status ENUM('ACTIVE', 'PAUSED', 'DELISTED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (industry_id) REFERENCES industries(id),
    FOREIGN KEY (group_id) REFERENCES stock_groups(id),
    INDEX idx_symbol (symbol),
    INDEX idx_status (status),
    INDEX idx_industry (industry_id),
    INDEX idx_group (group_id),
    INDEX idx_founder (founder_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CK 지수 테이블
CREATE TABLE ck_index (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    index_value DECIMAL(20, 2) NOT NULL COMMENT 'CK 지수 값',
    change_percent DECIMAL(10, 2) DEFAULT 0 COMMENT '전일 대비 변동률 (%)',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 CK 지수 값
INSERT INTO ck_index (index_value, change_percent) VALUES (1000.00, 0.00);

-- LICO 가입 설문조사 테이블
CREATE TABLE lico_questionnaires (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    minecraft_username VARCHAR(16) UNIQUE NOT NULL,
    question1_score INT NOT NULL COMMENT '계산적이며 자금 충분? 예(10) 아니요(0)',
    question2_score INT NOT NULL COMMENT '현실 주식 성과? 예(50) 보통(30) 아니요(0)',
    question3_score INT NOT NULL COMMENT '투자 책임 동의? 예(30) 아니요(0)',
    total_score INT AS (question1_score + question2_score + question3_score) STORED,
    is_approved BOOLEAN DEFAULT FALSE COMMENT '90점 이상 자동 승인',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (minecraft_username),
    INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 계좌 (Bank 연동)
CREATE TABLE user_wallets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_address VARCHAR(32) UNIQUE NOT NULL COMMENT '계좌 번호 (32자리)',
    minecraft_username VARCHAR(16) UNIQUE NOT NULL,
    minecraft_uuid VARCHAR(36) UNIQUE,
    bank_account_number VARCHAR(20) NULL COMMENT 'Bank 계좌번호 연동',
    gold_balance BIGINT DEFAULT 0 COMMENT 'Gold 잔액 (LICO 전용, Bank와 별도)',
    total_deposit BIGINT DEFAULT 0 COMMENT '총 입금액',
    total_withdrawal BIGINT DEFAULT 0 COMMENT '총 출금액',
    questionnaire_completed BOOLEAN DEFAULT FALSE COMMENT '설문조사 완료 여부',
    recovery_words_hash VARCHAR(64) NULL COMMENT '복구 단어 해시 (SHA256)',
    address_shown BOOLEAN DEFAULT FALSE COMMENT '계좌 번호 표시 여부 (한 번만 표시)',
    wallet_info_shown BOOLEAN DEFAULT FALSE COMMENT '계좌 생성 안내 표시 여부 (1회만 표시)',
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_username (minecraft_username),
    INDEX idx_uuid (minecraft_uuid),
    INDEX idx_bank_account (bank_account_number),
    INDEX idx_recovery_hash (recovery_words_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 주식 보유 현황 (기존 user_coin_balances → user_stock_balances)
CREATE TABLE user_stock_balances (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    stock_id CHAR(36) NOT NULL,
    available_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '사용 가능한 주식 수',
    locked_amount DECIMAL(20, 8) DEFAULT 0 COMMENT '주문 중 잠금 수량',
    total_amount DECIMAL(20, 8) AS (available_amount + locked_amount) STORED,
    average_buy_price DECIMAL(20, 2) DEFAULT 0 COMMENT '평균 매수가 (Gold)',
    total_profit_loss DECIMAL(20, 2) DEFAULT 0 COMMENT '총 손익 (Gold)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE KEY uk_wallet_stock (wallet_id, stock_id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_stock (stock_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 주문 테이블 (매수/매도)
CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    stock_id CHAR(36) NOT NULL,
    order_type ENUM('BUY', 'SELL') NOT NULL,
    order_method ENUM('MARKET', 'LIMIT') NOT NULL COMMENT '시장가/지정가',
    price DECIMAL(20, 2) NULL COMMENT '지정가 (LIMIT만, Gold)',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '주문 수량',
    filled_quantity DECIMAL(20, 8) DEFAULT 0 COMMENT '체결된 수량',
    remaining_quantity DECIMAL(20, 8) AS (quantity - filled_quantity) STORED,
    total_amount DECIMAL(20, 2) AS (quantity * price) STORED COMMENT '총 금액 (Gold)',
    fee DECIMAL(20, 2) DEFAULT 0 COMMENT '수수료 (Gold)',
    status ENUM('PENDING', 'PARTIAL', 'FILLED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
    is_admin_order BOOLEAN DEFAULT FALSE COMMENT 'ADMIN 주문 여부',
    is_ai_order BOOLEAN DEFAULT FALSE COMMENT 'AI 주문 여부 (뉴스 영향)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT '주문 만료 시간',
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    INDEX idx_stock_type (stock_id, order_type, status),
    INDEX idx_wallet (wallet_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 거래 체결 내역
CREATE TABLE trades (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stock_id CHAR(36) NOT NULL,
    buy_order_id CHAR(36) NULL COMMENT '매수 주문 ID (AI 봇 직접 거래 시 NULL)',
    sell_order_id CHAR(36) NULL COMMENT '매도 주문 ID (AI 봇 직접 거래 시 NULL)',
    buyer_wallet_id CHAR(36) NOT NULL,
    seller_wallet_id CHAR(36) NOT NULL,
    price DECIMAL(20, 2) NOT NULL COMMENT '체결 가격 (Gold)',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '체결 수량',
    total_amount DECIMAL(20, 2) AS (price * quantity) STORED,
    buy_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '매수 수수료 (5%, Gold)',
    sell_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '매도 수수료 (5%, Gold)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    FOREIGN KEY (buy_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (sell_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (buyer_wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (seller_wallet_id) REFERENCES user_wallets(id),
    INDEX idx_stock_created (stock_id, created_at),
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
    amount DECIMAL(20, 2) NOT NULL COMMENT '금액 (Gold)',
    fee DECIMAL(20, 2) NOT NULL COMMENT '수수료 (Gold)',
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
    min_fee DECIMAL(20, 2) DEFAULT 0 COMMENT '최소 수수료 (Gold)',
    max_fee DECIMAL(20, 2) NULL COMMENT '최대 수수료 (Gold)',
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
    stock_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 2) NOT NULL,
    high_price DECIMAL(20, 2) NOT NULL,
    low_price DECIMAL(20, 2) NOT NULL,
    close_price DECIMAL(20, 2) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0 COMMENT '거래량',
    trade_count INT DEFAULT 0 COMMENT '거래 건수',
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE KEY uk_stock_time (stock_id, open_time),
    INDEX idx_stock_time (stock_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 캔들스틱 데이터 (1시간봉)
CREATE TABLE candles_1h (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stock_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 2) NOT NULL,
    high_price DECIMAL(20, 2) NOT NULL,
    low_price DECIMAL(20, 2) NOT NULL,
    close_price DECIMAL(20, 2) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0,
    trade_count INT DEFAULT 0,
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE KEY uk_stock_time (stock_id, open_time),
    INDEX idx_stock_time (stock_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 캔들스틱 데이터 (1일봉)
CREATE TABLE candles_1d (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stock_id CHAR(36) NOT NULL,
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 2) NOT NULL,
    high_price DECIMAL(20, 2) NOT NULL,
    low_price DECIMAL(20, 2) NOT NULL,
    close_price DECIMAL(20, 2) NOT NULL,
    volume DECIMAL(20, 8) DEFAULT 0,
    trade_count INT DEFAULT 0,
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    UNIQUE KEY uk_stock_time (stock_id, open_time),
    INDEX idx_stock_time (stock_id, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bank 입출금 내역
CREATE TABLE bank_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL') NOT NULL,
    amount BIGINT NOT NULL COMMENT '금액 (Gold)',
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
    stock_id CHAR(36) NOT NULL,
    action ENUM('BUY', 'SELL', 'ADJUST_PRICE') NOT NULL,
    price_before DECIMAL(20, 2) NOT NULL,
    price_after DECIMAL(20, 2) NOT NULL,
    quantity DECIMAL(20, 8) NULL,
    reason VARCHAR(255) NULL COMMENT '조정 이유',
    volatility_factor DECIMAL(5, 4) NULL,
    news_id CHAR(36) NULL COMMENT '뉴스 영향 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_id) REFERENCES stocks(id),
    INDEX idx_stock (stock_id),
    INDEX idx_created (created_at),
    INDEX idx_news (news_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 창업자 매도 요청 테이블 (창업자는 자사 주식 매도 시 관리자 승인 필요)
CREATE TABLE founder_sell_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    stock_id CHAR(36) NOT NULL COMMENT '매도 대상 주식',
    wallet_id CHAR(36) NOT NULL COMMENT '창업자 지갑 ID',
    founder_uuid VARCHAR(36) NOT NULL COMMENT '창업자 Minecraft UUID',
    order_method ENUM('MARKET', 'LIMIT') NOT NULL COMMENT '주문 방식',
    price DECIMAL(20, 2) NULL COMMENT '지정가 (LIMIT인 경우, Gold)',
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

-- 시스템 설정 테이블
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (config_key)
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

-- 뉴스 테이블 (영향력 시스템 추가)
CREATE TABLE news (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    admin_id CHAR(36) NOT NULL COMMENT '작성한 관리자 ID',
    title VARCHAR(200) NOT NULL COMMENT '뉴스 제목',
    content TEXT NOT NULL COMMENT '뉴스 내용',
    image_url VARCHAR(500) NULL COMMENT '뉴스 이미지 URL',

    -- 뉴스 영향력 설정
    impact_type ENUM('POSITIVE', 'NEGATIVE', 'NEUTRAL') DEFAULT 'NEUTRAL' COMMENT '영향 방향 (긍정/부정/중립)',
    impact_strength INT DEFAULT 0 COMMENT '영향력 강도 (0-100)',
    affected_group_id CHAR(36) NULL COMMENT '영향받는 그룹 (NULL이면 무시)',
    affected_industry_id CHAR(36) NULL COMMENT '영향받는 산업 (NULL이면 전체)',
    affected_stock_id CHAR(36) NULL COMMENT '영향받는 특정 주식 (NULL이면 산업/그룹 전체)',
    ai_trigger_enabled BOOLEAN DEFAULT TRUE COMMENT 'AI 자동 매매 트리거 활성화',
    ai_trigger_duration INT DEFAULT 60 COMMENT 'AI 매매 지속 시간 (분)',
    ai_trigger_started BOOLEAN DEFAULT FALSE COMMENT 'AI 트리거 시작 여부',
    ai_trigger_start_time TIMESTAMP NULL COMMENT 'AI 트리거 시작 시간',

    view_count INT DEFAULT 0 COMMENT '조회수',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '상단 고정 여부',
    status ENUM('DRAFT', 'PUBLISHED', 'HIDDEN') DEFAULT 'PUBLISHED' COMMENT '뉴스 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (admin_id) REFERENCES admins(id),
    FOREIGN KEY (affected_group_id) REFERENCES stock_groups(id),
    FOREIGN KEY (affected_industry_id) REFERENCES industries(id),
    FOREIGN KEY (affected_stock_id) REFERENCES stocks(id),
    INDEX idx_admin (admin_id),
    INDEX idx_status (status),
    INDEX idx_pinned (is_pinned),
    INDEX idx_created (created_at DESC),
    INDEX idx_impact (impact_type, impact_strength),
    INDEX idx_trigger (ai_trigger_enabled, ai_trigger_started),
    INDEX idx_affected (affected_group_id, affected_industry_id, affected_stock_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 뉴스 댓글 테이블
CREATE TABLE news_comments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    news_id CHAR(36) NOT NULL COMMENT '뉴스 ID',
    wallet_id CHAR(36) NOT NULL COMMENT '작성자 지갑 ID',
    content TEXT NOT NULL COMMENT '댓글 내용',
    parent_comment_id CHAR(36) NULL COMMENT '부모 댓글 ID (대댓글인 경우)',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (parent_comment_id) REFERENCES news_comments(id) ON DELETE CASCADE,
    INDEX idx_news (news_id),
    INDEX idx_wallet (wallet_id),
    INDEX idx_parent (parent_comment_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 관리자 계정 생성
INSERT INTO admins (username, password, role) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'SUPER_ADMIN');

-- 샘플 주식 데이터 (그룹 포함, founder_uuid는 실제 마인크래프트 UUID로 교체 필요)
INSERT INTO stocks (symbol, name, logo_url, industry_id, group_id, founder_uuid, initial_supply, circulating_supply, initial_price, current_price, description)
SELECT
    'LSE',
    'Lico Stock Exchange',
    '/images/stocks/lse.png',
    i.id,
    g.id,
    '00000000-0000-0000-0000-000000000001',
    1000000000,
    100000000,
    10000.00,
    10000.00,
    'Lico 거래소의 대표 주식'
FROM industries i, stock_groups g
WHERE i.name = 'IT/기술' AND g.name = '리코그룹'
LIMIT 1;

INSERT INTO stocks (symbol, name, logo_url, industry_id, group_id, founder_uuid, initial_supply, circulating_supply, initial_price, current_price, description)
SELECT
    'CKB',
    'CK Bank',
    '/images/stocks/ckb.png',
    i.id,
    g.id,
    '00000000-0000-0000-0000-000000000002',
    500000000,
    50000000,
    50000.00,
    50000.00,
    'CK 은행 주식'
FROM industries i, stock_groups g
WHERE i.name = '금융' AND g.name = 'CK그룹'
LIMIT 1;

INSERT INTO stocks (symbol, name, logo_url, industry_id, group_id, founder_uuid, initial_supply, circulating_supply, initial_price, current_price, description)
SELECT
    'LICT',
    'Lico Technology',
    '/images/stocks/lict.png',
    i.id,
    g.id,
    '00000000-0000-0000-0000-000000000001',
    300000000,
    30000000,
    15000.00,
    15000.00,
    'Lico 그룹 계열 기술 기업'
FROM industries i, stock_groups g
WHERE i.name = 'IT/기술' AND g.name = '리코그룹'
LIMIT 1;

INSERT INTO stocks (symbol, name, logo_url, industry_id, group_id, founder_uuid, initial_supply, circulating_supply, initial_price, current_price, description)
SELECT
    'CKCS',
    'CK Construction',
    '/images/stocks/ckcs.png',
    i.id,
    g.id,
    '00000000-0000-0000-0000-000000000002',
    200000000,
    20000000,
    25000.00,
    25000.00,
    'CK 그룹 계열 건설 기업'
FROM industries i, stock_groups g
WHERE i.name = '건설/부동산' AND g.name = 'CK그룹'
LIMIT 1;
