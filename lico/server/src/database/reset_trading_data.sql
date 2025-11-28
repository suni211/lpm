-- LICO 거래 데이터 초기화 (유저는 유지)
USE lico_db;

-- 백업 확인
SELECT '=== 초기화 전 데이터 확인 ===' as info;

SELECT 'user_wallets' as table_name, COUNT(*) as count FROM user_wallets;
SELECT 'user_coin_balances' as table_name, COUNT(*) as count FROM user_coin_balances;
SELECT 'orders' as table_name, COUNT(*) as count FROM orders;
SELECT 'trades' as table_name, COUNT(*) as count FROM trades;
SELECT 'coins' as table_name, COUNT(*) as count FROM coins;

-- 1. 거래 내역 삭제
TRUNCATE TABLE trades;
SELECT '✓ trades 테이블 초기화 완료' as status;

-- 2. 주문 삭제
TRUNCATE TABLE orders;
SELECT '✓ orders 테이블 초기화 완료' as status;

-- 3. 사용자 코인 잔액 삭제
TRUNCATE TABLE user_coin_balances;
SELECT '✓ user_coin_balances 테이블 초기화 완료' as status;

-- 4. 캔들 데이터 삭제
TRUNCATE TABLE candles_1m;
TRUNCATE TABLE candles_1h;
TRUNCATE TABLE candles_1d;
SELECT '✓ 캔들 데이터 초기화 완료' as status;

-- 5. AI 로그 삭제
TRUNCATE TABLE ai_trade_logs;
SELECT '✓ AI 로그 초기화 완료' as status;

-- 6. 블록체인 데이터 삭제 (선택사항)
-- TRUNCATE TABLE blockchain_blocks;
-- TRUNCATE TABLE blockchain_transactions;

-- 7. 코인 가격 초기화 (initial_price로 리셋)
UPDATE coins
SET current_price = initial_price,
    price_change_24h = 0,
    volume_24h = 0,
    market_cap = initial_price * circulating_supply
WHERE status = 'ACTIVE';
SELECT '✓ 코인 가격 초기화 완료' as status;

-- 8. AI 봇 지갑 코인 잔액 초기화 (전체 발행량 재배포)
-- AI 봇 지갑 찾기
SET @ai_wallet_id = (SELECT id FROM user_wallets WHERE minecraft_username = 'AI_BOT' LIMIT 1);

-- AI 봇의 기존 잔액 삭제
DELETE FROM user_coin_balances WHERE wallet_id = @ai_wallet_id;

-- 각 코인마다 AI 봇에게 전체 발행량 재배포
INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, locked_amount, average_buy_price)
SELECT
    UUID(),
    @ai_wallet_id,
    id,
    circulating_supply,
    0,
    initial_price
FROM coins
WHERE status = 'ACTIVE';
SELECT '✓ AI 봇 코인 재배포 완료' as status;

-- 9. 초기화 후 확인
SELECT '=== 초기화 후 데이터 확인 ===' as info;

SELECT 'user_wallets' as table_name, COUNT(*) as count FROM user_wallets;
SELECT 'user_coin_balances' as table_name, COUNT(*) as count FROM user_coin_balances;
SELECT 'orders' as table_name, COUNT(*) as count FROM orders;
SELECT 'trades' as table_name, COUNT(*) as count FROM trades;
SELECT 'coins' as table_name, COUNT(*) as count FROM coins;

SELECT '✅ LICO 거래 데이터 초기화 완료!' as status;
SELECT '⚠️ 유저 지갑은 유지되었습니다 (골드 잔액 포함)' as note;
