import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 통계 조회
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { period = 'month' } = req.query; // 'week', 'month', 'year'

    let dateFilter = '';
    if (period === 'week') {
      dateFilter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (period === 'month') {
      dateFilter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)";
    } else if (period === 'year') {
      dateFilter = "AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    }

    // 사용자의 모든 계좌 ID 조회
    const accounts = await query('SELECT id FROM accounts WHERE user_id = ?', [req.session.userId]);
    const accountIds = accounts.map((a: any) => a.id);

    if (accountIds.length === 0) {
      return res.json({
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        transactionCount: 0,
        byType: {},
        byCategory: {},
        monthlyData: [],
      });
    }

    const placeholders = accountIds.map(() => '?').join(',');

    // 총 수입/지출
    const incomeResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id IN (${placeholders})
       AND transaction_type IN ('DEPOSIT', 'TRANSFER_IN')
       ${dateFilter}`,
      accountIds
    );

    const expenseResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id IN (${placeholders})
       AND transaction_type IN ('WITHDRAWAL', 'TRANSFER_OUT')
       ${dateFilter}`,
      accountIds
    );

    // 거래 유형별 통계
    const byTypeResult = await query(
      `SELECT transaction_type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id IN (${placeholders})
       ${dateFilter}
       GROUP BY transaction_type`,
      accountIds
    );

    // 월별 데이터
    const monthlyData = await query(
      `SELECT 
         DATE_FORMAT(created_at, '%Y-%m') as month,
         SUM(CASE WHEN transaction_type IN ('DEPOSIT', 'TRANSFER_IN') THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN transaction_type IN ('WITHDRAWAL', 'TRANSFER_OUT') THEN amount ELSE 0 END) as expense,
         COUNT(*) as count
       FROM transactions
       WHERE account_id IN (${placeholders})
       ${dateFilter}
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`,
      accountIds
    );

    // 거래 개수
    const countResult = await query(
      `SELECT COUNT(*) as count
       FROM transactions
       WHERE account_id IN (${placeholders})
       ${dateFilter}`,
      accountIds
    );

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpense = expenseResult[0]?.total || 0;
    const transactionCount = countResult[0]?.count || 0;

    const byType: any = {};
    byTypeResult.forEach((row: any) => {
      byType[row.transaction_type] = {
        count: row.count,
        total: row.total,
      };
    });

    res.json({
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      transactionCount,
      byType,
      monthlyData,
    });
  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

// 예산 대비 지출 통계
router.get('/budget', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgets = await query(
      `SELECT b.*, a.account_number
       FROM budgets b
       JOIN accounts a ON b.account_id = a.id
       WHERE b.user_id = ? AND b.month_year = ?`,
      [req.session.userId, currentMonth]
    );

    const budgetStats = await Promise.all(
      budgets.map(async (budget: any) => {
        // 해당 카테고리의 지출 계산 (간단히 출금만 계산)
        const spentResult = await query(
          `SELECT COALESCE(SUM(amount), 0) as spent
           FROM transactions
           WHERE account_id = ?
           AND transaction_type = 'WITHDRAWAL'
           AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
          [budget.account_id, currentMonth]
        );

        const spent = spentResult[0]?.spent || 0;
        const remaining = budget.monthly_limit - spent;
        const percentage = (spent / budget.monthly_limit) * 100;

        return {
          ...budget,
          spent,
          remaining,
          percentage: Math.min(100, percentage),
        };
      })
    );

    res.json({ budgets: budgetStats });
  } catch (error) {
    console.error('예산 통계 조회 오류:', error);
    res.status(500).json({ error: '예산 통계 조회 실패' });
  }
});

export default router;

