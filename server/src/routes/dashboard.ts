import express, { Request, Response } from 'express';
import { query } from '../database/db';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 대시보드 통계 조회
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // 팀 정보
    const teamResult = await query(
      'SELECT * FROM teams WHERE user_id = ?',
      [userId]
    );
    const team = teamResult[0];

    // 선수 카드 수
    const playerCountResult = await query(
      'SELECT COUNT(*) as count FROM user_player_cards WHERE team_id = ?',
      [team.id]
    );
    const playerCount = playerCountResult[0].count;

    // 로스터 선수 수
    const rosterCountResult = await query(
      'SELECT COUNT(*) as count FROM user_player_cards WHERE team_id = ? AND is_in_roster = true',
      [team.id]
    );
    const rosterCount = rosterCountResult[0].count;

    // 평균 선수 파워
    const avgPowerResult = await query(`
      SELECT AVG(pc.power) as avg_power
      FROM user_player_cards upc
      JOIN player_cards pc ON upc.player_card_id = pc.id
      WHERE upc.team_id = ? AND upc.is_in_roster = true
    `, [team.id]);
    const avgPower = Math.round(avgPowerResult[0].avg_power || 0);

    // 최근 경기 전적 (최근 10경기)
    const recentMatchesResult = await query(`
      SELECT result
      FROM match_history
      WHERE team_id = ?
      ORDER BY match_date DESC
      LIMIT 10
    `, [team.id]);

    const wins = recentMatchesResult.filter((m: any) => m.result === 'WIN').length;
    const losses = recentMatchesResult.filter((m: any) => m.result === 'LOSS').length;

    res.json({
      team: {
        name: team.team_name,
        balance: team.balance,
        tier: team.current_tier,
        lp: team.lp,
        fandom: team.fandom,
        fanSatisfaction: team.fan_satisfaction,
        reputation: team.reputation,
      },
      stats: {
        playerCount,
        rosterCount,
        avgPower,
        recentWins: wins,
        recentLosses: losses,
        winRate: recentMatchesResult.length > 0 ? Math.round((wins / recentMatchesResult.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('대시보드 통계 조회 실패:', error);
    res.status(500).json({ error: '통계 조회에 실패했습니다' });
  }
});

// 자금 추이 (최근 30일)
router.get('/money-trend', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await query('SELECT id FROM teams WHERE user_id = ?', [userId]);
    const teamId = teamResult[0].id;

    // 최근 30일 거래 내역 (더미 데이터, 실제로는 transaction 테이블 필요)
    // 임시로 최근 경기, 경매, 굿즈 구매 등에서 추출
    const transactions = await query(`
      SELECT
        DATE(created_at) as date,
        'match' as type,
        50000000 as amount
      FROM match_history
      WHERE team_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY date DESC
      LIMIT 30
    `, [teamId]);

    // 날짜별 그룹화 및 누적
    const dateMap = new Map();
    let currentBalance = teamResult[0].balance;

    transactions.reverse().forEach((t: any) => {
      const date = new Date(t.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      if (!dateMap.has(date)) {
        dateMap.set(date, currentBalance);
      }
    });

    // 최근 7일 데이터 생성 (실제 데이터가 없으면 더미)
    const trend = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

      trend.push({
        date: dateStr,
        balance: currentBalance - (i * 10000000) + (Math.random() * 50000000),
      });
    }

    res.json({ trend });
  } catch (error) {
    console.error('자금 추이 조회 실패:', error);
    res.status(500).json({ error: '자금 추이 조회에 실패했습니다' });
  }
});

// 팬 통계
router.get('/fan-stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await query('SELECT id, fandom, fan_satisfaction FROM teams WHERE user_id = ?', [userId]);
    const team = teamResult[0];

    // 최근 7일 팬 변화 (더미 데이터)
    const fanTrend = [];
    const today = new Date();
    let currentFans = team.fandom;

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

      fanTrend.push({
        date: dateStr,
        fans: Math.max(0, currentFans - (i * 50) + (Math.random() * 200)),
        satisfaction: Math.max(0, Math.min(100, team.fan_satisfaction + (Math.random() * 10 - 5))),
      });
    }

    res.json({
      current: {
        fandom: team.fandom,
        satisfaction: team.fan_satisfaction,
      },
      trend: fanTrend,
    });
  } catch (error) {
    console.error('팬 통계 조회 실패:', error);
    res.status(500).json({ error: '팬 통계 조회에 실패했습니다' });
  }
});

// 선수 통계
router.get('/player-stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await query('SELECT id FROM teams WHERE user_id = ?', [userId]);
    const teamId = teamResult[0].id;

    // 포지션별 선수 분포
    const positionDistribution = await query(`
      SELECT
        pc.position,
        COUNT(*) as count,
        AVG(pc.power) as avg_power
      FROM user_player_cards upc
      JOIN player_cards pc ON upc.player_card_id = pc.id
      WHERE upc.team_id = ?
      GROUP BY pc.position
      ORDER BY
        CASE pc.position
          WHEN 'TOP' THEN 1
          WHEN 'JUNGLE' THEN 2
          WHEN 'MID' THEN 3
          WHEN 'ADC' THEN 4
          WHEN 'SUPPORT' THEN 5
          ELSE 6
        END
    `, [teamId]);

    // 레어도별 분포
    const rarityDistribution = await query(`
      SELECT
        pc.rarity,
        COUNT(*) as count
      FROM user_player_cards upc
      JOIN player_cards pc ON upc.player_card_id = pc.id
      WHERE upc.team_id = ?
      GROUP BY pc.rarity
      ORDER BY
        CASE pc.rarity
          WHEN 'LEGEND' THEN 1
          WHEN 'EPIC' THEN 2
          WHEN 'RARE' THEN 3
          ELSE 4
        END
    `, [teamId]);

    res.json({
      positionDistribution: positionDistribution.map((p: any) => ({
        position: p.position,
        count: p.count,
        avgPower: Math.round(p.avg_power),
      })),
      rarityDistribution: rarityDistribution.map((r: any) => ({
        rarity: r.rarity,
        count: r.count,
      })),
    });
  } catch (error) {
    console.error('선수 통계 조회 실패:', error);
    res.status(500).json({ error: '선수 통계 조회에 실패했습니다' });
  }
});

export default router;
