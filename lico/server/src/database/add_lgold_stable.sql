-- LGOLD 스테이블 코인 추가
USE lico_db;

-- LGOLD 코인 생성
INSERT INTO coins (
  id,
  symbol,
  name,
  description,
  initial_price,
  current_price,
  circulating_supply,
  max_supply,
  price_change_24h,
  volume_24h,
  market_cap,
  logo_url,
  status,
  is_stable_coin,
  created_at
) VALUES (
  UUID(),
  'LGOLD',
  'LICO Gold Stable',
  '프라이버시 보호 스테이블 코인 - 1 LGOLD = 1 BANK Gold. 거래 수수료 0%, 보유량 및 거래 내역은 당사자와 관리자만 조회 가능.',
  1,
  1,
  0,  -- 초기 발행량 0 (사용자가 교환 시 발행)
  NULL,  -- 최대 공급량 제한 없음
  0,
  0,
  0,
  '/images/coins/lgold.png',
  'ACTIVE',
  TRUE,  -- 스테이블 코인 플래그
  NOW()
);

-- LGOLD 코인 ID 확인
SELECT id, symbol, name, current_price, is_stable_coin
FROM coins
WHERE symbol = 'LGOLD';

SELECT '✅ LGOLD 스테이블 코인이 추가되었습니다!' as status;
SELECT '⚠️ is_stable_coin 컬럼이 없다면 아래 ALTER TABLE을 실행하세요:' as note;
SELECT 'ALTER TABLE coins ADD COLUMN is_stable_coin BOOLEAN DEFAULT FALSE;' as sql_command;
