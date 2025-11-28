import { query } from '../database/db';

async function mergeLockedBalances() {
  console.log('🔧 locked 잔액을 available로 병합 시작...\n');

  try {
    // 1. locked가 있는 모든 잔액 조회
    console.log('📊 locked 잔액 확인:');
    const lockedBalances = await query(`
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
      WHERE ucb.locked_amount > 0
    `);

    if (lockedBalances.length === 0) {
      console.log('✅ locked 잔액이 없습니다.\n');
      return;
    }

    console.table(lockedBalances);

    // 2. 각 locked 잔액을 available로 병합
    for (const balance of lockedBalances) {
      const available = parseFloat(balance.available_amount || 0);
      const locked = parseFloat(balance.locked_amount || 0);
      const total = available + locked;

      console.log(`\n🔧 병합 중: ${balance.minecraft_username} - ${balance.symbol}`);
      console.log(`   현재: available=${available}, locked=${locked}`);

      // locked를 available로 병합
      await query(
        `UPDATE user_coin_balances
         SET available_amount = ?,
             locked_amount = 0
         WHERE id = ?`,
        [total, balance.id]
      );
      console.log(`   ✅ 병합 완료: available=${total}, locked=0`);
    }

    // 3. 병합 후 확인
    console.log('\n📊 병합 후 locked 잔액 확인:');
    const remainingLocked = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        c.symbol,
        ucb.available_amount,
        ucb.locked_amount
      FROM user_coin_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN coins c ON ucb.coin_id = c.id
      WHERE ucb.locked_amount > 0
    `);

    if (remainingLocked.length === 0) {
      console.log('✅ 모든 locked 잔액이 available로 병합되었습니다.\n');
    } else {
      console.log('⚠️  아직 locked 잔액이 남아있습니다:');
      console.table(remainingLocked);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
mergeLockedBalances()
  .then(() => {
    console.log('✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 작업 실패:', error);
    process.exit(1);
  });
