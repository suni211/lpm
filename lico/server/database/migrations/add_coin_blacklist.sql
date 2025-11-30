-- coins 테이블에 블랙리스트 컬럼 추가
ALTER TABLE coins ADD COLUMN IF NOT EXISTS blacklisted_addresses TEXT COMMENT '블랙리스트 지갑 주소 (쉼표로 구분)';
