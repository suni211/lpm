-- 특정 음수 잔액 수정
USE lico_db;

-- 현재 상태 확인
SELECT
    ucb.id,
    uw.minecraft_username,
    c.symbol,
    ucb.available_amount,
    ucb.locked_amount,
    (ucb.available_amount + ucb.locked_amount) as total
FROM user_coin_balances ucb
JOIN user_wallets uw ON ucb.wallet_id = uw.id
JOIN coins c ON ucb.coin_id = c.id
WHERE ucb.id IN (
    '0924df25-6518-48c6-9290-0908735afee1',
    '5496b3bf-d2e5-464e-a7e3-cfb83a908d36',
    '86b23b95-e613-44ef-8e4f-db40dd71f837'
);

-- 수정 방법 1: locked_amount를 available로 옮기고 음수를 0으로
-- MF_Ryo HAMC: available = -2038.57 + locked 10000 = 7961.42
UPDATE user_coin_balances
SET available_amount = 7961.42516618,
    locked_amount = 0
WHERE id = '0924df25-6518-48c6-9290-0908735afee1';

-- jeongsanghwa REC: available = -5804.54 + locked 5804.54 = 0
UPDATE user_coin_balances
SET available_amount = 0,
    locked_amount = 0
WHERE id = '5496b3bf-d2e5-464e-a7e3-cfb83a908d36';

-- jeongsanghwa MUNG: available = -12451.64 + locked 100000 = 87548.35
UPDATE user_coin_balances
SET available_amount = 87548.35586551,
    locked_amount = 0
WHERE id = '86b23b95-e613-44ef-8e4f-db40dd71f837';

-- 수정 후 확인
SELECT
    ucb.id,
    uw.minecraft_username,
    c.symbol,
    ucb.available_amount,
    ucb.locked_amount,
    (ucb.available_amount + ucb.locked_amount) as total
FROM user_coin_balances ucb
JOIN user_wallets uw ON ucb.wallet_id = uw.id
JOIN coins c ON ucb.coin_id = c.id
WHERE ucb.id IN (
    '0924df25-6518-48c6-9290-0908735afee1',
    '5496b3bf-d2e5-464e-a7e3-cfb83a908d36',
    '86b23b95-e613-44ef-8e4f-db40dd71f837'
);

-- 모든 음수 잔액 확인
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
