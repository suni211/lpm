import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import pool from '../database/db';

const router = express.Router();

const MAX_COST = 48;

// 현재 로스터 조회
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 팀의 로스터 조회
    const teamResult = await pool.query(
      'SELECT id FROM teams WHERE user_id = $1',
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult.rows[0].id;

    // 로스터 정보
    const rosterResult = await pool.query(
      'SELECT * FROM rosters WHERE team_id = $1',
      [teamId]
    );

    const roster = rosterResult.rows[0];

    // 각 포지션의 선수 정보 가져오기
    const positions = ['top', 'jungle', 'mid', 'adc', 'support'];
    const players: any = {};

    for (const pos of positions) {
      const playerId = roster[`${pos}_player_id`];
      if (playerId) {
        const playerResult = await pool.query(
          `SELECT upc.*, pc.card_name, pc.card_image, pc.position, pc.cost,
                  pc.mental, pc.team_fight, pc.cs_ability, pc.vision,
                  pc.judgment, pc.laning, pc.power, pc.rarity
           FROM user_player_cards upc
           JOIN player_cards pc ON upc.player_card_id = pc.id
           WHERE upc.id = $1`,
          [playerId]
        );
        players[pos] = playerResult.rows[0] || null;
      } else {
        players[pos] = null;
      }
    }

    res.json({
      roster,
      players,
    });
  } catch (error) {
    console.error('로스터 조회 오류:', error);
    res.status(500).json({ error: '로스터 조회에 실패했습니다' });
  }
});

// 로스터에 선수 배치
router.post('/assign', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { position, userCardId } = req.body;

    if (!['top', 'jungle', 'mid', 'adc', 'support'].includes(position)) {
      return res.status(400).json({ error: '유효하지 않은 포지션입니다' });
    }

    // 팀 조회
    const teamResult = await pool.query(
      'SELECT id FROM teams WHERE user_id = $1',
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult.rows[0].id;

    // 선수 카드 조회
    const cardResult = await pool.query(
      `SELECT upc.*, pc.position, pc.cost
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.id = $1 AND upc.user_id = $2`,
      [userCardId, req.user.id]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    const card = cardResult.rows[0];

    // 포지션 확인
    const positionMap: any = {
      top: 'TOP',
      jungle: 'JUNGLE',
      mid: 'MID',
      adc: 'ADC',
      support: 'SUPPORT',
    };

    if (card.position !== positionMap[position]) {
      return res.status(400).json({
        error: `${card.position} 선수는 ${position.toUpperCase()} 포지션에 배치할 수 없습니다`,
      });
    }

    // 현재 로스터
    const rosterResult = await pool.query(
      'SELECT * FROM rosters WHERE team_id = $1',
      [teamId]
    );

    const roster = rosterResult.rows[0];

    // 새로운 총 코스트 계산
    let newTotalCost = 0;

    for (const pos of ['top', 'jungle', 'mid', 'adc', 'support']) {
      if (pos === position) {
        newTotalCost += card.cost;
      } else {
        const currentPlayerId = roster[`${pos}_player_id`];
        if (currentPlayerId) {
          const currentPlayerResult = await pool.query(
            `SELECT pc.cost FROM user_player_cards upc
             JOIN player_cards pc ON upc.player_card_id = pc.id
             WHERE upc.id = $1`,
            [currentPlayerId]
          );
          if (currentPlayerResult.rows.length > 0) {
            newTotalCost += currentPlayerResult.rows[0].cost;
          }
        }
      }
    }

    // 코스트 제한 확인
    if (newTotalCost > MAX_COST) {
      return res.status(400).json({
        error: `총 코스트가 ${MAX_COST}를 초과할 수 없습니다 (현재: ${newTotalCost})`,
      });
    }

    // 이전에 로스터에 있던 선수 제거
    const oldPlayerId = roster[`${position}_player_id`];
    if (oldPlayerId) {
      await pool.query(
        'UPDATE user_player_cards SET in_roster = false WHERE id = $1',
        [oldPlayerId]
      );
    }

    // 새 선수 배치
    await pool.query(
      `UPDATE rosters SET ${position}_player_id = $1, total_cost = $2, updated_at = CURRENT_TIMESTAMP
       WHERE team_id = $3`,
      [userCardId, newTotalCost, teamId]
    );

    // 선수를 로스터에 추가
    await pool.query(
      'UPDATE user_player_cards SET in_roster = true WHERE id = $1',
      [userCardId]
    );

    res.json({ message: '선수가 배치되었습니다', totalCost: newTotalCost });
  } catch (error) {
    console.error('선수 배치 오류:', error);
    res.status(500).json({ error: '선수 배치에 실패했습니다' });
  }
});

// 로스터에서 선수 제거
router.post('/remove', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { position } = req.body;

    if (!['top', 'jungle', 'mid', 'adc', 'support'].includes(position)) {
      return res.status(400).json({ error: '유효하지 않은 포지션입니다' });
    }

    // 팀 조회
    const teamResult = await pool.query(
      'SELECT id FROM teams WHERE user_id = $1',
      [req.user.id]
    );

    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult.rows[0].id;

    // 현재 로스터
    const rosterResult = await pool.query(
      'SELECT * FROM rosters WHERE team_id = $1',
      [teamId]
    );

    const roster = rosterResult.rows[0];
    const playerId = roster[`${position}_player_id`];

    if (!playerId) {
      return res.status(400).json({ error: '해당 포지션에 선수가 없습니다' });
    }

    // 선수의 코스트 가져오기
    const playerResult = await pool.query(
      `SELECT pc.cost FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.id = $1`,
      [playerId]
    );

    const cost = playerResult.rows[0].cost;
    const newTotalCost = roster.total_cost - cost;

    // 로스터에서 제거
    await pool.query(
      `UPDATE rosters SET ${position}_player_id = NULL, total_cost = $1, updated_at = CURRENT_TIMESTAMP
       WHERE team_id = $2`,
      [newTotalCost, teamId]
    );

    // 선수 상태 업데이트
    await pool.query(
      'UPDATE user_player_cards SET in_roster = false WHERE id = $1',
      [playerId]
    );

    res.json({ message: '선수가 제거되었습니다', totalCost: newTotalCost });
  } catch (error) {
    console.error('선수 제거 오류:', error);
    res.status(500).json({ error: '선수 제거에 실패했습니다' });
  }
});

// 사용 가능한 선수 목록 (포지션별)
router.get('/available/:position', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { position } = req.params;

    const positionMap: any = {
      top: 'TOP',
      jungle: 'JUNGLE',
      mid: 'MID',
      adc: 'ADC',
      support: 'SUPPORT',
    };

    if (!positionMap[position]) {
      return res.status(400).json({ error: '유효하지 않은 포지션입니다' });
    }

    // 해당 포지션의 사용 가능한 선수들
    const playersResult = await pool.query(
      `SELECT upc.*, pc.card_name, pc.card_image, pc.position, pc.cost,
              pc.mental, pc.team_fight, pc.cs_ability, pc.vision,
              pc.judgment, pc.laning, pc.power, pc.rarity
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.user_id = $1 AND pc.position = $2 AND upc.in_roster = false
       ORDER BY pc.power DESC`,
      [req.user.id, positionMap[position]]
    );

    res.json({ players: playersResult.rows });
  } catch (error) {
    console.error('선수 목록 조회 오류:', error);
    res.status(500).json({ error: '선수 목록 조회에 실패했습니다' });
  }
});

export default router;
