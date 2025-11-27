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
    const { status } = req.query;

    let sql = 'SELECT * FROM coins';
    const params: any[] = [];

    // status가 명시적으로 전달된 경우에만 필터링 (없으면 모든 코인 조회)
    if (status && status !== 'ALL') {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY market_cap DESC';

    const coins = await query(sql, params);

    res.json({ coins: coins || [] });
  } catch (error) {
    console.error('코인 목록 조회 오류:', error);
    res.status(500).json({ error: '코인 목록 조회 실패' });
  }
});

// 탑 5 순위 조회 (상승/하락/액티브)
router.get('/rankings/top5', async (req: Request, res: Response) => {
  try {
    const coins = await query(
      `SELECT id, symbol, name, logo_url, current_price, price_change_24h, volume_24h, market_cap
       FROM coins
       WHERE status = 'ACTIVE'
       ORDER BY market_cap DESC`
    );

    // 가격 변동률 파싱
    const coinsWithParsed = coins.map((coin: any) => ({
      ...coin,
      price_change_24h: typeof coin.price_change_24h === 'string' 
        ? parseFloat(coin.price_change_24h) 
        : (coin.price_change_24h || 0),
      volume_24h: typeof coin.volume_24h === 'string' 
        ? parseFloat(coin.volume_24h) 
        : (coin.volume_24h || 0),
      current_price: typeof coin.current_price === 'string' 
        ? parseFloat(coin.current_price) 
        : (coin.current_price || 0),
    }));

    // 상승률 상위 5개 (price_change_24h 내림차순)
    const topGainers = [...coinsWithParsed]
      .filter((coin) => coin.price_change_24h > 0)
      .sort((a, b) => b.price_change_24h - a.price_change_24h)
      .slice(0, 5);

    // 하락률 상위 5개 (price_change_24h 오름차순, 음수만)
    const topLosers = [...coinsWithParsed]
      .filter((coin) => coin.price_change_24h < 0)
      .sort((a, b) => a.price_change_24h - b.price_change_24h)
      .slice(0, 5);

    // 거래량 상위 5개 (volume_24h 내림차순)
    const topActive = [...coinsWithParsed]
      .filter((coin) => coin.volume_24h > 0)
      .sort((a, b) => b.volume_24h - a.volume_24h)
      .slice(0, 5);

    res.json({
      topGainers,
      topLosers,
      topActive,
    });
  } catch (error) {
    console.error('순위 조회 오류:', error);
    res.status(500).json({ error: '순위 조회 실패' });
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

// 코인 상세 조회 (ID로)
router.get('/:coin_id', async (req: Request, res: Response) => {
  try {
    const { coin_id } = req.params;

    const coins = await query('SELECT * FROM coins WHERE id = ?', [coin_id]);

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

    // 최신 캔들부터 가져오기 (DESC), 프론트엔드에서 reverse
    const candles = await query(
      `SELECT
         id, coin_id, open_time, close_time,
         open_price, high_price, low_price, close_price,
         volume, trade_count
       FROM ${tableName}
       WHERE coin_id = ?
         AND open_price IS NOT NULL
         AND high_price IS NOT NULL
         AND low_price IS NOT NULL
         AND close_price IS NOT NULL
         AND open_time IS NOT NULL
       ORDER BY open_time DESC
       LIMIT ?`,
      [coin_id, Number(limit)]
    );

    // 추가 필터링: null 값이 있는 캔들 제거 및 타임스탬프 검증
    const validCandles = candles
      .filter((candle: any) => {
        // 기본 null 체크
        if (
          candle.open_price == null ||
          candle.high_price == null ||
          candle.low_price == null ||
          candle.close_price == null ||
          candle.open_time == null
        ) {
          return false;
        }

        // 가격 유효성 검증
        const openPrice = parseFloat(candle.open_price);
        const highPrice = parseFloat(candle.high_price);
        const lowPrice = parseFloat(candle.low_price);
        const closePrice = parseFloat(candle.close_price);

        if (
          isNaN(openPrice) || isNaN(highPrice) || isNaN(lowPrice) || isNaN(closePrice) ||
          openPrice <= 0 || highPrice <= 0 || lowPrice <= 0 || closePrice <= 0
        ) {
          return false;
        }

        // 타임스탬프 유효성 검증
        try {
          const openTime = new Date(candle.open_time);
          const timeValue = openTime.getTime();

          // 유효한 날짜인지 확인 (2020년 ~ 2030년 사이)
          if (isNaN(timeValue) || !isFinite(timeValue)) {
            console.warn('Invalid timestamp in database:', candle.open_time);
            return false;
          }

          const minTimestamp = new Date('2020-01-01').getTime();
          const maxTimestamp = new Date('2030-12-31').getTime();

          if (timeValue < minTimestamp || timeValue > maxTimestamp) {
            console.warn('Timestamp out of valid range:', {
              open_time: candle.open_time,
              timestamp: timeValue,
              date: openTime.toISOString()
            });
            return false;
          }
        } catch (error) {
          console.warn('Error parsing timestamp:', candle.open_time, error);
          return false;
        }

        return true;
      })
      .map((candle: any) => {
        // 타임스탬프를 ISO 문자열로 변환
        const openTime = new Date(candle.open_time);
        const closeTime = new Date(candle.close_time);

        return {
          ...candle,
          open_time: openTime.toISOString(),
          close_time: closeTime.toISOString(),
        };
      });

    // 프론트엔드에서 정렬하므로 역순으로 전송 (오래된 순 → 최신 순)
    res.json({ candles: validCandles.reverse() });
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
      min_volatility,
      max_volatility,
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

    // 변동성 검증
    if (min_volatility !== undefined) {
      const minVol = parseFloat(min_volatility);
      if (isNaN(minVol) || minVol < 0.00001 || minVol > 0.00999) {
        return res.status(400).json({ error: '최소 변동성은 0.00001~0.00999 사이의 값이어야 합니다 (0.001%~0.999%)' });
      }
    }

    if (max_volatility !== undefined) {
      const maxVol = parseFloat(max_volatility);
      if (isNaN(maxVol) || maxVol < 0.00001 || maxVol > 0.00999) {
        return res.status(400).json({ error: '최대 변동성은 0.00001~0.00999 사이의 값이어야 합니다 (0.001%~0.999%)' });
      }
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
       (id, symbol, name, logo_url, description, initial_supply, circulating_supply, initial_price, current_price, min_volatility, max_volatility, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
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
        min_volatility || null,
        max_volatility || null,
      ]
    );

    const coins = await query('SELECT * FROM coins WHERE id = ?', [coinId]);
    const coin = coins[0];

    // 초기 유동성 공급: AI 봇 지갑에 코인 배포 및 초기 매도 주문 생성
    try {
      // AI 봇 지갑 조회 또는 생성
      let aiWallets = await query('SELECT * FROM user_wallets WHERE minecraft_username = "AI_BOT"');
      let aiWallet;
      
      if (aiWallets.length === 0) {
        const aiWalletId = uuidv4();
        await query(
          `INSERT INTO user_wallets (id, minecraft_username, minecraft_uuid, gold_balance, wallet_address)
           VALUES (?, 'AI_BOT', 'AI_BOT_UUID', 999999999999, ?)`,
          [aiWalletId, `AI_BOT_${aiWalletId.substring(0, 8)}`]
        );
        aiWallets = await query('SELECT * FROM user_wallets WHERE id = ?', [aiWalletId]);
        aiWallet = aiWallets[0];
      } else {
        aiWallet = aiWallets[0];
      }

      // AI 봇 지갑에 전체 발행량 배포 (재고로 관리)
      // 매도 주문 생성하지 않음 - 유저가 구매할 때마다 AI 봇의 재고에서 직접 판매
      const totalSupply = parseFloat(circulating_supply);
      const totalSupplyPrecise = parseFloat(totalSupply.toFixed(8));

      // 코인 잔액 생성 또는 업데이트
      const existingBalances = await query(
        'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
        [aiWallet.id, coinId]
      );

      if (existingBalances.length > 0) {
        await query(
          'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
          [totalSupplyPrecise, aiWallet.id, coinId]
        );
      } else {
        await query(
          `INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount, average_buy_price)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), aiWallet.id, coinId, totalSupplyPrecise, current_price]
        );
      }

      console.log(`✅ ${symbol}: 전체 발행량 배포 완료 (${totalSupplyPrecise.toLocaleString()}개, 유저가 바로 구매 가능)`);
    } catch (error) {
      console.error(`⚠️ ${symbol}: 초기 유동성 공급 실패:`, error);
      // 유동성 공급 실패해도 코인 생성은 성공으로 처리
    }

    res.json({
      success: true,
      coin: coin,
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
    const { name, logo_url, description, current_price, status } = req.body;
    // circulating_supply는 업데이트 불가 (고정값)

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
    // circulating_supply는 업데이트 불가 (한번 설정되면 고정)
    // 유통량 변경 시도 시 에러 반환
    if (req.body.circulating_supply !== undefined) {
      return res.status(400).json({ error: '유통량은 생성 후 변경할 수 없습니다' });
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
      if (isNaN(minVol) || minVol < 0.00001 || minVol > 0.00999) {
        return res.status(400).json({ error: '최소 변동성은 0.00001~0.00999 사이의 값이어야 합니다 (0.001%~0.999%)' });
      }
      updates.push('min_volatility = ?');
      params.push(minVol);
    }
    if (req.body.max_volatility !== undefined) {
      const maxVol = parseFloat(req.body.max_volatility);
      if (isNaN(maxVol) || maxVol < 0.00001 || maxVol > 0.00999) {
        return res.status(400).json({ error: '최대 변동성은 0.00001~0.00999 사이의 값이어야 합니다 (0.001%~0.999%)' });
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

// 코인 삭제 (관리자) - DB에서 영구 삭제
router.delete('/:id', isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 코인 존재 확인
    const existingCoins = await query('SELECT * FROM coins WHERE id = ?', [id]);
    if (existingCoins.length === 0) {
      return res.status(404).json({ error: '코인을 찾을 수 없습니다' });
    }

    const coin = existingCoins[0];
    console.log(`🗑️ 코인 삭제 시작: ${coin.symbol} (${coin.name})`);

    // 1. 캔들 데이터 삭제
    try {
      await query('DELETE FROM candles_1m WHERE coin_id = ?', [id]);
      console.log('  ✓ 1분 캔들 데이터 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 1분 캔들 삭제 실패:', e);
    }

    try {
      await query('DELETE FROM candles_1h WHERE coin_id = ?', [id]);
      console.log('  ✓ 1시간 캔들 데이터 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 1시간 캔들 삭제 실패:', e);
    }

    try {
      await query('DELETE FROM candles_1d WHERE coin_id = ?', [id]);
      console.log('  ✓ 1일 캔들 데이터 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 1일 캔들 삭제 실패:', e);
    }

    // 2. 거래 내역 삭제
    try {
      await query('DELETE FROM trades WHERE coin_id = ?', [id]);
      console.log('  ✓ 거래 내역 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 거래 내역 삭제 실패:', e);
    }

    // 3. 주문 삭제
    try {
      await query('DELETE FROM orders WHERE coin_id = ?', [id]);
      console.log('  ✓ 주문 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 주문 삭제 실패:', e);
    }

    // 4. 코인 잔액 삭제
    try {
      await query('DELETE FROM user_coin_balances WHERE coin_id = ?', [id]);
      console.log('  ✓ 사용자 코인 잔액 삭제 완료');
    } catch (e) {
      console.warn('  ⚠️ 코인 잔액 삭제 실패:', e);
    }

    // 5. 코인 자체 삭제
    await query('DELETE FROM coins WHERE id = ?', [id]);
    console.log('  ✓ 코인 삭제 완료');

    // 6. 로고 이미지 파일 삭제 (선택사항)
    if (coin.logo_url) {
      try {
        const logoPath = path.join(process.cwd(), 'public', coin.logo_url);
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
          console.log('  ✓ 로고 이미지 파일 삭제 완료');
        }
      } catch (e) {
        console.warn('  ⚠️ 로고 이미지 파일 삭제 실패:', e);
      }
    }

    console.log(`✅ 코인 ${coin.symbol} 영구 삭제 완료`);

    res.json({
      success: true,
      message: `코인 ${coin.symbol}이(가) DB에서 영구 삭제되었습니다`,
      deleted_coin: {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
      },
    });
  } catch (error: any) {
    console.error('코인 삭제 오류:', error);
    res.status(500).json({ error: '코인 삭제 실패', message: error.message });
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
