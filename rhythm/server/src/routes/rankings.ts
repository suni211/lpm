import express from 'express';
import { query } from '../database/connection';

const router = express.Router();

// 글로벌 랭킹 (상위 100명)
router.get('/global', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const rankings: any = await query(
      `SELECT
         u.id,
         u.username,
         u.display_name,
         u.avatar_url,
         u.level,
         u.total_score,
         u.total_plays,
         COUNT(DISTINCT bs.id) as beatmap_clears,
         SUM(bs.is_full_combo) as full_combo_count,
         SUM(bs.is_all_perfect) as all_perfect_count,
         AVG(bs.accuracy) as average_accuracy
       FROM users u
       LEFT JOIN best_scores bs ON u.id = bs.user_id
       WHERE u.status = 'ACTIVE'
       GROUP BY u.id
       ORDER BY u.total_score DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json(rankings || []);
  } catch (error) {
    console.error('Get global rankings error:', error);
    res.status(500).json({ error: 'Failed to get global rankings' });
  }
});

// 특정 비트맵 랭킹
router.get('/beatmap/:beatmapId', async (req, res) => {
  try {
    const { beatmapId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const rankings: any = await query(
      `SELECT
         bs.user_id,
         u.username,
         u.display_name,
         u.avatar_url,
         u.level,
         bs.score,
         bs.accuracy,
         bs.max_combo,
         bs.rank,
         bs.is_full_combo,
         bs.is_all_perfect,
         bs.achieved_at
       FROM best_scores bs
       JOIN users u ON bs.user_id = u.id
       WHERE bs.beatmap_id = ?
       ORDER BY bs.score DESC, bs.achieved_at ASC
       LIMIT ?`,
      [beatmapId, limit]
    );

    res.json(rankings || []);
  } catch (error) {
    console.error('Get beatmap rankings error:', error);
    res.status(500).json({ error: 'Failed to get beatmap rankings' });
  }
});

// 사용자의 랭킹 위치 조회
router.get('/user/:userId/position', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's total score
    const users: any = await query(
      'SELECT total_score FROM users WHERE id = ?',
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userScore = users[0].total_score;

    // Calculate position
    const positions: any = await query(
      'SELECT COUNT(*) + 1 as position FROM users WHERE total_score > ? AND status = \'ACTIVE\'',
      [userScore]
    );

    res.json({
      userId,
      totalScore: userScore,
      position: positions[0]?.position || 1
    });
  } catch (error) {
    console.error('Get user position error:', error);
    res.status(500).json({ error: 'Failed to get user position' });
  }
});

export default router;
