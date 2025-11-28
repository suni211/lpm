-- coins 테이블에 is_stable_coin 컬럼 추가
USE lico_db;

-- 1. is_stable_coin 컬럼 추가
ALTER TABLE coins ADD COLUMN IF NOT EXISTS is_stable_coin BOOLEAN DEFAULT FALSE;

-- 2. 확인
DESCRIBE coins;

SELECT '✅ is_stable_coin 컬럼이 추가되었습니다!' as status;
