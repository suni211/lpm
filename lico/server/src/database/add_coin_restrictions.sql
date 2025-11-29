-- 코인 제한 컬럼 추가

ALTER TABLE coins
ADD COLUMN IF NOT EXISTS creator_wallet_id CHAR(36) NULL COMMENT '코인 생성자 지갑 ID',
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE COMMENT '블랙리스트 여부 (거래 불가)',
ADD COLUMN IF NOT EXISTS creator_can_trade BOOLEAN DEFAULT TRUE COMMENT '제작자 거래 가능 여부',
ADD COLUMN IF NOT EXISTS is_supply_limited BOOLEAN DEFAULT FALSE COMMENT '발행 제한 여부 (추가 발행 불가)';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_blacklisted ON coins(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_creator_wallet ON coins(creator_wallet_id);

-- 외래키 추가 (creator_wallet_id)
ALTER TABLE coins
ADD CONSTRAINT fk_creator_wallet
FOREIGN KEY (creator_wallet_id) REFERENCES user_wallets(id)
ON DELETE SET NULL;
