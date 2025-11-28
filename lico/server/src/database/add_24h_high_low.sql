-- 24시간 최고가/최저가 컬럼 추가
USE lico_db;

-- coins 테이블에 컬럼 추가
ALTER TABLE coins
ADD COLUMN high_24h DECIMAL(20, 8) DEFAULT NULL COMMENT '24시간 최고가',
ADD COLUMN low_24h DECIMAL(20, 8) DEFAULT NULL COMMENT '24시간 최저가',
ADD COLUMN high_24h_updated_at TIMESTAMP NULL COMMENT '최고가 갱신 시각',
ADD COLUMN low_24h_updated_at TIMESTAMP NULL COMMENT '최저가 갱신 시각';

-- 현재 가격으로 초기화
UPDATE coins
SET high_24h = current_price,
    low_24h = current_price,
    high_24h_updated_at = NOW(),
    low_24h_updated_at = NOW()
WHERE status = 'ACTIVE';

SELECT '✅ 24시간 최고가/최저가 컬럼 추가 완료!' as status;
