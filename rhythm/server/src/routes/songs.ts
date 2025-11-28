import express from 'express';
import { query } from '../database/connection';

const router = express.Router();

// 모든 노래 목록 가져오기
router.get('/', async (req, res) => {
  try {
    const songs: any = await query(
      `SELECT s.*,
       COUNT(DISTINCT b.id) as beatmap_count
       FROM songs s
       LEFT JOIN beatmaps b ON s.id = b.song_id AND b.status = 'ACTIVE'
       WHERE s.status = 'ACTIVE'
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    res.json(songs || []);
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// 특정 노래 상세 정보
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const songs: any = await query(
      'SELECT * FROM songs WHERE id = ?',
      [id]
    );

    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Get beatmaps for this song
    const beatmaps: any = await query(
      `SELECT id, difficulty_name, difficulty_level, key_count, note_count, max_combo, status
       FROM beatmaps
       WHERE song_id = ? AND status = 'ACTIVE'
       ORDER BY difficulty_level ASC`,
      [id]
    );

    res.json({
      ...songs[0],
      beatmaps: beatmaps || []
    });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: 'Failed to get song' });
  }
});

// 노래 검색
router.get('/search/:term', async (req, res) => {
  try {
    const { term } = req.params;

    const songs: any = await query(
      `SELECT s.*, COUNT(DISTINCT b.id) as beatmap_count
       FROM songs s
       LEFT JOIN beatmaps b ON s.id = b.song_id AND b.status = 'ACTIVE'
       WHERE s.status = 'ACTIVE'
       AND (s.title LIKE ? OR s.artist LIKE ? OR s.genre LIKE ?)
       GROUP BY s.id
       ORDER BY s.title ASC`,
      [`%${term}%`, `%${term}%`, `%${term}%`]
    );

    res.json(songs || []);
  } catch (error) {
    console.error('Search songs error:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

export default router;
