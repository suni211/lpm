-- 24시간 최고가/최저가 컬럼 추가
USE lico_db;

-- 기존 컬럼이 있다면 삭제 (클린업)
ALTER TABLE coins
DROP COLUMN IF EXISTS high_24h_updated_at,
DROP COLUMN IF EXISTS low_24h_updated_at;

-- coins 테이블에 컬럼 추가 (없을 경우에만)
ALTER TABLE coins
ADD COLUMN IF NOT EXISTS high_24h DECIMAL(20, 8) DEFAULT NULL COMMENT '24시간 최고가',
ADD COLUMN IF NOT EXISTS low_24h DECIMAL(20, 8) DEFAULT NULL COMMENT '24시간 최저가';

-- 현재 가격으로 초기화
UPDATE coins
SET high_24h = current_price,
    low_24h = current_price
WHERE status = 'ACTIVE';

SELECT '✅ 24시간 최고가/최저가 컬럼 추가 완료!' as status;
