import express from 'express';
import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { query } from '../database/connection';
import { requireAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import '../types'; // Import session type declarations

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsBase = path.join(__dirname, '../../uploads');

    if (file.fieldname === 'audio') {
      cb(null, path.join(uploadsBase, 'audio'));
    } else if (file.fieldname === 'cover') {
      cb(null, path.join(uploadsBase, 'covers'));
    } else if (file.fieldname === 'bga') {
      cb(null, path.join(uploadsBase, 'bga'));
    } else {
      cb(null, uploadsBase);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (!file.mimetype.startsWith('audio/')) {
        return cb(new Error('Only audio files allowed'));
      }
    } else if (file.fieldname === 'cover') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files allowed'));
      }
    } else if (file.fieldname === 'bga') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files allowed'));
      }
    }
    cb(null, true);
  }
});

// Admin 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admins: any = await query(
      'SELECT * FROM admins WHERE username = ?',
      [username]
    );

    if (!Array.isArray(admins) || admins.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = admins[0];

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await query('UPDATE admins SET last_login = NOW() WHERE id = ?', [admin.id]);

    req.session.adminId = admin.id;
    req.session.username = admin.username;

    console.log('✅ Admin login successful:', {
      adminId: admin.id,
      username: admin.username,
      sessionID: req.sessionID
    });

    res.json({
      message: 'Admin login successful',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Admin login failed' });
  }
});

// 노래 생성
router.post('/songs', requireAdmin, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'bga', maxCount: 1 }
]), async (req, res) => {
  try {
    const { title, artist, bpm, duration, previewStart, genre, description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!title || !artist || !bpm || !duration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!files.audio || files.audio.length === 0) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const songId = uuidv4();
    const audioPath = `/uploads/audio/${files.audio[0].filename}`;
    const coverPath = files.cover ? `/uploads/covers/${files.cover[0].filename}` : null;
    const bgaPath = files.bga ? `/uploads/bga/${files.bga[0].filename}` : null;

    await query(
      `INSERT INTO songs
       (id, title, artist, bpm, duration, audio_file_path, cover_image_url, bga_video_url, preview_start, genre, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [songId, title, artist, bpm, duration, audioPath, coverPath, bgaPath, previewStart || 0, genre, description]
    );

    res.json({ message: 'Song created successfully', songId });
  } catch (error) {
    console.error('Create song error:', error);
    res.status(500).json({ error: 'Failed to create song' });
  }
});

// 비트맵 생성
router.post('/beatmaps', requireAdmin, async (req, res) => {
  try {
    const { songId, difficultyName, difficultyLevel, keyCount, notesData, noteSpeed } = req.body;

    if (!songId || !difficultyName || !difficultyLevel || !keyCount || !notesData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate notes data
    if (!Array.isArray(notesData) || notesData.length === 0) {
      return res.status(400).json({ error: 'Notes data must be a non-empty array' });
    }

    const noteCount = notesData.length;
    const maxCombo = notesData.filter((note: any) => note.type === 'normal').length;

    const beatmapId = uuidv4();

    await query(
      `INSERT INTO beatmaps
       (id, song_id, difficulty_name, difficulty_level, key_count, note_count, max_combo, note_speed, notes_data, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        beatmapId,
        songId,
        difficultyName,
        difficultyLevel,
        keyCount,
        noteCount,
        maxCombo,
        noteSpeed || 5.0,
        JSON.stringify(notesData),
        req.session.adminId
      ]
    );

    res.json({ message: 'Beatmap created successfully', beatmapId });
  } catch (error) {
    console.error('Create beatmap error:', error);
    res.status(500).json({ error: 'Failed to create beatmap' });
  }
});

// 비트맵 수정
router.put('/beatmaps/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { difficultyName, difficultyLevel, notesData, noteSpeed, status } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (difficultyName) {
      updates.push('difficulty_name = ?');
      values.push(difficultyName);
    }
    if (difficultyLevel) {
      updates.push('difficulty_level = ?');
      values.push(difficultyLevel);
    }
    if (notesData) {
      const noteCount = notesData.length;
      const maxCombo = notesData.filter((note: any) => note.type === 'normal').length;
      updates.push('notes_data = ?, note_count = ?, max_combo = ?');
      values.push(JSON.stringify(notesData), noteCount, maxCombo);
    }
    if (noteSpeed) {
      updates.push('note_speed = ?');
      values.push(noteSpeed);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    await query(
      `UPDATE beatmaps SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Beatmap updated successfully' });
  } catch (error) {
    console.error('Update beatmap error:', error);
    res.status(500).json({ error: 'Failed to update beatmap' });
  }
});

// 모든 노래 목록 (관리자용 - 숨김 포함)
router.get('/songs', requireAdmin, async (req, res) => {
  try {
    const songs: any = await query(
      `SELECT s.*, COUNT(DISTINCT b.id) as beatmap_count
       FROM songs s
       LEFT JOIN beatmaps b ON s.id = b.song_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    res.json(songs || []);
  } catch (error) {
    console.error('Get all songs error:', error);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// 모든 비트맵 목록 (관리자용)
router.get('/beatmaps', requireAdmin, async (req, res) => {
  try {
    const beatmaps: any = await query(
      `SELECT b.*, s.title as song_title, s.artist as song_artist
       FROM beatmaps b
       JOIN songs s ON b.song_id = s.id
       ORDER BY s.title ASC, b.key_count ASC, b.difficulty_level ASC`
    );

    res.json(beatmaps || []);
  } catch (error) {
    console.error('Get all beatmaps error:', error);
    res.status(500).json({ error: 'Failed to get beatmaps' });
  }
});

// 노래 삭제
router.delete('/songs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM songs WHERE id = ?', [id]);

    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// 비트맵 삭제
router.delete('/beatmaps/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM beatmaps WHERE id = ?', [id]);

    res.json({ message: 'Beatmap deleted successfully' });
  } catch (error) {
    console.error('Delete beatmap error:', error);
    res.status(500).json({ error: 'Failed to delete beatmap' });
  }
});

// 통계 조회
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats: any = {};

    const userCount: any = await query('SELECT COUNT(*) as count FROM users WHERE status = \'ACTIVE\'');
    stats.totalUsers = userCount[0]?.count || 0;

    const songCount: any = await query('SELECT COUNT(*) as count FROM songs WHERE status = \'ACTIVE\'');
    stats.totalSongs = songCount[0]?.count || 0;

    const beatmapCount: any = await query('SELECT COUNT(*) as count FROM beatmaps WHERE status = \'ACTIVE\'');
    stats.totalBeatmaps = beatmapCount[0]?.count || 0;

    const playCount: any = await query('SELECT COUNT(*) as count FROM play_records');
    stats.totalPlays = playCount[0]?.count || 0;

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
