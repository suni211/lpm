-- 비트맵에 effects_data 컬럼 추가
USE rhythm_db;

ALTER TABLE beatmaps
ADD COLUMN effects_data JSON NULL COMMENT '게임 효과 데이터 (굴절, 암전 등)';
