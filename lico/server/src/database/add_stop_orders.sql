-- 스탑/손절 주문 테이블 추가

-- 1. orders 테이블에 스탑 관련 컬럼 추가
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stop_price DECIMAL(20, 8) NULL COMMENT '스탑 가격 (이 가격 도달 시 주문 활성화)',
ADD COLUMN IF NOT EXISTS stop_type ENUM('STOP_LOSS', 'TAKE_PROFIT', 'TRAILING_STOP') NULL COMMENT '스탑 주문 타입',
ADD COLUMN IF NOT EXISTS is_stop_order BOOLEAN DEFAULT FALSE COMMENT '스탑 주문 여부',
ADD COLUMN IF NOT EXISTS stop_triggered BOOLEAN DEFAULT FALSE COMMENT '스탑 트리거 여부',
ADD COLUMN IF NOT EXISTS trailing_percent DECIMAL(5, 2) NULL COMMENT '트레일링 스탑 비율 (%)',
ADD COLUMN IF NOT EXISTS trailing_price DECIMAL(20, 8) NULL COMMENT '트레일링 스탑 추적 가격';

-- 2. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_stop_orders ON orders(is_stop_order, stop_triggered, status);
CREATE INDEX IF NOT EXISTS idx_stop_price ON orders(coin_id, stop_price, is_stop_order);

-- 3. 스탑 주문 로그 테이블
CREATE TABLE IF NOT EXISTS stop_order_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    coin_id CHAR(36) NOT NULL,
    trigger_price DECIMAL(20, 8) NOT NULL COMMENT '트리거된 가격',
    stop_price DECIMAL(20, 8) NOT NULL COMMENT '설정된 스탑 가격',
    stop_type ENUM('STOP_LOSS', 'TAKE_PROFIT', 'TRAILING_STOP') NOT NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    INDEX idx_order (order_id),
    INDEX idx_triggered_at (triggered_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 포지션 관리 테이블 (손익 추적)
CREATE TABLE IF NOT EXISTS positions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    wallet_id CHAR(36) NOT NULL,
    coin_id CHAR(36) NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL COMMENT '진입 평균가',
    quantity DECIMAL(20, 8) NOT NULL COMMENT '보유 수량',
    current_value DECIMAL(20, 8) DEFAULT 0 COMMENT '현재 평가금액',
    profit_loss DECIMAL(20, 8) DEFAULT 0 COMMENT '손익',
    profit_loss_percent DECIMAL(10, 2) DEFAULT 0 COMMENT '손익률 (%)',
    stop_loss_price DECIMAL(20, 8) NULL COMMENT '손절 가격',
    take_profit_price DECIMAL(20, 8) NULL COMMENT '익절 가격',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id),
    FOREIGN KEY (coin_id) REFERENCES coins(id),
    UNIQUE KEY uk_wallet_coin_active (wallet_id, coin_id, is_active),
    INDEX idx_wallet (wallet_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
