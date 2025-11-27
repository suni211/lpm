import { Request, Response } from 'express';
import { query } from '../utils/database';
import { calculateAccuracy } from '../services/gameEngine';

// 스코어 제출
export const submitScore = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const {
      beatmap_id,
      score,
      max_combo,
      count_yas,
      count_oh,
      count_ah,
      count_fuck,
      mods
    } = req.body;

    if (!beatmap_id || score === undefined) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 정확도 계산
    const accuracy = calculateAccuracy(count_yas, count_oh, count_ah, count_fuck);

    // 스코어 저장
    const result = await query(
      `INSERT INTO scores
       (user_id, beatmap_id, score, accuracy, max_combo, count_yas, count_oh, count_ah, count_fuck, mods)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, beatmap_id, score, accuracy, max_combo, count_yas, count_oh, count_ah, count_fuck, mods || null]
    ) as any;

    // 유저 통계 업데이트
    await query(
      `UPDATE users
       SET total_plays = total_plays + 1,
           total_score = total_score + ?
       WHERE id = ?`,
      [score, userId]
    );

    // 일일 통계 업데이트
    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO user_statistics (user_id, date, plays_count, total_score, avg_accuracy, peak_combo)
       VALUES (?, ?, 1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         plays_count = plays_count + 1,
         total_score = total_score + ?,
         avg_accuracy = (avg_accuracy * plays_count + ?) / (plays_count + 1),
         peak_combo = GREATEST(peak_combo, ?)`,
      [userId, today, score, accuracy, max_combo, score, accuracy, max_combo]
    );

    res.status(201).json({
      message: '스코어가 제출되었습니다.',
      score_id: result.insertId,
      accuracy
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: '스코어 제출 중 오류가 발생했습니다.' });
  }
};

// 리더보드 조회
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const { beatmap_id, limit = 50 } = req.query;

    let sql = `
      SELECT s.*, u.username, u.display_name, u.tier
      FROM scores s
      JOIN users u ON s.user_id = u.id
    `;
    let params: any[] = [];

    if (beatmap_id) {
      sql += ' WHERE s.beatmap_id = ?';
      params.push(beatmap_id);
    }

    sql += ' ORDER BY s.score DESC, s.accuracy DESC LIMIT ?';
    params.push(Number(limit));

    const scores = await query(sql, params) as any[];

    res.json({ leaderboard: scores });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: '리더보드 조회 중 오류가 발생했습니다.' });
  }
};

// 개인 베스트 스코어
export const getPersonalBest = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { beatmap_id } = req.params;

    const scores = await query(
      `SELECT * FROM scores
       WHERE user_id = ? AND beatmap_id = ?
       ORDER BY score DESC, accuracy DESC
       LIMIT 1`,
      [userId, beatmap_id]
    ) as any[];

    res.json({ score: scores[0] || null });
  } catch (error) {
    console.error('Get personal best error:', error);
    res.status(500).json({ error: '스코어 조회 중 오류가 발생했습니다.' });
  }
};

// 유저 최근 플레이
export const getRecentPlays = async (req: Request, res: Response) => {
  try {
    const { user_id, limit = 20 } = req.query;
    const targetUserId = user_id || (req.session as any).userId;

    const scores = await query(
      `SELECT s.*, b.difficulty, b.key_count, sg.title, sg.artist
       FROM scores s
       JOIN beatmaps b ON s.beatmap_id = b.id
       JOIN songs sg ON b.song_id = sg.id
       WHERE s.user_id = ?
       ORDER BY s.play_date DESC
       LIMIT ?`,
      [targetUserId, Number(limit)]
    ) as any[];

    res.json({ scores });
  } catch (error) {
    console.error('Get recent plays error:', error);
    res.status(500).json({ error: '최근 플레이 조회 중 오류가 발생했습니다.' });
  }
};

// 글로벌 랭킹
export const getGlobalRanking = async (req: Request, res: Response) => {
  try {
    const { tier, limit = 100 } = req.query;

    let sql = `
      SELECT id, username, display_name, tier, rating, total_plays, total_score
      FROM users
    `;
    let params: any[] = [];

    if (tier) {
      sql += ' WHERE tier = ?';
      params.push(tier);
    }

    sql += ' ORDER BY rating DESC, total_score DESC LIMIT ?';
    params.push(Number(limit));

    const rankings = await query(sql, params) as any[];

    res.json({ rankings });
  } catch (error) {
    console.error('Get global ranking error:', error);
    res.status(500).json({ error: '랭킹 조회 중 오류가 발생했습니다.' });
  }
};
