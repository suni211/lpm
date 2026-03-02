-- 파생상품 테이블 생성 (선물, 옵션, 스왑)

-- 선물 포지션
CREATE TABLE IF NOT EXISTS futures_positions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  wallet_id CHAR(36) NOT NULL,
  stock_id CHAR(36) NOT NULL,
  position_type ENUM('LONG','SHORT') NOT NULL,
  leverage INT NOT NULL DEFAULT 1,
  entry_price DECIMAL(20,3) NOT NULL,
  quantity DECIMAL(20,8) NOT NULL,
  margin_amount DECIMAL(20,3) NOT NULL,
  liquidation_price DECIMAL(20,3) NOT NULL,
  realized_pnl DECIMAL(20,3) DEFAULT 0,
  status ENUM('OPEN','CLOSED','LIQUIDATED') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  INDEX idx_wallet_status (wallet_id, status),
  INDEX idx_stock (stock_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 옵션 계약
CREATE TABLE IF NOT EXISTS options_contracts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  stock_id CHAR(36) NOT NULL,
  option_type ENUM('CALL','PUT') NOT NULL,
  strike_price DECIMAL(20,3) NOT NULL,
  premium DECIMAL(20,3) NOT NULL,
  expiry_date TIMESTAMP NOT NULL,
  total_supply INT NOT NULL DEFAULT 100,
  remaining_supply INT NOT NULL DEFAULT 100,
  status ENUM('ACTIVE','EXPIRED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (stock_id) REFERENCES stocks(id),
  INDEX idx_stock_status (stock_id, status),
  INDEX idx_expiry (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 옵션 보유
CREATE TABLE IF NOT EXISTS options_holdings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  wallet_id CHAR(36) NOT NULL,
  contract_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  purchase_price DECIMAL(20,3) NOT NULL,
  status ENUM('HOLDING','EXERCISED','EXPIRED') DEFAULT 'HOLDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exercised_at TIMESTAMP NULL,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
  FOREIGN KEY (contract_id) REFERENCES options_contracts(id),
  INDEX idx_wallet_status (wallet_id, status),
  INDEX idx_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스왑 거래 기록
CREATE TABLE IF NOT EXISTS swap_transactions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  wallet_id CHAR(36) NOT NULL,
  from_stock_id CHAR(36) NOT NULL,
  to_stock_id CHAR(36) NOT NULL,
  from_quantity DECIMAL(20,8) NOT NULL,
  to_quantity DECIMAL(20,8) NOT NULL,
  exchange_rate DECIMAL(20,8) NOT NULL,
  fee DECIMAL(20,3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
  FOREIGN KEY (from_stock_id) REFERENCES stocks(id),
  FOREIGN KEY (to_stock_id) REFERENCES stocks(id),
  INDEX idx_wallet (wallet_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Derivatives tables created successfully' AS status;
