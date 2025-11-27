-- Admin 컬럼 추가 마이그레이션
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 기존 사용자 중 첫 번째 사용자를 admin으로 설정 (선택사항)
-- UPDATE users SET is_admin = TRUE WHERE id = 1 LIMIT 1;

