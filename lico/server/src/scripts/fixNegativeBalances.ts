import { query } from '../database/db';

async function fixNegativeBalances() {
  console.log('🔧 음수 잔액 수정 시작...\n');

  try {
    // 1. 현재 음수 잔액 확인
    console.log('📊 현재 음수 잔액 확인:');
    const negativeBalances = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        s.symbol,
        ucb.available_amount,
        ucb.locked_amount,
        (ucb.available_amount + ucb.locked_amount) as total
      FROM user_stock_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN stocks s ON ucb.stock_id = s.id
      WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0
    `);

    if (negativeBalances.length === 0) {
      console.log('✅ 음수 잔액이 없습니다.\n');
      return;
    }

    console.table(negativeBalances);

    // 2. 각 음수 잔액 수정
    for (const balance of negativeBalances) {
      const available = parseFloat(balance.available_amount || 0);
      const locked = parseFloat(balance.locked_amount || 0);
      const total = available + locked;

      console.log(`\n🔧 수정 중: ${balance.minecraft_username} - ${balance.symbol}`);
      console.log(`   현재: available=${available}, locked=${locked}, total=${total}`);

      if (total >= 0) {
        // 총합이 양수면 locked를 available로 옮기기
        await query(
          `UPDATE user_stock_balances
           SET available_amount = ?,
               locked_amount = 0
           WHERE id = ?`,
          [total, balance.id]
        );
        console.log(`   ✅ 수정 완료: available=${total}, locked=0`);
      } else {
        // 총합이 음수면 모두 0으로
        await query(
          `UPDATE user_stock_balances
           SET available_amount = 0,
               locked_amount = 0
           WHERE id = ?`,
          [balance.id]
        );
        console.log(`   ⚠️  총합이 음수여서 0으로 초기화`);
      }
    }

    // 3. 수정 후 확인
    console.log('\n📊 수정 후 음수 잔액 확인:');
    const remainingNegative = await query(`
      SELECT
        ucb.id,
        uw.minecraft_username,
        s.symbol,
        ucb.available_amount,
        ucb.locked_amount
      FROM user_stock_balances ucb
      JOIN user_wallets uw ON ucb.wallet_id = uw.id
      JOIN stocks s ON ucb.stock_id = s.id
      WHERE ucb.available_amount < 0 OR ucb.locked_amount < 0
    `);

    if (remainingNegative.length === 0) {
      console.log('✅ 모든 음수 잔액이 수정되었습니다.\n');
    } else {
      console.log('⚠️  아직 음수 잔액이 남아있습니다:');
      console.table(remainingNegative);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 실행
fixNegativeBalances()
  .then(() => {
    console.log('✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 작업 실패:', error);
    process.exit(1);
  });
