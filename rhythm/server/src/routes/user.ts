import express from 'express';
import { query } from '../database/connection';
import { requireAuth } from '../middleware/auth';
import '../types'; // Import session type declarations

const router = express.Router();

// 사용자 프로필 조회
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const users: any = await query(
      `SELECT
         u.id,
         u.username,
         u.display_name,
         u.avatar_url,
         u.level,
         u.experience,
         u.total_score,
         u.total_plays,
         u.created_at,
         COUNT(DISTINCT bs.id) as beatmap_clears,
         SUM(bs.is_full_combo) as full_combo_count,
         SUM(bs.is_all_perfect) as all_perfect_count,
         AVG(bs.accuracy) as average_accuracy
       FROM users u
       LEFT JOIN best_scores bs ON u.id = bs.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [userId]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// 사용자 최고 기록 목록
router.get('/best-scores/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const scores: any = await query(
      `SELECT
         bs.*,
         b.difficulty_name,
         b.difficulty_level,
         b.key_count,
         s.title as song_title,
         s.artist as song_artist,
         s.cover_image_url
       FROM best_scores bs
       JOIN beatmaps b ON bs.beatmap_id = b.id
       JOIN songs s ON b.song_id = s.id
       WHERE bs.user_id = ?
       ORDER BY bs.score DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(scores || []);
  } catch (error) {
    console.error('Get best scores error:', error);
    res.status(500).json({ error: 'Failed to get best scores' });
  }
});

// 사용자 최근 플레이 기록
router.get('/recent-plays/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const plays: any = await query(
      `SELECT
         pr.*,
         b.difficulty_name,
         b.difficulty_level,
         b.key_count,
         s.title as song_title,
         s.artist as song_artist,
         s.cover_image_url
       FROM play_records pr
       JOIN beatmaps b ON pr.beatmap_id = b.id
       JOIN songs s ON b.song_id = s.id
       WHERE pr.user_id = ?
       ORDER BY pr.play_date DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json(plays || []);
  } catch (error) {
    console.error('Get recent plays error:', error);
    res.status(500).json({ error: 'Failed to get recent plays' });
  }
});

// 사용자 설정 조회
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const settings: any = await query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(settings) || settings.length === 0) {
      // Create default settings
      await query(
        'INSERT INTO user_settings (user_id) VALUES (?)',
        [userId]
      );
      return res.json({
        user_id: userId,
        default_note_speed: 5.0,
        key_bindings: null,
        visual_settings: null,
        audio_settings: null
      });
    }

    const setting = settings[0];

    // Parse JSON fields
    if (typeof setting.key_bindings === 'string') {
      setting.key_bindings = JSON.parse(setting.key_bindings);
    }
    if (typeof setting.visual_settings === 'string') {
      setting.visual_settings = JSON.parse(setting.visual_settings);
    }
    if (typeof setting.audio_settings === 'string') {
      setting.audio_settings = JSON.parse(setting.audio_settings);
    }

    res.json(setting);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// 사용자 설정 업데이트
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { defaultNoteSpeed, keyBindings, visualSettings, audioSettings } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (defaultNoteSpeed !== undefined) {
      updates.push('default_note_speed = ?');
      values.push(defaultNoteSpeed);
    }
    if (keyBindings !== undefined) {
      updates.push('key_bindings = ?');
      values.push(JSON.stringify(keyBindings));
    }
    if (visualSettings !== undefined) {
      updates.push('visual_settings = ?');
      values.push(JSON.stringify(visualSettings));
    }
    if (audioSettings !== undefined) {
      updates.push('audio_settings = ?');
      values.push(JSON.stringify(audioSettings));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    await query(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
