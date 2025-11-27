import { Request, Response } from 'express';
import { query } from '../utils/database';
import { Beatmap, Note, Effect } from '../types';

// 비트맵 생성
export const createBeatmap = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { song_id, difficulty, key_count, note_data, effect_data, level } = req.body;

    if (!song_id || !difficulty || !key_count || !note_data) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    const notes: Note[] = JSON.parse(note_data);
    const effects: Effect[] = effect_data ? JSON.parse(effect_data) : [];

    // 총 노트 수 계산
    let totalNotes = 0;
    let maxCombo = 0;

    notes.forEach((note) => {
      if (note.type === 'LONG' && note.duration) {
        const longNoteCombo = Math.floor(note.duration / 10);
        totalNotes += longNoteCombo;
        maxCombo += longNoteCombo;
      } else {
        totalNotes += 1;
        maxCombo += 1;
      }
    });

    const result = await query(
      `INSERT INTO beatmaps
       (song_id, difficulty, key_count, note_data, effect_data, creator_id, total_notes, max_combo, level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [song_id, difficulty, key_count, note_data, effect_data || '[]', userId, totalNotes, maxCombo, level || 1]
    ) as any;

    res.status(201).json({
      message: '비트맵이 생성되었습니다.',
      beatmap_id: result.insertId
    });
  } catch (error) {
    console.error('Create beatmap error:', error);
    res.status(500).json({ error: '비트맵 생성 중 오류가 발생했습니다.' });
  }
};

// 비트맵 수정
export const updateBeatmap = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;
    const { note_data, effect_data, level } = req.body;

    // 권한 체크
    const beatmaps = await query(
      'SELECT creator_id FROM beatmaps WHERE id = ?',
      [id]
    ) as any[];

    if (beatmaps.length === 0) {
      return res.status(404).json({ error: '비트맵을 찾을 수 없습니다.' });
    }

    if (beatmaps[0].creator_id !== userId) {
      return res.status(403).json({ error: '수정 권한이 없습니다.' });
    }

    const notes: Note[] = JSON.parse(note_data);
    let totalNotes = 0;
    let maxCombo = 0;

    notes.forEach((note) => {
      if (note.type === 'LONG' && note.duration) {
        const longNoteCombo = Math.floor(note.duration / 10);
        totalNotes += longNoteCombo;
        maxCombo += longNoteCombo;
      } else {
        totalNotes += 1;
        maxCombo += 1;
      }
    });

    await query(
      `UPDATE beatmaps
       SET note_data = ?, effect_data = ?, total_notes = ?, max_combo = ?, level = ?
       WHERE id = ?`,
      [note_data, effect_data || '[]', totalNotes, maxCombo, level, id]
    );

    res.json({ message: '비트맵이 수정되었습니다.' });
  } catch (error) {
    console.error('Update beatmap error:', error);
    res.status(500).json({ error: '비트맵 수정 중 오류가 발생했습니다.' });
  }
};

// 비트맵 조회
export const getBeatmap = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const beatmaps = await query(
      `SELECT b.*, s.title, s.artist, s.audio_file, s.cover_image, s.duration, s.bpm
       FROM beatmaps b
       JOIN songs s ON b.song_id = s.id
       WHERE b.id = ?`,
      [id]
    ) as any[];

    if (beatmaps.length === 0) {
      return res.status(404).json({ error: '비트맵을 찾을 수 없습니다.' });
    }

    const beatmap = beatmaps[0];
    beatmap.note_data = JSON.parse(beatmap.note_data);
    beatmap.effect_data = JSON.parse(beatmap.effect_data || '[]');

    res.json({ beatmap });
  } catch (error) {
    console.error('Get beatmap error:', error);
    res.status(500).json({ error: '비트맵 조회 중 오류가 발생했습니다.' });
  }
};

// 곡별 비트맵 목록
export const getBeatmapsBySong = async (req: Request, res: Response) => {
  try {
    const { song_id } = req.params;

    const beatmaps = await query(
      `SELECT id, difficulty, key_count, level, total_notes, max_combo, is_ranked
       FROM beatmaps
       WHERE song_id = ?
       ORDER BY difficulty, key_count`,
      [song_id]
    ) as any[];

    res.json({ beatmaps });
  } catch (error) {
    console.error('Get beatmaps by song error:', error);
    res.status(500).json({ error: '비트맵 조회 중 오류가 발생했습니다.' });
  }
};

// 비트맵 삭제
export const deleteBeatmap = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { id } = req.params;

    const beatmaps = await query(
      'SELECT creator_id FROM beatmaps WHERE id = ?',
      [id]
    ) as any[];

    if (beatmaps.length === 0) {
      return res.status(404).json({ error: '비트맵을 찾을 수 없습니다.' });
    }

    if (beatmaps[0].creator_id !== userId) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await query('DELETE FROM beatmaps WHERE id = ?', [id]);

    res.json({ message: '비트맵이 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete beatmap error:', error);
    res.status(500).json({ error: '비트맵 삭제 중 오류가 발생했습니다.' });
  }
};
