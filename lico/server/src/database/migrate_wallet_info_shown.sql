-- 지갑 안내 표시 여부 플래그 추가
USE lico_db;

-- user_wallets 테이블에 wallet_info_shown 컬럼 추가
ALTER TABLE user_wallets 
ADD COLUMN wallet_info_shown BOOLEAN DEFAULT FALSE COMMENT '지갑 생성 안내 표시 여부 (1회만 표시)';

-- 기존 사용자는 이미 안내를 본 것으로 간주 (선택사항)
-- UPDATE user_wallets SET wallet_info_shown = TRUE WHERE created_at < NOW();

