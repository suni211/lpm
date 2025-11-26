import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 모든 코인 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status = 'ACTIVE' } = req.query;

    let sql = 'SELECT * FROM coins';
    const params: any[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY market_cap DESC';

    const coins = await query(sql, params);

    res.json({ coins });
  } catch (error) {
    console.error('코인 목록 조회 오류:', error);
    res.status(500).json({ error: '코인 목록 조회 실패' });
  }
});

// 코인 상세 조회 (심볼로)
router.get('/symbol/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    const coins = await query('SELECT * FROM coins WHERE symbol = ?', [symbol.toUpperCase()]);

    if (coins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }

    res.json({ coin: coins[0] });
  } catch (error) {
    console.error('코인 조회 오류:', error);
    res.status(500).json({ error: '코인 조회 실패' });
  }
});

// 코인 시세 정보 (차트용)
router.get('/:coin_id/price', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;

    const coins = await query('SELECT * FROM coins WHERE id = ?', [coin_id]);

    if (coins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }

    const coin = coins[0];

    res.json({
      symbol: coin.symbol,
      current_price: coin.current_price,
      price_change_24h: coin.price_change_24h,
      volume_24h: coin.volume_24h,
      market_cap: coin.market_cap,
      updated_at: coin.updated_at,
    });
  } catch (error) {
    console.error('시세 조회 오류:', error);
    res.status(500).json({ error: '시세 조회 실패' });
  }
});

// 최근 거래 내역 (공개)
router.get('/:coin_id/trades/recent', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;
    const { limit = 50 } = req.query;

    const trades = await query(
      `SELECT t.id, t.price, t.quantity, t.total_amount, t.created_at,
              bw.minecraft_username as buyer_username,
              sw.minecraft_username as seller_username
       FROM trades t
       JOIN user_wallets bw ON t.buyer_wallet_id = bw.id
       JOIN user_wallets sw ON t.seller_wallet_id = sw.id
       WHERE t.coin_id = ?
       ORDER BY t.created_at DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    res.json({ trades });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    res.status(500).json({ error: '거래 내역 조회 실패' });
  }
});

// 캔들스틱 데이터 조회
router.get('/:coin_id/candles/:interval', async (req: Request, res: Response) => {
  try {
    const { coin_id, interval } = req.params;
    const { limit = 100 } = req.query;

    let tableName = '';
    if (interval === '1m') {
      tableName = 'candles_1m';
    } else if (interval === '1h') {
      tableName = 'candles_1h';
    } else if (interval === '1d') {
      tableName = 'candles_1d';
    } else {
      return res.status(400).json({ error: '유효하지 않은 interval (1m, 1h, 1d만 지원)' });
    }

    const candles = await query(
      `SELECT * FROM ${tableName}
       WHERE coin_id = ?
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    res.json({ candles: candles.reverse() });
  } catch (error) {
    console.error('캔들 데이터 조회 오류:', error);
    res.status(500).json({ error: '캔들 데이터 조회 실패' });
  }
});

// 코인 생성 (관리자)
router.post('/', isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      name,
      logo_url,
      description,
      circulating_supply,
      current_price,
    } = req.body;

    // 입력 검증
    if (!symbol || !name) {
      return res.status(400).json({ error: '심볼과 이름은 필수입니다' });
    }

    if (!symbol.match(/^[A-Z0-9]{2,10}$/)) {
      return res.status(400).json({ error: '심볼은 2-10자의 영문 대문자와 숫자만 가능합니다' });
    }

    if (!circulating_supply || circulating_supply <= 0) {
      return res.status(400).json({ error: '유통량은 0보다 커야 합니다' });
    }

    if (!current_price || current_price <= 0) {
      return res.status(400).json({ error: '초기 가격은 0보다 커야 합니다' });
    }

    // 심볼 중복 확인
    const existing = await query('SELECT * FROM coins WHERE symbol = ?', [symbol.toUpperCase()]);

    if (existing.length > 0) {
      return res.status(400).json({ error: '이미 존재하는 코인 심볼입니다' });
    }

    const coinId = uuidv4();
    // initial_supply는 circulating_supply와 동일하게 설정, initial_price는 current_price와 동일하게 설정
    await query(
      `INSERT INTO coins
       (id, symbol, name, logo_url, description, initial_supply, circulating_supply, initial_price, current_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [
        coinId,
        symbol.toUpperCase(),
        name,
        logo_url || null,
        description || null,
        circulating_supply, // initial_supply = circulating_supply
        circulating_supply,
        current_price, // initial_price = current_price
        current_price,
      ]
    );

    const coins = await query('SELECT * FROM coins WHERE id = ?', [coinId]);

    res.json({
      success: true,
      coin: coins[0],
      message: '코인이 성공적으로 생성되었습니다',
    });
  } catch (error: any) {
    console.error('코인 생성 오류:', error);
    res.status(500).json({ error: '코인 생성 실패', message: error.message });
  }
});

// 코인 정보 수정 (관리자)
router.patch('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, logo_url, description, circulating_supply, current_price, status } = req.body;

    // 코인 존재 확인
    const existingCoins = await query('SELECT * FROM coins WHERE id = ?', [id]);
    if (existingCoins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined && name.trim() !== '') {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (logo_url !== undefined) {
      updates.push('logo_url = ?');
      params.push(logo_url || null);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }
    if (circulating_supply !== undefined) {
      if (circulating_supply <= 0) {
        return res.status(400).json({ error: '유통량은 0보다 커야 합니다' });
      }
      updates.push('circulating_supply = ?');
      params.push(circulating_supply);
    }
    if (current_price !== undefined) {
      if (current_price <= 0) {
        return res.status(400).json({ error: '가격은 0보다 커야 합니다' });
      }
      updates.push('current_price = ?');
      params.push(current_price);
    }
    if (status !== undefined) {
      if (!['ACTIVE', 'PAUSED', 'DELISTED'].includes(status)) {
        return res.status(400).json({ error: '유효하지 않은 상태입니다 (ACTIVE, PAUSED, DELISTED)' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (req.body.min_volatility !== undefined) {
      const minVol = parseFloat(req.body.min_volatility);
      if (isNaN(minVol) || minVol < 0 || minVol > 1) {
        return res.status(400).json({ error: '최소 변동성은 0~1 사이의 값이어야 합니다' });
      }
      updates.push('min_volatility = ?');
      params.push(minVol);
    }
    if (req.body.max_volatility !== undefined) {
      const maxVol = parseFloat(req.body.max_volatility);
      if (isNaN(maxVol) || maxVol < 0 || maxVol > 1) {
        return res.status(400).json({ error: '최대 변동성은 0~1 사이의 값이어야 합니다' });
      }
      updates.push('max_volatility = ?');
      params.push(maxVol);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '업데이트할 필드가 없습니다' });
    }

    params.push(id);

    await query(`UPDATE coins SET ${updates.join(', ')} WHERE id = ?`, params);

    const coins = await query('SELECT * FROM coins WHERE id = ?', [id]);

    res.json({
      success: true,
      coin: coins[0],
      message: '코인이 성공적으로 수정되었습니다',
    });
  } catch (error: any) {
    console.error('코인 수정 오류:', error);
    res.status(500).json({ error: '코인 수정 실패', message: error.message });
  }
});

// 이미지 업로드 설정
const uploadDir = path.join(process.cwd(), 'public', 'images', 'coins');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp, svg)'));
    }
  },
});

// ICO 이미지 업로드 (관리자)
router.post('/upload-logo', isAdmin, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일을 업로드해주세요' });
    }

    const logoUrl = `/images/coins/${req.file.filename}`;

    res.json({
      success: true,
      logo_url: logoUrl,
      message: '이미지가 업로드되었습니다',
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 실패' });
  }
});

export default router;
