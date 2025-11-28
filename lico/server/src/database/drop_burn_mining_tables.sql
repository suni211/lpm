-- 소각 및 채굴 시스템 테이블 제거
USE lico_db;

-- 소각 시스템 테이블 삭제
DROP TABLE IF EXISTS coin_burn_logs;

-- 채굴 시스템 테이블 삭제
DROP TABLE IF EXISTS mining_pool_shares;
DROP TABLE IF EXISTS mining_difficulty_history;
DROP TABLE IF EXISTS mining_logs;
DROP TABLE IF EXISTS mining_configs;

SELECT '✅ 소각 및 채굴 시스템 테이블 제거 완료!' as status;
