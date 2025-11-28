-- 음수 잔액 수정 스크립트
USE lico_db;

-- 음수 잔액 확인
SELECT
    ucb.id,
    uw.minecraft_username,
    c.symbol,
    ucb.available_amount,
    ucb.locked_amount
FROM user_coin_balances ucb
JOIN user_wallets uw ON ucb.wallet_id = uw.id
JOIN coins c ON ucb.coin_id = c.id
WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0;

-- 음수 잔액을 0으로 수정 (주의: 실제 데이터 손실 가능)
-- 실행 전 백업 필수!
UPDATE user_coin_balances
SET available_amount = 0
WHERE available_amount < 0;

UPDATE user_coin_balances
SET locked_amount = 0
WHERE locked_amount < 0;

-- 수정 후 확인
SELECT
    ucb.id,
    uw.minecraft_username,
    c.symbol,
    ucb.available_amount,
    ucb.locked_amount
FROM user_coin_balances ucb
JOIN user_wallets uw ON ucb.wallet_id = uw.id
JOIN coins c ON ucb.coin_id = c.id
WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0;
