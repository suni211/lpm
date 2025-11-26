import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 모든 시설 목록 조회
router.get('/list', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const facilities = await query(
      'SELECT * FROM facilities ORDER BY id ASC'
    );

    res.json({ facilities });
  } catch (error) {
    console.error('시설 목록 조회 오류:', error);
    res.status(500).json({ error: '시설 목록 조회에 실패했습니다' });
  }
});

// 특정 시설의 레벨별 정보 조회
router.get('/:facilityId/levels', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { facilityId } = req.params;

    const levels = await query(
      'SELECT * FROM facility_levels WHERE facility_id = ? ORDER BY level ASC',
      [facilityId]
    );

    res.json({ levels });
  } catch (error) {
    console.error('시설 레벨 정보 조회 오류:', error);
    res.status(500).json({ error: '시설 레벨 정보 조회에 실패했습니다' });
  }
});

// 팀의 시설 현황 조회
router.get('/my/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    // 팀 시설 현황 조회
    const teamFacilities = await query(
      `SELECT tf.*, f.facility_name, f.facility_description, f.max_level, f.facility_type
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ?
       ORDER BY f.id ASC`,
      [teamId]
    );

    // 팀 시설이 없으면 초기화
    if (teamFacilities.length === 0) {
      const allFacilities = await query('SELECT * FROM facilities');

      for (const facility of allFacilities) {
        await query(
          'INSERT INTO team_facilities (team_id, facility_id, current_level) VALUES (?, ?, 0)',
          [teamId, facility.id]
        );
      }

      const newTeamFacilities = await query(
        `SELECT tf.*, f.facility_name, f.facility_description, f.max_level, f.facility_type
         FROM team_facilities tf
         JOIN facilities f ON tf.facility_id = f.id
         WHERE tf.team_id = ?
         ORDER BY f.id ASC`,
        [teamId]
      );

      return res.json({ facilities: newTeamFacilities });
    }

    res.json({ facilities: teamFacilities });
  } catch (error) {
    console.error('팀 시설 현황 조회 오류:', error);
    res.status(500).json({ error: '팀 시설 현황 조회에 실패했습니다' });
  }
});

// 시설 업그레이드
router.post('/upgrade', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { facilityId } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id, balance FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const team = teamResult[0];

    // 시설 정보 조회
    const [facilityResult]: any = await client.query(
      'SELECT * FROM facilities WHERE id = ?',
      [facilityId]
    );

    if (facilityResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '시설을 찾을 수 없습니다' });
    }

    const facility = facilityResult[0];

    // 팀 시설 현황 조회
    const [teamFacilityResult]: any = await client.query(
      'SELECT * FROM team_facilities WHERE team_id = ? AND facility_id = ?',
      [team.id, facilityId]
    );

    let currentLevel = 0;
    let teamFacilityId;

    if (teamFacilityResult.length === 0) {
      // 시설 정보 생성
      const [insertResult]: any = await client.query(
        'INSERT INTO team_facilities (team_id, facility_id, current_level) VALUES (?, ?, 0)',
        [team.id, facilityId]
      );
      teamFacilityId = insertResult.insertId;
    } else {
      currentLevel = teamFacilityResult[0].current_level;
      teamFacilityId = teamFacilityResult[0].id;
    }

    // 최대 레벨 확인
    if (currentLevel >= facility.max_level) {
      await client.rollback();
      return res.status(400).json({ error: '이미 최대 레벨입니다' });
    }

    const nextLevel = currentLevel + 1;

    // 다음 레벨 정보 조회
    const [levelResult]: any = await client.query(
      'SELECT * FROM facility_levels WHERE facility_id = ? AND level = ?',
      [facilityId, nextLevel]
    );

    if (levelResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '레벨 정보를 찾을 수 없습니다' });
    }

    const levelInfo = levelResult[0];

    // 잔액 확인
    if (team.balance < levelInfo.upgrade_cost) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE id = ?',
      [levelInfo.upgrade_cost, team.id]
    );

    // 시설 레벨 업그레이드
    await client.query(
      'UPDATE team_facilities SET current_level = ?, last_upgraded_at = NOW() WHERE id = ?',
      [nextLevel, teamFacilityId]
    );

    // 업그레이드 내역 저장
    await client.query(
      `INSERT INTO facility_upgrade_history (team_facility_id, from_level, to_level, cost_paid)
       VALUES (?, ?, ?, ?)`,
      [teamFacilityId, currentLevel, nextLevel, levelInfo.upgrade_cost]
    );

    await client.commit();

    res.json({
      message: `${facility.facility_name}이(가) 레벨 ${nextLevel}로 업그레이드되었습니다!`,
      newLevel: nextLevel,
      cost: levelInfo.upgrade_cost,
      effect: levelInfo.effect_description,
      unlockFeature: levelInfo.unlock_feature,
    });
  } catch (error) {
    await client.rollback();
    console.error('시설 업그레이드 오류:', error);
    res.status(500).json({ error: '시설 업그레이드에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 시설 업그레이드 내역 조회
router.get('/upgrade/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    const history = await query(
      `SELECT fuh.*, tf.facility_id, f.facility_name
       FROM facility_upgrade_history fuh
       JOIN team_facilities tf ON fuh.team_facility_id = tf.id
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ?
       ORDER BY fuh.upgraded_at DESC
       LIMIT 50`,
      [teamId]
    );

    res.json({ history });
  } catch (error) {
    console.error('업그레이드 내역 조회 오류:', error);
    res.status(500).json({ error: '업그레이드 내역 조회에 실패했습니다' });
  }
});

// 작전 연구소에서 작전/서포트 카드 획득
router.post('/tactic-lab/acquire', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { cardType } = req.body; // 'TACTIC' or 'SUPPORT'

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id, balance FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const team = teamResult[0];

    // 작전 연구소 레벨 확인
    const [facilityResult]: any = await client.query(
      `SELECT tf.current_level
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ? AND f.facility_type = 'TACTIC_LAB'`,
      [team.id]
    );

    if (facilityResult.length === 0 || facilityResult[0].current_level === 0) {
      await client.rollback();
      return res.status(400).json({ error: '작전 연구소를 먼저 건설해야 합니다' });
    }

    const labLevel = facilityResult[0].current_level;

    // 획득 비용 (레벨에 따라 증가)
    const baseCost = cardType === 'TACTIC' ? 50000000 : 30000000;
    const cost = baseCost - (labLevel * 5000000);

    if (team.balance < cost) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE id = ?',
      [cost, team.id]
    );

    // 레어도 결정 (레벨이 높을수록 좋은 카드)
    const rarityRoll = Math.random() * 100;
    let rarity = 'NORMAL';

    if (labLevel >= 5 && rarityRoll < 10) {
      rarity = 'LEGEND';
    } else if (labLevel >= 3 && rarityRoll < 30) {
      rarity = 'EPIC';
    } else if (labLevel >= 2 && rarityRoll < 60) {
      rarity = 'RARE';
    }

    // 카드 획득 (실제로는 tactic_cards나 support_cards 테이블에서 랜덤 선택)
    // 여기서는 간단히 처리
    const cardName = `${rarity} ${cardType} Card`;

    await client.commit();

    res.json({
      message: `${cardName}을(를) 획득했습니다!`,
      cardType,
      rarity,
      cost,
    });
  } catch (error) {
    await client.rollback();
    console.error('카드 획득 오류:', error);
    res.status(500).json({ error: '카드 획득에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 기록 예측 센터 - 경기 예측
router.post('/prediction-center/predict', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { opponentTeamId } = req.body;

    // 팀 정보 조회
    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    // 기록 예측 센터 레벨 확인
    const facilityResult = await query(
      `SELECT tf.current_level, fl.effect_value
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       JOIN facility_levels fl ON f.id = fl.facility_id AND tf.current_level = fl.level
       WHERE tf.team_id = ? AND f.facility_type = 'PREDICTION_CENTER'`,
      [teamId]
    );

    if (facilityResult.length === 0 || facilityResult[0].current_level === 0) {
      return res.status(400).json({ error: '기록 예측 센터를 먼저 건설해야 합니다' });
    }

    const accuracy = facilityResult[0].effect_value || 60; // 예측 정확도

    // 양 팀 파워 계산 (간단히 처리)
    const myTeamPower = Math.floor(Math.random() * 1000) + 500;
    const opponentPower = Math.floor(Math.random() * 1000) + 500;

    // 예측
    const winProbability = Math.min(95, Math.max(5, (myTeamPower / (myTeamPower + opponentPower)) * 100));

    // 정확도에 따라 노이즈 추가
    const noise = (100 - accuracy) / 100;
    const predictedWinProbability = winProbability + (Math.random() - 0.5) * 20 * noise;

    res.json({
      prediction: {
        myTeamPower,
        opponentPower,
        winProbability: Math.round(predictedWinProbability * 10) / 10,
        accuracy,
        recommendation: predictedWinProbability > 60 ? '승리 가능성이 높습니다!' : '신중한 전략이 필요합니다.',
      },
    });
  } catch (error) {
    console.error('경기 예측 오류:', error);
    res.status(500).json({ error: '경기 예측에 실패했습니다' });
  }
});

export default router;
