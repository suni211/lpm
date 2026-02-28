-- trades 테이블의 buy_order_id, sell_order_id를 NULL 허용으로 변경
-- AI 봇과 직접 거래 시 주문이 없을 수 있음

USE lico_db;

-- 기존 외래 키 제약조건 제거 (제약조건 이름 확인 필요)
-- SHOW CREATE TABLE trades; 로 확인 후 수정

-- 방법 1: 제약조건 이름을 모를 경우
ALTER TABLE trades DROP FOREIGN KEY trades_ibfk_2;
ALTER TABLE trades DROP FOREIGN KEY trades_ibfk_3;

-- 방법 2: 제약조건 이름이 다른 경우를 대비
-- ALTER TABLE trades DROP FOREIGN KEY IF EXISTS trades_ibfk_2;
-- ALTER TABLE trades DROP FOREIGN KEY IF EXISTS trades_ibfk_3;

-- 컬럼을 NULL 허용으로 변경
ALTER TABLE trades MODIFY COLUMN buy_order_id CHAR(36) NULL;
ALTER TABLE trades MODIFY COLUMN sell_order_id CHAR(36) NULL;

-- 외래 키 제약조건 재추가 (NULL 허용)
ALTER TABLE trades 
  ADD CONSTRAINT fk_trades_buy_order 
  FOREIGN KEY (buy_order_id) REFERENCES orders(id) 
  ON DELETE SET NULL;

ALTER TABLE trades 
  ADD CONSTRAINT fk_trades_sell_order 
  FOREIGN KEY (sell_order_id) REFERENCES orders(id) 
  ON DELETE SET NULL;
