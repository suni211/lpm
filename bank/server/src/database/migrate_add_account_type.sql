-- accounts 테이블에 account_type 컬럼 추가 마이그레이션
USE bank_db;

-- account_type 컬럼이 이미 있는지 확인하고 없으면 추가
-- MariaDB는 IF NOT EXISTS를 지원하지 않으므로 직접 확인
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'bank_db' 
    AND TABLE_NAME = 'accounts' 
    AND COLUMN_NAME = 'account_type'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE accounts ADD COLUMN account_type ENUM(''BASIC'', ''STOCK'') DEFAULT ''BASIC'' COMMENT ''계좌 유형'' AFTER account_number',
    'SELECT ''Column account_type already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

