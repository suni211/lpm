import express, { Request, Response } from 'express';
import { query } from '../database/db';
import pool from '../database/db';
import { ResultSetHeader } from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 업로드 폴더 확인 및 생성
const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  }
});

// 팀 생성
router.post('/create', upload.single('logo'), async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { teamName, teamTag, color1, color2, color3 } = req.body;
  const logoFile = req.file;

  // 팀 이름 검증
  if (!teamName || teamName.trim().length === 0) {
    return res.status(400).json({ error: '팀 이름을 입력해주세요' });
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(teamName)) {
    return res.status(400).json({ error: '팀 이름은 영어와 숫자만 사용 가능합니다' });
  }

  if (teamName.length > 20) {
    return res.status(400).json({ error: '팀 이름은 20자 이내여야 합니다' });
  }

  // 팀 태그 검증
  if (!teamTag || teamTag.trim().length === 0) {
    return res.status(400).json({ error: '팀 태그를 입력해주세요' });
  }

  if (!/^[a-zA-Z0-9]+$/.test(teamTag)) {
    return res.status(400).json({ error: '팀 태그는 영어와 숫자만 사용 가능합니다' });
  }

  if (teamTag.length < 2 || teamTag.length > 4) {
    return res.status(400).json({ error: '팀 태그는 2~4글자여야 합니다' });
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

    // 팀 로고 URL 생성
    const logoUrl = logoFile ? `/uploads/logos/${logoFile.filename}` : null;

    // 팀 생성
    await query(
      `INSERT INTO teams (user_id, team_name, team_logo, slogan)
       VALUES (?, ?, ?, ?)`,
      [userId, teamName.trim(), teamTag, `${color1}|${color2}|${color3}`]
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
