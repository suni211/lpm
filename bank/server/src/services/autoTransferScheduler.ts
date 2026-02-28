import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { createNotification } from '../routes/notifications';

class AutoTransferScheduler {
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 매일 자정에 실행 (자동 이체 처리)
    cron.schedule('0 0 * * *', async () => {
      await this.processAutoTransfers();
    });

    // 매 시간마다 실행 (예약 이체 처리)
    cron.schedule('0 * * * *', async () => {
      await this.processScheduledTransfers();
    });

    console.log('✅ Auto Transfer Scheduler started');
  }

  // 자동 이체 처리
  private async processAutoTransfers() {
    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();

      // 오늘 실행해야 할 자동 이체 규칙 조회
      const rules = await query(
        `SELECT atr.*, a.user_id, a.balance
         FROM auto_transfer_rules atr
         JOIN accounts a ON atr.from_account_id = a.id
         WHERE atr.is_active = TRUE
         AND atr.next_execution_date <= CURDATE()
         AND (
           (atr.frequency = 'DAILY') OR
           (atr.frequency = 'WEEKLY' AND atr.day_of_week = ?) OR
           (atr.frequency = 'MONTHLY' AND atr.day_of_month = ?)
         )`,
        [dayOfWeek, dayOfMonth]
      );

      for (const rule of rules) {
        try {
          // 잔액 확인
          const account = (await query('SELECT * FROM accounts WHERE id = ?', [rule.from_account_id]))[0];
          if (account.balance < rule.amount) {
            // 잔액 부족 알림
            await createNotification(
              rule.user_id,
              'ALERT',
              '자동 이체 실패',
              `자동 이체 규칙 실행 실패: 잔액이 부족합니다. (필요: ${rule.amount.toLocaleString()} G)`,
              rule.id,
              'AUTO_TRANSFER'
            );
            continue;
          }

          // 수신 계좌 확인
          const toAccount = await query('SELECT * FROM accounts WHERE account_number = ?', [rule.to_account_number]);
          if (toAccount.length === 0) {
            await createNotification(
              rule.user_id,
              'ALERT',
              '자동 이체 실패',
              `자동 이체 규칙 실행 실패: 수신 계좌를 찾을 수 없습니다. (${rule.to_account_number})`,
              rule.id,
              'AUTO_TRANSFER'
            );
            continue;
          }

          // 이체 실행
          await query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [rule.amount, rule.from_account_id]);
          await query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [rule.amount, toAccount[0].id]);

          // 거래 기록
          const transactionId = uuidv4();
          await query(
            `INSERT INTO transactions (id, transaction_type, account_id, related_account_id, amount, balance_before, balance_after, notes)
             VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`,
            [
              transactionId,
              rule.from_account_id,
              toAccount[0].id,
              rule.amount,
              account.balance,
              account.balance - rule.amount,
              `자동 이체: ${rule.to_account_number}`,
            ]
          );

          // 다음 실행 날짜 계산
          let nextExecution = new Date();
          if (rule.frequency === 'DAILY') {
            nextExecution.setDate(today.getDate() + 1);
          } else if (rule.frequency === 'WEEKLY') {
            nextExecution.setDate(today.getDate() + 7);
          } else if (rule.frequency === 'MONTHLY') {
            nextExecution.setMonth(today.getMonth() + 1);
            nextExecution.setDate(rule.day_of_month || 1);
          }

          await query(
            'UPDATE auto_transfer_rules SET last_execution_date = CURDATE(), next_execution_date = ? WHERE id = ?',
            [nextExecution, rule.id]
          );

          // 알림
          await createNotification(
            rule.user_id,
            'TRANSACTION',
            '자동 이체 완료',
            `${rule.amount.toLocaleString()} G가 ${rule.to_account_number}로 자동 이체되었습니다.`,
            transactionId,
            'AUTO_TRANSFER'
          );
        } catch (error) {
          console.error(`자동 이체 규칙 ${rule.id} 실행 오류:`, error);
        }
      }
    } catch (error) {
      console.error('자동 이체 처리 오류:', error);
    }
  }

  // 예약 이체 처리
  private async processScheduledTransfers() {
    try {
      const now = new Date();

      // 실행 시간이 된 예약 이체 조회
      const scheduled = await query(
        `SELECT st.*, a.user_id, a.balance
         FROM scheduled_transfers st
         JOIN accounts a ON st.from_account_id = a.id
         WHERE st.status = 'PENDING'
         AND st.scheduled_date <= ?
         ORDER BY st.scheduled_date ASC`,
        [now]
      );

      for (const transfer of scheduled) {
        try {
          // 잔액 확인
          const account = (await query('SELECT * FROM accounts WHERE id = ?', [transfer.from_account_id]))[0];
          if (account.balance < transfer.amount) {
            await query('UPDATE scheduled_transfers SET status = "FAILED" WHERE id = ?', [transfer.id]);
            await createNotification(
              transfer.user_id,
              'ALERT',
              '예약 이체 실패',
              `예약 이체 실패: 잔액이 부족합니다. (필요: ${transfer.amount.toLocaleString()} G)`,
              transfer.id,
              'SCHEDULED_TRANSFER'
            );
            continue;
          }

          // 수신 계좌 확인
          const toAccount = await query('SELECT * FROM accounts WHERE account_number = ?', [transfer.to_account_number]);
          if (toAccount.length === 0) {
            await query('UPDATE scheduled_transfers SET status = "FAILED" WHERE id = ?', [transfer.id]);
            await createNotification(
              transfer.user_id,
              'ALERT',
              '예약 이체 실패',
              `예약 이체 실패: 수신 계좌를 찾을 수 없습니다. (${transfer.to_account_number})`,
              transfer.id,
              'SCHEDULED_TRANSFER'
            );
            continue;
          }

          // 이체 실행
          await query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transfer.amount, transfer.from_account_id]);
          await query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transfer.amount, toAccount[0].id]);

          // 거래 기록
          const transactionId = uuidv4();
          await query(
            `INSERT INTO transactions (id, transaction_type, account_id, related_account_id, amount, balance_before, balance_after, notes)
             VALUES (?, 'TRANSFER_OUT', ?, ?, ?, ?, ?, ?)`,
            [
              transactionId,
              transfer.from_account_id,
              toAccount[0].id,
              transfer.amount,
              account.balance,
              account.balance - transfer.amount,
              `예약 이체: ${transfer.to_account_number}`,
            ]
          );

          await query(
            'UPDATE scheduled_transfers SET status = "COMPLETED", executed_at = NOW() WHERE id = ?',
            [transfer.id]
          );

          // 알림
          await createNotification(
            transfer.user_id,
            'TRANSACTION',
            '예약 이체 완료',
            `${transfer.amount.toLocaleString()} G가 ${transfer.to_account_number}로 예약 이체되었습니다.`,
            transactionId,
            'SCHEDULED_TRANSFER'
          );
        } catch (error) {
          console.error(`예약 이체 ${transfer.id} 실행 오류:`, error);
          await query('UPDATE scheduled_transfers SET status = "FAILED" WHERE id = ?', [transfer.id]);
        }
      }
    } catch (error) {
      console.error('예약 이체 처리 오류:', error);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('⏹️  Auto Transfer Scheduler stopped');
  }
}

export default new AutoTransferScheduler();

