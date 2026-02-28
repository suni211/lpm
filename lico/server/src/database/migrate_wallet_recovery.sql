-- 지갑 복구 단어 시스템 마이그레이션
USE lico_db;

-- wallet_address 길이 변경 (42 -> 32, 0x 제거)
ALTER TABLE user_wallets MODIFY COLUMN wallet_address VARCHAR(32) UNIQUE NOT NULL COMMENT '지갑 주소 (32자리)';

-- 복구 단어 해시 추가
ALTER TABLE user_wallets ADD COLUMN recovery_words_hash VARCHAR(64) NULL COMMENT '복구 단어 해시 (SHA256)';

-- 지갑 주소 표시 여부 추가
ALTER TABLE user_wallets ADD COLUMN address_shown BOOLEAN DEFAULT FALSE COMMENT '지갑 주소 표시 여부 (한 번만 표시)';

-- 인덱스 추가
ALTER TABLE user_wallets ADD INDEX idx_recovery_hash (recovery_words_hash);

