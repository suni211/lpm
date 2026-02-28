-- 지갑 복구 단어 시스템 및 안내 표시 플래그 마이그레이션 (통합)
USE lico_db;

-- 1. wallet_address 길이 변경 (42 -> 32, 0x 제거)
ALTER TABLE user_wallets MODIFY COLUMN wallet_address VARCHAR(32) UNIQUE NOT NULL COMMENT '지갑 주소 (32자리)';

-- 2. 복구 단어 해시 추가
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS recovery_words_hash VARCHAR(64) NULL COMMENT '복구 단어 해시 (SHA256)';

-- 3. 지갑 주소 표시 여부 추가
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS address_shown BOOLEAN DEFAULT FALSE COMMENT '지갑 주소 표시 여부 (한 번만 표시)';

-- 4. 지갑 안내 표시 여부 추가
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS wallet_info_shown BOOLEAN DEFAULT FALSE COMMENT '지갑 생성 안내 표시 여부 (1회만 표시)';

-- 5. 인덱스 추가
ALTER TABLE user_wallets ADD INDEX IF NOT EXISTS idx_recovery_hash (recovery_words_hash);

-- 확인 쿼리
SELECT 
    '마이그레이션 완료' AS status,
    COUNT(*) AS total_wallets,
    COUNT(recovery_words_hash) AS wallets_with_recovery_words,
    COUNT(CASE WHEN address_shown = TRUE THEN 1 END) AS wallets_address_shown,
    COUNT(CASE WHEN wallet_info_shown = TRUE THEN 1 END) AS wallets_info_shown
FROM user_wallets;

