-- users 테이블에 is_admin 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 어드민 권한 부여 (실제 이메일로 교체 필요)
-- UPDATE users SET is_admin = TRUE WHERE email = 'your-email@gmail.com';
