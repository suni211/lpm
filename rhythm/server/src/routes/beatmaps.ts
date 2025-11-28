import express from 'express';
import { query } from '../database/connection';

const router = express.Router();

// 특정 비트맵 정보 (노트 데이터 포함)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const beatmaps: any = await query(
      `SELECT b.*, s.title, s.artist, s.audio_file_path, s.bga_video_url, s.bpm
       FROM beatmaps b
       JOIN songs s ON b.song_id = s.id
       WHERE b.id = ? AND b.status = 'ACTIVE'`,
      [id]
    );

    if (!Array.isArray(beatmaps) || beatmaps.length === 0) {
      return res.status(404).json({ error: 'Beatmap not found' });
    }

    const beatmap = beatmaps[0];

    // Parse notes_data JSON
    if (typeof beatmap.notes_data === 'string') {
      beatmap.notes_data = JSON.parse(beatmap.notes_data);
    }

    res.json(beatmap);
  } catch (error) {
    console.error('Get beatmap error:', error);
    res.status(500).json({ error: 'Failed to get beatmap' });
  }
});

// 곡의 모든 비트맵 가져오기
router.get('/song/:songId', async (req, res) => {
  try {
    const { songId } = req.params;

    const beatmaps: any = await query(
      `SELECT id, difficulty_name, difficulty_level, key_count, note_count, max_combo, note_speed, status
       FROM beatmaps
       WHERE song_id = ? AND status = 'ACTIVE'
       ORDER BY key_count ASC, difficulty_level ASC`,
      [songId]
    );

    res.json(beatmaps || []);
  } catch (error) {
    console.error('Get beatmaps error:', error);
    res.status(500).json({ error: 'Failed to get beatmaps' });
  }
});

export default router;
