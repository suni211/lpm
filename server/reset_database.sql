-- 데이터베이스 완전 초기화 스크립트
-- 주의: 모든 데이터가 삭제됩니다!

DROP DATABASE IF EXISTS lpm;
CREATE DATABASE lpm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT '✅ 데이터베이스 초기화 완료! 이제 setup_database.sql을 실행하세요.' AS Status;
