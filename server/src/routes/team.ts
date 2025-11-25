import express, { Request, Response } from 'express';
import { query } from '../database/db';
import pool from '../database/db';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

// 팀 생성
router.post('/create', async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { teamName } = req.body;

  if (!teamName || teamName.trim().length === 0) {
    return res.status(400).json({ error: '팀 이름을 입력해주세요' });
  }

  if (teamName.length > 50) {
    return res.status(400).json({ error: '팀 이름은 50자 이내여야 합니다' });
  }

  try {
    const userId = req.user.id;

    // 이미 팀이 있는지 확인
    const existingTeam = await query(
      'SELECT * FROM teams WHERE user_id = ?',
      [userId]
    );

    if (existingTeam.length > 0) {
      return res.status(400).json({ error: '이미 팀이 존재합니다' });
    }

    // 팀 생성
    await query(
      'INSERT INTO teams (user_id, team_name) VALUES (?, ?)',
      [userId, teamName.trim()]
    );

    // 생성된 팀 조회
    const newTeam = await query(
      'SELECT * FROM teams WHERE user_id = ?',
      [userId]
    );

    const teamId = newTeam[0].id;

    // 기본 시설 생성
    await query(
      'INSERT INTO facilities (team_id) VALUES (?)',
      [teamId]
    );

    // 기본 로스터 생성
    await query(
      'INSERT INTO rosters (team_id) VALUES (?)',
      [teamId]
    );

    // 팀 기록 생성
    await query(
      'INSERT INTO team_records (team_id) VALUES (?)',
      [teamId]
    );

    res.json({
      message: '팀이 생성되었습니다',
      team: newTeam[0],
    });
  } catch (error) {
    console.error('팀 생성 에러:', error);
    res.status(500).json({ error: '팀 생성에 실패했습니다' });
  }
});

export default router;
