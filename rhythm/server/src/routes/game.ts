import express from 'express';
import { query } from '../database/connection';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import '../types'; // Import session type declarations

const router = express.Router();

// 점수 계산 함수
function calculateScore(judgments: any, maxCombo: number): number {
  const { perfect, great, good, bad, miss } = judgments;
  const totalNotes = perfect + great + good + bad + miss;

  if (totalNotes === 0) return 0;

  const baseScore = (perfect * 100 + great * 70 + good * 40 + bad * 10) / totalNotes;
  const comboBonus = (maxCombo / totalNotes) * 20;

  return Math.round((baseScore * 8 + comboBonus * 2) * 1000);
}

// 등급 계산
function calculateRank(score: number): string {
  if (score >= 990000) return 'SSS';
  if (score >= 970000) return 'SS';
  if (score >= 950000) return 'S';
  if (score >= 900000) return 'A';
  if (score >= 800000) return 'B';
  if (score >= 700000) return 'C';
  if (score >= 600000) return 'D';
  return 'F';
}

// 정확도 계산
function calculateAccuracy(judgments: any): number {
  const { perfect, great, good, bad, miss } = judgments;
  const totalNotes = perfect + great + good + bad + miss;

  if (totalNotes === 0) return 0;

  const weightedSum = perfect * 100 + great * 80 + good * 50 + bad * 20;
  return Number(((weightedSum / (totalNotes * 100)) * 100).toFixed(2));
}

// 플레이 결과 제출
router.post('/submit', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { beatmapId, judgments, maxCombo, noteSpeed } = req.body;

    if (!beatmapId || !judgments) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate beatmap exists
    const beatmaps: any = await query(
      'SELECT note_count, max_combo FROM beatmaps WHERE id = ?',
      [beatmapId]
    );

    if (!Array.isArray(beatmaps) || beatmaps.length === 0) {
      return res.status(404).json({ error: 'Beatmap not found' });
    }

    const beatmap = beatmaps[0];
    const totalJudgments = Object.values(judgments).reduce((a: any, b: any) => a + b, 0);

    // Validate total notes
    if (totalJudgments !== beatmap.note_count) {
      return res.status(400).json({ error: 'Invalid judgment count' });
    }

    // Calculate score, rank, accuracy
    const score = calculateScore(judgments, maxCombo);
    const rank = calculateRank(score);
    const accuracy = calculateAccuracy(judgments);
    const isFullCombo = judgments.miss === 0 && judgments.bad === 0;
    const isAllPerfect = judgments.perfect === beatmap.note_count;

    const playRecordId = uuidv4();

    // Insert play record
    await query(
      `INSERT INTO play_records
       (id, user_id, beatmap_id, score, accuracy, max_combo,
        perfect_count, great_count, good_count, bad_count, miss_count,
        rank, is_full_combo, is_all_perfect, note_speed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        playRecordId, userId, beatmapId, score, accuracy, maxCombo,
        judgments.perfect, judgments.great, judgments.good, judgments.bad, judgments.miss,
        rank, isFullCombo, isAllPerfect, noteSpeed || 5.0
      ]
    );

    // Check if this is a new best score
    const bestScores: any = await query(
      'SELECT score FROM best_scores WHERE user_id = ? AND beatmap_id = ?',
      [userId, beatmapId]
    );

    if (!Array.isArray(bestScores) || bestScores.length === 0) {
      // First play - insert new best score
      await query(
        `INSERT INTO best_scores
         (id, user_id, beatmap_id, play_record_id, score, accuracy, max_combo,
          rank, is_full_combo, is_all_perfect)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), userId, beatmapId, playRecordId, score, accuracy, maxCombo,
         rank, isFullCombo, isAllPerfect]
      );
    } else if (score > bestScores[0].score) {
      // New best score - update
      await query(
        `UPDATE best_scores
         SET play_record_id = ?, score = ?, accuracy = ?, max_combo = ?,
             rank = ?, is_full_combo = ?, is_all_perfect = ?, updated_at = NOW()
         WHERE user_id = ? AND beatmap_id = ?`,
        [playRecordId, score, accuracy, maxCombo, rank, isFullCombo, isAllPerfect, userId, beatmapId]
      );
    }

    // Update user stats
    await query(
      `UPDATE users
       SET total_plays = total_plays + 1,
           total_score = total_score + ?,
           experience = experience + ?
       WHERE id = ?`,
      [score, Math.floor(score / 1000), userId]
    );

    res.json({
      message: 'Play record saved',
      playRecordId,
      score,
      rank,
      accuracy,
      isNewBest: !Array.isArray(bestScores) || bestScores.length === 0 || score > bestScores[0].score,
      isFullCombo,
      isAllPerfect
    });
  } catch (error) {
    console.error('Submit play error:', error);
    res.status(500).json({ error: 'Failed to submit play record' });
  }
});

// 사용자의 플레이 기록 조회
router.get('/records/:beatmapId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { beatmapId } = req.params;

    const records: any = await query(
      `SELECT * FROM play_records
       WHERE user_id = ? AND beatmap_id = ?
       ORDER BY play_date DESC
       LIMIT 10`,
      [userId, beatmapId]
    );

    res.json(records || []);
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({ error: 'Failed to get records' });
  }
});

export default router;
