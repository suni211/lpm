-- stocks 테이블에 exchange_type 컬럼 추가 (CK/LK 거래소 구분)
-- CK 거래소: 상한가/하한가 ±20%
-- LK 거래소: 신규 상장/신규 기업/중소기업 한정, 상한가/하한가 ±50%

ALTER TABLE stocks ADD COLUMN exchange_type ENUM('CK', 'LK') DEFAULT 'CK' COMMENT '거래소 구분 (CK: ±20%, LK: ±50%)';
