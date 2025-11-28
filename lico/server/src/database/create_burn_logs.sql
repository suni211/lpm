-- 코인 소각 내역 추적 테이블
USE lico_db;

-- 기존 테이블이 있으면 삭제 (주의: 데이터 손실!)
DROP TABLE IF EXISTS coin_burn_logs;

CREATE TABLE coin_burn_logs (
  id VARCHAR(36) PRIMARY KEY,
  coin_id VARCHAR(36) NOT NULL,
  burn_type ENUM('FEE_BURN', 'AI_BOT_BURN', 'MANUAL_BURN') NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  trade_id VARCHAR(36) NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_coin_id (coin_id),
  INDEX idx_trade_id (trade_id),
  INDEX idx_burn_type (burn_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 외래 키는 나중에 수동으로 추가 (선택사항)
-- ALTER TABLE coin_burn_logs ADD FOREIGN KEY (coin_id) REFERENCES coins(id);
-- ALTER TABLE coin_burn_logs ADD FOREIGN KEY (trade_id) REFERENCES trades(id);

SELECT '✅ coin_burn_logs 테이블 생성 완료!' as status;
