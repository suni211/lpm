import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { isAuthenticated, isAdmin } from '../middleware/auth';
import pool, { query } from '../database/db';

const router = express.Router();

// Multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cards/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다'));
    }
  },
});

// 선수 카드 이미지 업로드
router.post(
  '/cards/player/:cardId/image',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: '이미지 파일이 없습니다' });
      }

      const imagePath = `/uploads/cards/${req.file.filename}`;

      await query(
        'UPDATE player_cards SET card_image = ? WHERE id = ?',
        [imagePath, cardId]
      );

      res.json({ message: '이미지가 업로드되었습니다', imagePath });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ error: '이미지 업로드에 실패했습니다' });
    }
  }
);

// 감독 카드 이미지 업로드
router.post(
  '/cards/coach/:cardId/image',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: '이미지 파일이 없습니다' });
      }

      const imagePath = `/uploads/cards/${req.file.filename}`;

      await query(
        'UPDATE coach_cards SET coach_image = ? WHERE id = ?',
        [imagePath, cardId]
      );

      res.json({ message: '이미지가 업로드되었습니다', imagePath });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ error: '이미지 업로드에 실패했습니다' });
    }
  }
);

// 작전 카드 이미지 업로드
router.post(
  '/cards/tactic/:cardId/image',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: '이미지 파일이 없습니다' });
      }

      const imagePath = `/uploads/cards/${req.file.filename}`;

      await query(
        'UPDATE tactic_cards SET tactic_image = ? WHERE id = ?',
        [imagePath, cardId]
      );

      res.json({ message: '이미지가 업로드되었습니다', imagePath });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ error: '이미지 업로드에 실패했습니다' });
    }
  }
);

// 서포트 카드 이미지 업로드
router.post(
  '/cards/support/:cardId/image',
  isAuthenticated,
  isAdmin,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: '이미지 파일이 없습니다' });
      }

      const imagePath = `/uploads/cards/${req.file.filename}`;

      await query(
        'UPDATE support_cards SET support_image = ? WHERE id = ?',
        [imagePath, cardId]
      );

      res.json({ message: '이미지가 업로드되었습니다', imagePath });
    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      res.status(500).json({ error: '이미지 업로드에 실패했습니다' });
    }
  }
);

// 모든 카드 목록 조회 (ADMIN)
router.get('/cards', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    let sql = '';

    switch (type) {
      case 'player':
        sql = 'SELECT * FROM player_cards ORDER BY power DESC';
        break;
      case 'coach':
        sql = 'SELECT * FROM coach_cards ORDER BY power DESC';
        break;
      case 'tactic':
        sql = 'SELECT * FROM tactic_cards ORDER BY created_at DESC';
        break;
      case 'support':
        sql = 'SELECT * FROM support_cards ORDER BY created_at DESC';
        break;
      default:
        return res.status(400).json({ error: '유효하지 않은 카드 타입입니다' });
    }

    const result = await query(sql);

    res.json({ cards: result });
  } catch (error) {
    console.error('카드 목록 조회 오류:', error);
    res.status(500).json({ error: '카드 목록 조회에 실패했습니다' });
  }
});

// 선수 카드 생성 (ADMIN)
router.post('/cards/player', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      card_name,
      card_image,
      position,
      cost,
      mental,
      team_fight,
      cs_ability,
      vision,
      judgment,
      laning,
      rarity,
    } = req.body;

    const [result]: any = await pool.query(
      `INSERT INTO player_cards
       (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [card_name, card_image || null, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity]
    );

    const newCard = await query('SELECT * FROM player_cards WHERE id = ?', [result.insertId]);

    res.json({ message: '선수 카드가 생성되었습니다', card: newCard[0] });
  } catch (error) {
    console.error('선수 카드 생성 오류:', error);
    res.status(500).json({ error: '선수 카드 생성에 실패했습니다' });
  }
});

// 감독 카드 생성 (ADMIN)
router.post('/cards/coach', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { coach_name, coach_image, command, ban_pick, meta, cold, warm, rarity } = req.body;

    const [result]: any = await pool.query(
      `INSERT INTO coach_cards
       (coach_name, coach_image, command, ban_pick, meta, cold, warm, rarity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [coach_name, coach_image || null, command, ban_pick, meta, cold, warm, rarity]
    );

    const newCard = await query('SELECT * FROM coach_cards WHERE id = ?', [result.insertId]);

    res.json({ message: '감독 카드가 생성되었습니다', card: newCard[0] });
  } catch (error) {
    console.error('감독 카드 생성 오류:', error);
    res.status(500).json({ error: '감독 카드 생성에 실패했습니다' });
  }
});

// 작전 카드 생성 (ADMIN)
router.post('/cards/tactic', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { tactic_name, tactic_image, position, effect_description, effect_type, effect_value, rarity } =
      req.body;

    const [result]: any = await pool.query(
      `INSERT INTO tactic_cards
       (tactic_name, tactic_image, position, effect_description, effect_type, effect_value, rarity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tactic_name, tactic_image || null, position, effect_description, effect_type, effect_value, rarity]
    );

    const newCard = await query('SELECT * FROM tactic_cards WHERE id = ?', [result.insertId]);

    res.json({ message: '작전 카드가 생성되었습니다', card: newCard[0] });
  } catch (error) {
    console.error('작전 카드 생성 오류:', error);
    res.status(500).json({ error: '작전 카드 생성에 실패했습니다' });
  }
});

// 서포트 카드 생성 (ADMIN)
router.post('/cards/support', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { support_name, support_image, effect_description, effect_type, effect_value, rarity } = req.body;

    const [result]: any = await pool.query(
      `INSERT INTO support_cards
       (support_name, support_image, effect_description, effect_type, effect_value, rarity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [support_name, support_image || null, effect_description, effect_type, effect_value, rarity]
    );

    const newCard = await query('SELECT * FROM support_cards WHERE id = ?', [result.insertId]);

    res.json({ message: '서포트 카드가 생성되었습니다', card: newCard[0] });
  } catch (error) {
    console.error('서포트 카드 생성 오류:', error);
    res.status(500).json({ error: '서포트 카드 생성에 실패했습니다' });
  }
});

export default router;
