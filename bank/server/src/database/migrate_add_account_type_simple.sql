-- accounts 테이블에 account_type 컬럼 추가 (간단 버전)
USE bank_db;

-- account_type 컬럼 추가
ALTER TABLE accounts 
ADD COLUMN account_type ENUM('BASIC', 'STOCK') DEFAULT 'BASIC' COMMENT '계좌 유형' AFTER account_number;

