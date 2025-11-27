import { Request, Response } from 'express';
import { query } from '../utils/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = file.fieldname === 'audio' ? 'uploads/audio' : 'uploads/covers';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audio') {
      if (!file.mimetype.startsWith('audio/')) {
        return cb(new Error('오디오 파일만 업로드 가능합니다.'));
      }
    } else if (file.fieldname === 'cover') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('이미지 파일만 업로드 가능합니다.'));
      }
    }
    cb(null, true);
  }
});

// 곡 생성
export const createSong = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { title, artist, duration, bpm } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!title || !artist || !duration || !files?.audio) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    const audioFile = files.audio[0].path;
    const coverImage = files.cover ? files.cover[0].path : null;

    const result = await query(
      `INSERT INTO songs (title, artist, audio_file, cover_image, duration, bpm, creator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, artist, audioFile, coverImage, duration, bpm || null, userId]
    ) as any;

    res.status(201).json({
      message: '곡이 추가되었습니다.',
      song_id: result.insertId
    });
  } catch (error) {
    console.error('Create song error:', error);
    res.status(500).json({ error: '곡 추가 중 오류가 발생했습니다.' });
  }
};

// 곡 목록 조회
export const getSongs = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = 'SELECT * FROM songs';
    let params: any[] = [];

    if (search) {
      sql += ' WHERE title LIKE ? OR artist LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const songs = await query(sql, params) as any[];

    res.json({ songs });
  } catch (error) {
    console.error('Get songs error:', error);
    res.status(500).json({ error: '곡 조회 중 오류가 발생했습니다.' });
  }
};

// 곡 상세 조회
export const getSong = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const songs = await query(
      'SELECT * FROM songs WHERE id = ?',
      [id]
    ) as any[];

    if (songs.length === 0) {
      return res.status(404).json({ error: '곡을 찾을 수 없습니다.' });
    }

    res.json({ song: songs[0] });
  } catch (error) {
    console.error('Get song error:', error);
    res.status(500).json({ error: '곡 조회 중 오류가 발생했습니다.' });
  }
};

// 곡 수정
export const updateSong = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { title, artist, bpm } = req.body;

    const songs = await query(
      'SELECT creator_id FROM songs WHERE id = ?',
      [id]
    ) as any[];

    if (songs.length === 0) {
      return res.status(404).json({ error: '곡을 찾을 수 없습니다.' });
    }

    if (songs[0].creator_id !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    await query(
      'UPDATE songs SET title = ?, artist = ?, bpm = ? WHERE id = ?',
      [title, artist, bpm, id]
    );

    res.json({ message: '곡 정보가 수정되었습니다.' });
  } catch (error) {
    console.error('Update song error:', error);
    res.status(500).json({ error: '곡 수정 중 오류가 발생했습니다.' });
  }
};

// 곡 삭제
export const deleteSong = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;

    // 관리자 권한 확인
    const users = await query(
      'SELECT is_admin FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0 || !users[0].is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const songs = await query(
      'SELECT audio_file, cover_image FROM songs WHERE id = ?',
      [id]
    ) as any[];

    if (songs.length === 0) {
      return res.status(404).json({ error: '곡을 찾을 수 없습니다.' });
    }

    // 파일 삭제
    const song = songs[0];
    if (fs.existsSync(song.audio_file)) {
      fs.unlinkSync(song.audio_file);
    }
    if (song.cover_image && fs.existsSync(song.cover_image)) {
      fs.unlinkSync(song.cover_image);
    }

    await query('DELETE FROM songs WHERE id = ?', [id]);

    res.json({ message: '곡이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete song error:', error);
    res.status(500).json({ error: '곡 삭제 중 오류가 발생했습니다.' });
  }
};
