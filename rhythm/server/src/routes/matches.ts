import express from 'express';
import { requireAuth } from '../middleware/auth';
import { query } from '../utils/database';
import { Request, Response } from 'express';

const router = express.Router();

// 매치 상세 정보
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const matches = await query(
      'SELECT * FROM matches WHERE id = ?',
      [id]
    ) as any[];

    if (matches.length === 0) {
      return res.status(404).json({ error: '매치를 찾을 수 없습니다.' });
    }

    const participants = await query(
      `SELECT mp.*, u.username, u.display_name, u.tier, u.rating
       FROM match_participants mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = ?`,
      [id]
    ) as any[];

    const rounds = await query(
      `SELECT mr.*, b.difficulty, b.key_count, s.title, s.artist
       FROM match_rounds mr
       JOIN beatmaps b ON mr.beatmap_id = b.id
       JOIN songs s ON b.song_id = s.id
       WHERE mr.match_id = ?
       ORDER BY mr.round_number`,
      [id]
    ) as any[];

    res.json({
      match: matches[0],
      participants,
      rounds
    });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: '매치 조회 중 오류가 발생했습니다.' });
  }
});

// 밴 추가
router.post('/:id/ban', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { beatmap_id } = req.body;

    // 이미 밴된 곡인지 확인
    const existingBans = await query(
      'SELECT id FROM match_bans WHERE match_id = ? AND beatmap_id = ?',
      [id, beatmap_id]
    ) as any[];

    if (existingBans.length > 0) {
      return res.status(400).json({ error: '이미 밴된 곡입니다.' });
    }

    // 밴 제한 확인 (5곡당 2밴)
    const totalBans = await query(
      'SELECT COUNT(*) as count FROM match_bans WHERE match_id = ?',
      [id]
    ) as any[];

    if (totalBans[0].count >= 2) {
      return res.status(400).json({ error: '밴 제한을 초과했습니다.' });
    }

    await query(
      'INSERT INTO match_bans (match_id, user_id, beatmap_id) VALUES (?, ?, ?)',
      [id, userId, beatmap_id]
    );

    res.json({ message: '밴이 추가되었습니다.' });
  } catch (error) {
    console.error('Add ban error:', error);
    res.status(500).json({ error: '밴 추가 중 오류가 발생했습니다.' });
  }
});

// 라운드 결과 제출
router.post('/:id/round/:round_number/result', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id, round_number } = req.params;
    const { score, accuracy, max_combo } = req.body;

    // 라운드 존재 확인
    const rounds = await query(
      'SELECT * FROM match_rounds WHERE match_id = ? AND round_number = ?',
      [id, round_number]
    ) as any[];

    if (rounds.length === 0) {
      return res.status(404).json({ error: '라운드를 찾을 수 없습니다.' });
    }

    // 스코어 저장
    await query(
      `INSERT INTO scores (user_id, beatmap_id, score, accuracy, max_combo)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, rounds[0].beatmap_id, score, accuracy, max_combo]
    );

    res.json({ message: '결과가 제출되었습니다.' });
  } catch (error) {
    console.error('Submit round result error:', error);
    res.status(500).json({ error: '결과 제출 중 오류가 발생했습니다.' });
  }
});

export default router;
