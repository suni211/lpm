-- 입금 로그 테이블 생성 (중복 입금 방지용)
CREATE TABLE IF NOT EXISTS deposit_logs (
    id CHAR(36) PRIMARY KEY,
    wallet_id CHAR(36) NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL COMMENT '입금 금액',
    transaction_id VARCHAR(255) UNIQUE NOT NULL COMMENT 'BANK 트랜잭션 ID (중복 방지)',
    bank_signature TEXT COMMENT 'BANK 서명 (선택)',
    status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_wallet_id (wallet_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='입금 로그 (중복 방지)';

-- 출금 로그 테이블 생성
CREATE TABLE IF NOT EXISTS withdrawal_logs (
    id CHAR(36) PRIMARY KEY,
    wallet_id CHAR(36) NOT NULL,
    wallet_address VARCHAR(64) NOT NULL,
    amount BIGINT NOT NULL COMMENT '출금 금액',
    fee BIGINT NOT NULL COMMENT '출금 수수료 (5%)',
    total_deduction BIGINT NOT NULL COMMENT '총 차감액',
    transaction_id VARCHAR(255) UNIQUE COMMENT 'BANK 트랜잭션 ID',
    status ENUM('PENDING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
    INDEX idx_wallet_id (wallet_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출금 로그';
