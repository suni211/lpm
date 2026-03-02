-- 가격 정밀도 변경: DECIMAL(20,2) → DECIMAL(20,3)
-- 소수점 3자리까지 가격 움직임 허용

-- stocks 테이블
ALTER TABLE stocks MODIFY initial_price DECIMAL(20,3) NOT NULL;
ALTER TABLE stocks MODIFY current_price DECIMAL(20,3) NOT NULL;
ALTER TABLE stocks MODIFY price_change_24h DECIMAL(10,3) DEFAULT 0;

-- orders 테이블
ALTER TABLE orders MODIFY fee DECIMAL(20,3) DEFAULT 0;
ALTER TABLE orders MODIFY stop_price DECIMAL(20,3) NULL;
ALTER TABLE orders MODIFY trailing_percent DECIMAL(10,3) NULL;
ALTER TABLE orders MODIFY trailing_price DECIMAL(20,3) NULL;

-- trades 테이블
ALTER TABLE trades MODIFY buy_fee DECIMAL(20,3) DEFAULT 0;
ALTER TABLE trades MODIFY sell_fee DECIMAL(20,3) DEFAULT 0;

-- candles_1m
ALTER TABLE candles_1m MODIFY open_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1m MODIFY high_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1m MODIFY low_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1m MODIFY close_price DECIMAL(20,3) NOT NULL;

-- candles_1h
ALTER TABLE candles_1h MODIFY open_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1h MODIFY high_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1h MODIFY low_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1h MODIFY close_price DECIMAL(20,3) NOT NULL;

-- candles_1d
ALTER TABLE candles_1d MODIFY open_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1d MODIFY high_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1d MODIFY low_price DECIMAL(20,3) NOT NULL;
ALTER TABLE candles_1d MODIFY close_price DECIMAL(20,3) NOT NULL;

-- ck_index
ALTER TABLE ck_index MODIFY index_value DECIMAL(20,3) NOT NULL;

SELECT 'Price precision migration complete: DECIMAL(20,2) → DECIMAL(20,3)' AS status;
