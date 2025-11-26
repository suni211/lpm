-- Minecraft Bank Database Schema

CREATE DATABASE IF NOT EXISTS minecraft_bank CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE minecraft_bank;

-- 관리자 계정 테이블
CREATE TABLE admins (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('SUPER_ADMIN', 'ADMIN', 'TELLER') DEFAULT 'TELLER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자 계정 테이블 (마인크래프트 닉네임 기반 회원가입, 인증 코드 로그인)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    auth_code VARCHAR(255) UNIQUE NOT NULL COMMENT 'bcrypt 해시된 32자 인증 코드 (로그인용)',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '복구용 아이디',
    password VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시된 복구용 비밀번호',
    email VARCHAR(255) UNIQUE NOT NULL,
    minecraft_username VARCHAR(16) UNIQUE NOT NULL,
    minecraft_uuid VARCHAR(36) UNIQUE NOT NULL,
    security_question_1 VARCHAR(255) NOT NULL COMMENT '보안질문1: 학교',
    security_answer_1 VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시된 답변1',
    security_question_2 VARCHAR(255) NOT NULL COMMENT '보안질문2: 좋아하는 동물',
    security_answer_2 VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시된 답변2',
    security_question_3 VARCHAR(255) NOT NULL COMMENT '보안질문3: 좋아하는 선수',
    security_answer_3 VARCHAR(255) NOT NULL COMMENT 'bcrypt 해시된 답변3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_minecraft_username (minecraft_username),
    INDEX idx_minecraft_uuid (minecraft_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 고객 계좌 테이블 (사용자와 연결)
CREATE TABLE accounts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) UNIQUE NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL COMMENT '계좌번호 (예: 1234-5678-9012-3456)',
    balance BIGINT DEFAULT 0,
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_id (user_id),
    INDEX idx_account_number (account_number),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 입금 신청 테이블
CREATE TABLE deposit_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    account_id CHAR(36) NOT NULL,
    amount BIGINT NOT NULL,
    product_type ENUM('TRADING', 'SAVINGS') NOT NULL COMMENT '거래용/예치용',
    scheduled_date DATETIME NOT NULL COMMENT '입금 예정 날짜와 시간',
    contract_expiry DATETIME NULL COMMENT '계약 만료 시간 (예치용만)',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'COMPLETED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by CHAR(36) NULL COMMENT 'admin_id',
    notes TEXT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (processed_by) REFERENCES admins(id),
    INDEX idx_account (account_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_date),
    INDEX idx_contract_expiry (contract_expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 출금 신청 테이블
CREATE TABLE withdrawal_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    account_id CHAR(36) NOT NULL,
    amount BIGINT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by CHAR(36) NULL COMMENT 'admin_id',
    notes TEXT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (processed_by) REFERENCES admins(id),
    INDEX idx_account (account_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 이체 신청 테이블
CREATE TABLE transfer_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    from_account_id CHAR(36) NOT NULL,
    to_account_id CHAR(36) NOT NULL,
    amount BIGINT NOT NULL,
    fee BIGINT DEFAULT 0 COMMENT '수수료 (현재 0%)',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by CHAR(36) NULL COMMENT 'admin_id',
    notes TEXT NULL,
    FOREIGN KEY (from_account_id) REFERENCES accounts(id),
    FOREIGN KEY (to_account_id) REFERENCES accounts(id),
    FOREIGN KEY (processed_by) REFERENCES admins(id),
    INDEX idx_from_account (from_account_id),
    INDEX idx_to_account (to_account_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 거래 장부 (모든 완료된 거래 기록)
CREATE TABLE transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    transaction_type ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_OUT', 'TRANSFER_IN') NOT NULL,
    account_id CHAR(36) NOT NULL,
    related_account_id CHAR(36) NULL COMMENT '이체 시 상대방 계좌',
    amount BIGINT NOT NULL,
    balance_before BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    reference_id CHAR(36) NULL COMMENT '원본 요청 ID',
    reference_type ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER') NULL,
    processed_by CHAR(36) NULL COMMENT 'admin_id',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (related_account_id) REFERENCES accounts(id),
    FOREIGN KEY (processed_by) REFERENCES admins(id),
    INDEX idx_account (account_id),
    INDEX idx_type (transaction_type),
    INDEX idx_created (created_at),
    INDEX idx_reference (reference_id, reference_type)
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

-- 기본 관리자 계정 생성 (비밀번호: admin123)
INSERT INTO admins (username, password, role) VALUES
('admin', '$2b$10$YourHashedPasswordHere', 'SUPER_ADMIN');
