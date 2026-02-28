-- 밈 코인 발행 신청 테이블
CREATE TABLE IF NOT EXISTS meme_coin_applications (
  id CHAR(36) PRIMARY KEY,
  applicant_wallet_id CHAR(36) NOT NULL,

  -- 코인 기본 정보
  coin_name VARCHAR(100) NOT NULL,
  coin_symbol VARCHAR(10) NOT NULL,
  coin_description TEXT,
  image_url VARCHAR(500),

  -- 발행 설정
  initial_supply DECIMAL(30, 8) NOT NULL, -- 초기 발행량
  can_creator_trade BOOLEAN NOT NULL, -- 생성자가 바로 거래 가능한가?
  trading_lock_days INT DEFAULT 0, -- 거래 잠금 일수 (아니요 선택 시 7일)
  is_supply_limited BOOLEAN NOT NULL, -- 발행 제한 여부
  creator_initial_holding_ecc DECIMAL(20, 8) NOT NULL DEFAULT 0, -- 제작자 초기 보유량 구매에 사용할 ECC (최대 4000)
  blacklisted_addresses TEXT, -- 블랙리스트 지갑 주소 (쉼표로 구분)

  -- 가격 계산 (ECC 기준)
  initial_capital_ecc DECIMAL(20, 8) NOT NULL DEFAULT 4000.00, -- 초기 자본 (ECC)
  listing_fee_ecc DECIMAL(20, 8) NOT NULL, -- 발행 수수료 12.5% (500 ECC)
  calculated_price DECIMAL(20, 8) NOT NULL, -- 계산된 초기 가격 (ECC 기준)

  -- 신청 상태
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  admin_comment TEXT, -- 관리자 코멘트
  reviewed_by CHAR(36), -- 검토한 관리자 wallet_id
  reviewed_at TIMESTAMP NULL,

  -- 생성된 코인 ID (승인 후)
  created_coin_id CHAR(36),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (applicant_wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES wallets(id) ON DELETE SET NULL,
  FOREIGN KEY (created_coin_id) REFERENCES coins(id) ON DELETE SET NULL
);

-- 인덱스 추가
CREATE INDEX idx_meme_applications_status ON meme_coin_applications(status);
CREATE INDEX idx_meme_applications_applicant ON meme_coin_applications(applicant_wallet_id);
CREATE INDEX idx_meme_applications_created_at ON meme_coin_applications(created_at DESC);
