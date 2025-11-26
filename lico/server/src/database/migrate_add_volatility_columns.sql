-- 각 코인별 AI 변동성 설정 컬럼 추가
USE lico_db;

ALTER TABLE coins 
ADD COLUMN min_volatility DECIMAL(5, 4) DEFAULT 0.0001 COMMENT '최소 변동성 (0.01%)',
ADD COLUMN max_volatility DECIMAL(5, 4) DEFAULT 0.05 COMMENT '최대 변동성 (5%)';

-- 기존 코인들의 기본값 설정
UPDATE coins SET min_volatility = 0.0001, max_volatility = 0.05 WHERE min_volatility IS NULL OR max_volatility IS NULL;

