import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 교정 프로그램 목록 조회
router.get('/correction/programs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const programs = await query(
      'SELECT * FROM correction_programs ORDER BY cost ASC'
    );

    res.json({ programs });
  } catch (error) {
    console.error('교정 프로그램 조회 오류:', error);
    res.status(500).json({ error: '교정 프로그램 조회에 실패했습니다' });
  }
});

// 멘토링 프로그램 목록 조회
router.get('/mentoring/programs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const programs = await query(
      'SELECT * FROM mentoring_programs ORDER BY cost ASC'
    );

    res.json({ programs });
  } catch (error) {
    console.error('멘토링 프로그램 조회 오류:', error);
    res.status(500).json({ error: '멘토링 프로그램 조회에 실패했습니다' });
  }
});

// 특성 훈련 프로그램 목록 조회
router.get('/trait/programs', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const programs = await query(
      `SELECT ttp.*, t.trait_name
       FROM trait_training_programs ttp
       LEFT JOIN traits t ON ttp.target_trait_id = t.id
       ORDER BY ttp.cost ASC`
    );

    res.json({ programs });
  } catch (error) {
    console.error('특성 훈련 프로그램 조회 오류:', error);
    res.status(500).json({ error: '특성 훈련 프로그램 조회에 실패했습니다' });
  }
});

// 교정 시작
router.post('/correction/start', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { playerCardId, programId } = req.body;

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

    // 선수 카드 소유권 확인
    const [ownerResult]: any = await client.query(
      `SELECT * FROM user_player_cards WHERE player_card_id = ? AND team_id = ?`,
      [playerCardId, team.id]
    );

    if (ownerResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    // 프로그램 정보 조회
    const [programResult]: any = await client.query(
      'SELECT * FROM correction_programs WHERE id = ?',
      [programId]
    );

    if (programResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '프로그램을 찾을 수 없습니다' });
    }

    const program = programResult[0];

    // 잔액 확인
    if (team.balance < program.cost) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 시설 레벨 확인 (멘탈리스트 룸)
    const [facilityResult]: any = await client.query(
      `SELECT tf.current_level
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ? AND f.facility_type = 'MENTALIST_ROOM'`,
      [team.id]
    );

    if (facilityResult.length === 0 || facilityResult[0].current_level < program.facility_level_required) {
      await client.rollback();
      return res.status(400).json({
        error: `멘탈리스트 룸 레벨 ${program.facility_level_required} 이상이 필요합니다`,
      });
    }

    // 이미 훈련 중인지 확인
    const [activeResult]: any = await client.query(
      `SELECT * FROM active_trainings WHERE player_card_id = ? AND status = 'IN_PROGRESS'`,
      [playerCardId]
    );

    if (activeResult.length > 0) {
      await client.rollback();
      return res.status(400).json({ error: '이미 훈련 중인 선수입니다' });
    }

    // 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE id = ?',
      [program.cost, team.id]
    );

    // 훈련 시작
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + program.duration_days);

    await client.query(
      `INSERT INTO active_trainings (
        team_id, player_card_id, training_type, program_id,
        start_date, end_date, cost_paid
      ) VALUES (?, ?, 'CORRECTION', ?, NOW(), ?, ?)`,
      [team.id, playerCardId, programId, endDate, program.cost]
    );

    await client.commit();

    res.json({
      message: '교정 프로그램이 시작되었습니다',
      endDate,
      cost: program.cost,
    });
  } catch (error) {
    await client.rollback();
    console.error('교정 시작 오류:', error);
    res.status(500).json({ error: '교정 시작에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 멘토링 시작
router.post('/mentoring/start', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { menteeCardId, mentorCardId, programId } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id, balance FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const team = teamResult[0];

    // 선수 카드 소유권 확인
    const [menteeOwner]: any = await client.query(
      `SELECT * FROM user_player_cards WHERE player_card_id = ? AND team_id = ?`,
      [menteeCardId, team.id]
    );

    const [mentorOwner]: any = await client.query(
      `SELECT * FROM user_player_cards WHERE player_card_id = ? AND team_id = ?`,
      [mentorCardId, team.id]
    );

    if (menteeOwner.length === 0 || mentorOwner.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    // 프로그램 정보 조회
    const [programResult]: any = await client.query(
      'SELECT * FROM mentoring_programs WHERE id = ?',
      [programId]
    );

    const program = programResult[0];

    // 멘토/멘티 레벨 확인
    const [menteeResult]: any = await client.query(
      'SELECT level FROM player_cards WHERE id = ?',
      [menteeCardId]
    );

    const [mentorResult]: any = await client.query(
      'SELECT level FROM player_cards WHERE id = ?',
      [mentorCardId]
    );

    if (mentorResult[0].level < program.mentor_min_level) {
      await client.rollback();
      return res.status(400).json({
        error: `멘토 레벨이 최소 ${program.mentor_min_level} 이상이어야 합니다`,
      });
    }

    if (menteeResult[0].level > program.mentee_max_level) {
      await client.rollback();
      return res.status(400).json({
        error: `멘티 레벨이 최대 ${program.mentee_max_level} 이하여야 합니다`,
      });
    }

    // 잔액 확인
    if (team.balance < program.cost) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 시설 레벨 확인
    const [facilityResult]: any = await client.query(
      `SELECT tf.current_level
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ? AND f.facility_type = 'MENTALIST_ROOM'`,
      [team.id]
    );

    if (facilityResult.length === 0 || facilityResult[0].current_level < program.facility_level_required) {
      await client.rollback();
      return res.status(400).json({
        error: `멘탈리스트 룸 레벨 ${program.facility_level_required} 이상이 필요합니다`,
      });
    }

    // 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE id = ?',
      [program.cost, team.id]
    );

    // 멘토링 시작
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + program.duration_days);

    await client.query(
      `INSERT INTO active_trainings (
        team_id, player_card_id, training_type, program_id, mentor_player_id,
        start_date, end_date, cost_paid
      ) VALUES (?, ?, 'MENTORING', ?, ?, NOW(), ?, ?)`,
      [team.id, menteeCardId, programId, mentorCardId, endDate, program.cost]
    );

    await client.commit();

    res.json({
      message: '멘토링 프로그램이 시작되었습니다',
      endDate,
      cost: program.cost,
    });
  } catch (error) {
    await client.rollback();
    console.error('멘토링 시작 오류:', error);
    res.status(500).json({ error: '멘토링 시작에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 특성 훈련 시작
router.post('/trait/start', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { playerCardId, programId } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id, balance FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const team = teamResult[0];

    // 프로그램 정보 조회
    const [programResult]: any = await client.query(
      'SELECT * FROM trait_training_programs WHERE id = ?',
      [programId]
    );

    const program = programResult[0];

    // 잔액 확인
    if (team.balance < program.cost) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 시설 레벨 확인
    const [facilityResult]: any = await client.query(
      `SELECT tf.current_level
       FROM team_facilities tf
       JOIN facilities f ON tf.facility_id = f.id
       WHERE tf.team_id = ? AND f.facility_type = 'MENTALIST_ROOM'`,
      [team.id]
    );

    if (facilityResult.length === 0 || facilityResult[0].current_level < program.facility_level_required) {
      await client.rollback();
      return res.status(400).json({
        error: `멘탈리스트 룸 레벨 ${program.facility_level_required} 이상이 필요합니다`,
      });
    }

    // 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE id = ?',
      [program.cost, team.id]
    );

    // 특성 훈련 시작
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + program.duration_days);

    await client.query(
      `INSERT INTO active_trainings (
        team_id, player_card_id, training_type, program_id,
        start_date, end_date, cost_paid
      ) VALUES (?, ?, 'TRAIT_TRAINING', ?, NOW(), ?, ?)`,
      [team.id, playerCardId, programId, endDate, program.cost]
    );

    await client.commit();

    res.json({
      message: '특성 훈련이 시작되었습니다',
      endDate,
      cost: program.cost,
    });
  } catch (error) {
    await client.rollback();
    console.error('특성 훈련 시작 오류:', error);
    res.status(500).json({ error: '특성 훈련 시작에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 진행 중인 훈련 목록 조회
router.get('/active', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    const trainings = await query(
      `SELECT at.*, pc.player_name, pc.position,
              TIMESTAMPDIFF(SECOND, NOW(), at.end_date) as time_remaining
       FROM active_trainings at
       JOIN player_cards pc ON at.player_card_id = pc.id
       WHERE at.team_id = ? AND at.status = 'IN_PROGRESS'
       ORDER BY at.end_date ASC`,
      [teamId]
    );

    res.json({ trainings });
  } catch (error) {
    console.error('훈련 목록 조회 오류:', error);
    res.status(500).json({ error: '훈련 목록 조회에 실패했습니다' });
  }
});

// 훈련 완료 처리
router.post('/complete/:trainingId', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { trainingId } = req.params;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    // 훈련 정보 조회
    const [trainingResult]: any = await client.query(
      'SELECT * FROM active_trainings WHERE id = ? AND team_id = ?',
      [trainingId, teamId]
    );

    if (trainingResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '훈련을 찾을 수 없습니다' });
    }

    const training = trainingResult[0];

    // 완료 시간 확인
    if (new Date(training.end_date) > new Date()) {
      await client.rollback();
      return res.status(400).json({ error: '훈련이 아직 완료되지 않았습니다' });
    }

    // 훈련 타입별 결과 처리
    let result: any = {};

    if (training.training_type === 'CORRECTION') {
      result = await processCorrectionResult(client, training);
    } else if (training.training_type === 'MENTORING') {
      result = await processMentoringResult(client, training);
    } else if (training.training_type === 'TRAIT_TRAINING') {
      result = await processTraitTrainingResult(client, training);
    }

    // 훈련 상태 업데이트
    await client.query(
      'UPDATE active_trainings SET status = "COMPLETED" WHERE id = ?',
      [trainingId]
    );

    // 훈련 완료 내역 저장
    await client.query(
      `INSERT INTO training_history (
        active_training_id, team_id, player_card_id, training_type,
        program_name, success, result_description, stat_changes,
        trait_acquired, trait_removed, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        trainingId,
        teamId,
        training.player_card_id,
        training.training_type,
        result.programName,
        result.success,
        result.description,
        JSON.stringify(result.statChanges || {}),
        result.traitAcquired || null,
        result.traitRemoved || null,
      ]
    );

    // 훈련 통계 업데이트
    await updateTrainingStats(client, teamId, result.success, result.traitAcquired, result.traitRemoved);

    await client.commit();

    res.json({
      message: '훈련이 완료되었습니다',
      result,
    });
  } catch (error) {
    await client.rollback();
    console.error('훈련 완료 오류:', error);
    res.status(500).json({ error: '훈련 완료 처리에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 훈련 취소
router.post('/cancel/:trainingId', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { trainingId } = req.params;

    await client.beginTransaction();

    const [teamResult]: any = await client.query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    const [trainingResult]: any = await client.query(
      'SELECT * FROM active_trainings WHERE id = ? AND team_id = ?',
      [trainingId, teamId]
    );

    if (trainingResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '훈련을 찾을 수 없습니다' });
    }

    // 훈련 취소
    await client.query(
      'UPDATE active_trainings SET status = "CANCELLED" WHERE id = ?',
      [trainingId]
    );

    // 비용의 50% 환불
    const refund = Math.floor(trainingResult[0].cost_paid * 0.5);
    await client.query(
      'UPDATE teams SET balance = balance + ? WHERE id = ?',
      [refund, teamId]
    );

    await client.commit();

    res.json({
      message: '훈련을 취소했습니다',
      refund,
    });
  } catch (error) {
    await client.rollback();
    console.error('훈련 취소 오류:', error);
    res.status(500).json({ error: '훈련 취소에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 훈련 내역 조회
router.get('/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    const history = await query(
      `SELECT th.*, pc.player_name, pc.position
       FROM training_history th
       JOIN player_cards pc ON th.player_card_id = pc.id
       WHERE th.team_id = ?
       ORDER BY th.completed_at DESC
       LIMIT 50`,
      [teamId]
    );

    res.json({ history });
  } catch (error) {
    console.error('훈련 내역 조회 오류:', error);
    res.status(500).json({ error: '훈련 내역 조회에 실패했습니다' });
  }
});

// 교정 결과 처리
async function processCorrectionResult(client: any, training: any) {
  const [programResult]: any = await client.query(
    'SELECT * FROM correction_programs WHERE id = ?',
    [training.program_id]
  );

  const program = programResult[0];
  const success = Math.random() * 100 < program.success_rate;

  let description = '';
  let traitRemoved = null;

  if (success) {
    if (program.target_type === 'NEGATIVE_TRAIT') {
      // 부정적 특성 제거
      const [negativeTraits]: any = await client.query(
        `SELECT pt.id, pt.trait_id FROM player_traits pt
         JOIN traits t ON pt.trait_id = t.id
         WHERE pt.player_card_id = ? AND t.is_positive = FALSE AND pt.is_active = TRUE
         LIMIT 1`,
        [training.player_card_id]
      );

      if (negativeTraits.length > 0) {
        await client.query('DELETE FROM player_traits WHERE id = ?', [negativeTraits[0].id]);
        traitRemoved = negativeTraits[0].trait_id;
        description = '부정적 특성을 성공적으로 제거했습니다!';
      } else {
        description = '제거할 부정적 특성이 없습니다.';
      }
    } else if (program.target_type === 'STAT_BOOST') {
      // 능력치 상승
      const boost = Math.floor(Math.random() * 3) + 1;
      await client.query(
        'UPDATE player_cards SET mental = mental + ? WHERE id = ?',
        [boost, training.player_card_id]
      );
      description = `멘탈 능력치가 ${boost} 상승했습니다!`;
    } else if (program.target_type === 'CONDITION_FIX') {
      // 컨디션 회복
      await client.query(
        `UPDATE user_player_cards SET current_condition = 'YELLOW' WHERE player_card_id = ?`,
        [training.player_card_id]
      );
      description = '컨디션이 YELLOW로 회복되었습니다!';
    }
  } else {
    description = '교정에 실패했습니다...';
  }

  return {
    success,
    description,
    programName: program.program_name,
    traitRemoved,
  };
}

// 멘토링 결과 처리
async function processMentoringResult(client: any, training: any) {
  const [programResult]: any = await client.query(
    'SELECT * FROM mentoring_programs WHERE id = ?',
    [training.program_id]
  );

  const program = programResult[0];

  // 멘토의 능력치를 멘티에게 일부 전수
  const [mentorResult]: any = await client.query(
    'SELECT * FROM player_cards WHERE id = ?',
    [training.mentor_player_id]
  );

  const mentor = mentorResult[0];
  const transferRate = program.stat_transfer_rate / 100;

  const statBoost = Math.floor(mentor.power * transferRate / 5);

  await client.query(
    `UPDATE player_cards
     SET mental = mental + ?,
         team_fight = team_fight + ?,
         cs_ability = cs_ability + ?
     WHERE id = ?`,
    [statBoost, statBoost, statBoost, training.player_card_id]
  );

  // 경험치 지급
  await client.query(
    'UPDATE player_cards SET exp = exp + ? WHERE id = ?',
    [program.exp_gain, training.player_card_id]
  );

  return {
    success: true,
    description: `멘토링이 완료되었습니다! 능력치가 상승했습니다.`,
    programName: program.program_name,
    statChanges: { mental: statBoost, team_fight: statBoost, cs_ability: statBoost },
  };
}

// 특성 훈련 결과 처리
async function processTraitTrainingResult(client: any, training: any) {
  const [programResult]: any = await client.query(
    'SELECT * FROM trait_training_programs WHERE id = ?',
    [training.program_id]
  );

  const program = programResult[0];
  const success = Math.random() * 100 < program.success_rate;

  let description = '';
  let traitAcquired = null;

  if (success) {
    // 랜덤 긍정 특성 획득
    const [playerResult]: any = await client.query(
      'SELECT position FROM player_cards WHERE id = ?',
      [training.player_card_id]
    );

    const [traitsResult]: any = await client.query(
      `SELECT * FROM traits
       WHERE (position = ? OR position = 'ALL')
       AND is_positive = TRUE
       ORDER BY RAND()
       LIMIT 1`,
      [playerResult[0].position]
    );

    if (traitsResult.length > 0) {
      const trait = traitsResult[0];

      // 중복 체크
      const [existingResult]: any = await client.query(
        'SELECT * FROM player_traits WHERE player_card_id = ? AND trait_id = ?',
        [training.player_card_id, trait.id]
      );

      if (existingResult.length === 0) {
        await client.query(
          'INSERT INTO player_traits (player_card_id, trait_id) VALUES (?, ?)',
          [training.player_card_id, trait.id]
        );
        traitAcquired = trait.id;
        description = `새로운 특성 "${trait.trait_name}"을 획득했습니다!`;
      } else {
        description = '이미 보유한 특성이 선택되어 실패했습니다.';
      }
    }
  } else {
    description = '특성 훈련에 실패했습니다...';
  }

  return {
    success,
    description,
    programName: program.program_name,
    traitAcquired,
  };
}

// 훈련 통계 업데이트
async function updateTrainingStats(
  client: any,
  teamId: string,
  success: boolean,
  traitAcquired: number | null,
  traitRemoved: number | null
) {
  const [statsResult]: any = await client.query(
    'SELECT * FROM training_stats WHERE team_id = ?',
    [teamId]
  );

  if (statsResult.length === 0) {
    await client.query(
      'INSERT INTO training_stats (team_id) VALUES (?)',
      [teamId]
    );
  }

  await client.query(
    `UPDATE training_stats
     SET total_trainings = total_trainings + 1,
         successful_trainings = successful_trainings + ?,
         failed_trainings = failed_trainings + ?,
         traits_acquired = traits_acquired + ?,
         traits_removed = traits_removed + ?
     WHERE team_id = ?`,
    [
      success ? 1 : 0,
      success ? 0 : 1,
      traitAcquired ? 1 : 0,
      traitRemoved ? 1 : 0,
      teamId,
    ]
  );
}

export default router;
