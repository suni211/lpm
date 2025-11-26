import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 모든 특성 목록 조회
router.get('/list', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { position, category, rarity } = req.query;

    let sql = 'SELECT * FROM traits WHERE 1=1';
    const params: any[] = [];

    if (position) {
      sql += ' AND (position = ? OR position = "ALL")';
      params.push(position);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (rarity) {
      sql += ' AND rarity = ?';
      params.push(rarity);
    }

    sql += ' ORDER BY rarity DESC, trait_name ASC';

    const traits = await query(sql, params);
    res.json({ traits });
  } catch (error) {
    console.error('특성 목록 조회 오류:', error);
    res.status(500).json({ error: '특성 목록 조회에 실패했습니다' });
  }
});

// 특정 선수의 특성 조회
router.get('/player/:playerCardId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerCardId } = req.params;

    const playerTraits = await query(
      `SELECT pt.*, t.trait_name, t.trait_description, t.position, t.category,
              t.effect_type, t.effect_value, t.phase, t.is_positive, t.rarity
       FROM player_traits pt
       JOIN traits t ON pt.trait_id = t.id
       WHERE pt.player_card_id = ? AND pt.is_active = TRUE
       ORDER BY t.rarity DESC, t.trait_name ASC`,
      [playerCardId]
    );

    res.json({ traits: playerTraits });
  } catch (error) {
    console.error('선수 특성 조회 오류:', error);
    res.status(500).json({ error: '선수 특성 조회에 실패했습니다' });
  }
});

// 선수에게 특성 부여 (뽑기 시 자동 호출)
router.post('/assign', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    const { playerCardId, cost } = req.body;

    await client.beginTransaction();

    // 선수 카드 정보 조회
    const [playerResult]: any = await client.query(
      'SELECT * FROM player_cards WHERE id = ?',
      [playerCardId]
    );

    if (playerResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    const player = playerResult[0];

    // 코스트별 특성 획득 확률 조회
    const [rateResult]: any = await client.query(
      'SELECT acquisition_rate FROM trait_acquisition_rates WHERE cost = ?',
      [cost]
    );

    if (rateResult.length === 0) {
      await client.rollback();
      return res.status(400).json({ error: '잘못된 코스트 값입니다' });
    }

    const acquisitionRate = parseFloat(rateResult[0].acquisition_rate);
    const random = Math.random() * 100;

    // 특성 획득 여부 확인
    if (random > acquisitionRate) {
      await client.commit();
      return res.json({
        success: false,
        message: '특성을 획득하지 못했습니다',
        acquisitionRate,
      });
    }

    // 포지션에 맞는 긍정적 특성 랜덤 선택
    const [traitsResult]: any = await client.query(
      `SELECT * FROM traits
       WHERE (position = ? OR position = 'ALL')
       AND is_positive = TRUE
       ORDER BY RAND()
       LIMIT 1`,
      [player.position]
    );

    if (traitsResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '사용 가능한 특성이 없습니다' });
    }

    const selectedTrait = traitsResult[0];

    // 중복 체크
    const [existingResult]: any = await client.query(
      'SELECT * FROM player_traits WHERE player_card_id = ? AND trait_id = ?',
      [playerCardId, selectedTrait.id]
    );

    if (existingResult.length > 0) {
      await client.commit();
      return res.json({
        success: false,
        message: '이미 보유한 특성입니다. 특성을 획득하지 못했습니다',
      });
    }

    // 특성 부여
    await client.query(
      'INSERT INTO player_traits (player_card_id, trait_id) VALUES (?, ?)',
      [playerCardId, selectedTrait.id]
    );

    await client.commit();

    res.json({
      success: true,
      message: '특성을 획득했습니다!',
      trait: selectedTrait,
      acquisitionRate,
    });
  } catch (error) {
    await client.rollback();
    console.error('특성 부여 오류:', error);
    res.status(500).json({ error: '특성 부여에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 특성 활성화/비활성화
router.patch('/:playerTraitId/toggle', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerTraitId } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 해당 특성이 사용자의 선수에게 속하는지 확인
    const playerTraitResult = await query(
      `SELECT pt.*, upc.team_id
       FROM player_traits pt
       JOIN user_player_cards upc ON pt.player_card_id = upc.player_card_id
       JOIN teams t ON upc.team_id = t.id
       WHERE pt.id = ? AND t.user_id = ?`,
      [playerTraitId, req.user.id]
    );

    if (playerTraitResult.length === 0) {
      return res.status(404).json({ error: '특성을 찾을 수 없습니다' });
    }

    const currentStatus = playerTraitResult[0].is_active;

    // 활성화 상태 토글
    await query(
      'UPDATE player_traits SET is_active = ? WHERE id = ?',
      [!currentStatus, playerTraitId]
    );

    res.json({
      message: currentStatus ? '특성을 비활성화했습니다' : '특성을 활성화했습니다',
      is_active: !currentStatus,
    });
  } catch (error) {
    console.error('특성 토글 오류:', error);
    res.status(500).json({ error: '특성 상태 변경에 실패했습니다' });
  }
});

// 특성 제거 (교정 프로그램에서 사용)
router.delete('/:playerTraitId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { playerTraitId } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 해당 특성이 사용자의 선수에게 속하는지 확인
    const playerTraitResult = await query(
      `SELECT pt.*, t.is_positive
       FROM player_traits pt
       JOIN traits t ON pt.trait_id = t.id
       JOIN user_player_cards upc ON pt.player_card_id = upc.player_card_id
       JOIN teams team ON upc.team_id = team.id
       WHERE pt.id = ? AND team.user_id = ?`,
      [playerTraitId, req.user.id]
    );

    if (playerTraitResult.length === 0) {
      return res.status(404).json({ error: '특성을 찾을 수 없습니다' });
    }

    // 부정적 특성만 제거 가능
    if (playerTraitResult[0].is_positive) {
      return res.status(400).json({ error: '긍정적 특성은 제거할 수 없습니다' });
    }

    await query('DELETE FROM player_traits WHERE id = ?', [playerTraitId]);

    res.json({ message: '부정적 특성을 제거했습니다' });
  } catch (error) {
    console.error('특성 제거 오류:', error);
    res.status(500).json({ error: '특성 제거에 실패했습니다' });
  }
});

export default router;
