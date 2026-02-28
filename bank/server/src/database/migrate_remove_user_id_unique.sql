-- user_id UNIQUE 제약조건 제거 마이그레이션
-- 한 사용자가 여러 계좌(기본계좌, 주식계좌)를 가질 수 있도록 수정

USE bank_db;

-- user_id의 UNIQUE 제약조건 제거
ALTER TABLE accounts DROP INDEX user_id;

-- user_id에 일반 인덱스만 유지 (UNIQUE 제거)
ALTER TABLE accounts ADD INDEX idx_user_id (user_id);

