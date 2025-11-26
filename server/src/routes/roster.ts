import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import pool, { query, getConnection } from '../database/db'; // Removed IQuery

const router = express.Router();

const MAX_COST = 58; // Increased for 7 players

// 현재 로스터 조회
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult: any[] = await query('SELECT id FROM teams WHERE user_id = ?', [req.user.id]);
    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }
    const teamId = teamResult[0].id;

    const rosterResult: any[] = await query('SELECT * FROM rosters WHERE team_id = ?', [teamId]);
    if (rosterResult.length === 0) {
      return res.status(200).json({ roster: null, players: {} });
    }

    const roster = rosterResult[0];
    const players: any = {};
    const positionKeys = ['top', 'jungle', 'mid', 'adc', 'support', 'sub1', 'sub2'];
    
    for (const pos of positionKeys) {
      const playerId = roster[`${pos}_player_id`];
      if (playerId) {
        const playerDetails = await query(
          `SELECT upc.id, upc.level, upc.condition, upc.exp,
                  pc.card_name, pc.position, pc.cost,
                  pc.mental, pc.teamfight, pc.cs_ability, pc.vision,
                  pc.judgement, pc.laning
           FROM user_player_cards upc
           JOIN player_cards pc ON upc.player_card_id = pc.id
           WHERE upc.id = ?`,
          [playerId]
        );
        if (playerDetails.length > 0) {
          const p = playerDetails[0];
          players[pos] = {
            ...p,
            overall: Math.floor((p.mental + p.teamfight + p.cs_ability + p.vision + p.judgement + p.laning) / 6)
          };
        } else {
           players[pos] = null;
        }
      } else {
        players[pos] = null;
      }
    }

    res.json({ roster, players });
  } catch (error) {
    console.error('로스터 조회 오류:', error);
    res.status(500).json({ error: '서버 오류로 로스터 조회에 실패했습니다.' });
  }
});

// 로스터 저장
router.post('/save', isAuthenticated, async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      top_player_id, jungle_player_id, mid_player_id, adc_player_id, support_player_id,
      sub1_player_id, sub2_player_id,
    } = req.body;
    
    const mainPlayerIds = [top_player_id, jungle_player_id, mid_player_id, adc_player_id, support_player_id];
    const subPlayerIds = [sub1_player_id, sub2_player_id].filter(id => id); // Filter out null/undefined subs
    const allPlayerIds = [...mainPlayerIds, ...subPlayerIds];
    const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

    if (mainPlayerIds.some(id => id === null || id === undefined)) {
      return res.status(400).json({ error: '모든 주전 포지션에 선수를 배치해야 합니다.' });
    }
    
    const uniquePlayerIds = new Set(allPlayerIds);
    if (uniquePlayerIds.size !== allPlayerIds.length) {
      return res.status(400).json({ error: '한 선수를 여러 포지션에 배치할 수 없습니다.' });
    }

    const teamResult: any[] = await query('SELECT id FROM teams WHERE user_id = ?', [req.user.id]);
    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다.' });
    }
    const teamId = teamResult[0].id;

    await connection.beginTransaction();

    const [oldRoster] : any = await connection.query('SELECT * FROM rosters WHERE team_id = ?', [teamId]);
    if (oldRoster.length > 0) {
      const oldPlayerIds = [
        ...Object.values(oldRoster[0]).filter(id => id !== null && typeof id !== 'number' && id !== teamId),
      ].slice(0, 7); // Ensure we only get player IDs
       if (oldPlayerIds.length > 0) {
        await connection.query('UPDATE user_player_cards SET in_roster = ? WHERE id IN (?)', [false, oldPlayerIds]);
      }
    }

    let total_cost = 0;
    // Validate main players
    for (let i = 0; i < mainPlayerIds.length; i++) {
      const [rows]: any = await connection.query(
        `SELECT pc.cost, pc.position FROM user_player_cards upc
         JOIN player_cards pc ON upc.player_card_id = pc.id
         WHERE upc.id = ? AND upc.user_id = ?`,
        [mainPlayerIds[i], req.user.id]
      );
      if (rows.length === 0) throw new Error(`유효하지 않거나 소유하지 않은 주전 선수 카드입니다.`);
      if (rows[0].position !== positions[i]) throw new Error(`주전 선수의 포지션이 일치하지 않습니다.`);
      total_cost += rows[0].cost;
    }

    // Validate sub players
    for (const subId of subPlayerIds) {
       const [rows]: any = await connection.query(
        `SELECT pc.cost FROM user_player_cards upc
         JOIN player_cards pc ON upc.player_card_id = pc.id
         WHERE upc.id = ? AND upc.user_id = ?`,
        [subId, req.user.id]
      );
      if (rows.length === 0) throw new Error(`유효하지 않거나 소유하지 않은 후보 선수 카드입니다.`);
      total_cost += rows[0].cost;
    }

    if (total_cost > MAX_COST) {
      throw new Error(`총 코스트(${total_cost})가 최대 코스트(${MAX_COST})를 초과했습니다.`);
    }

    await connection.query(
      `UPDATE rosters 
       SET top_player_id = ?, jungle_player_id = ?, mid_player_id = ?, adc_player_id = ?, support_player_id = ?, 
           sub1_player_id = ?, sub2_player_id = ?, total_cost = ?
       WHERE team_id = ?`,
      [...mainPlayerIds, sub1_player_id || null, sub2_player_id || null, total_cost, teamId]
    );

    if (allPlayerIds.length > 0) {
      await connection.query('UPDATE user_player_cards SET in_roster = ? WHERE id IN (?)', [true, allPlayerIds]);
    }

    await connection.commit();
    res.status(200).json({ message: '로스터가 성공적으로 저장되었습니다.', total_cost });

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error('로스터 저장 오류:', error);
    res.status(500).json({ error: error.message || '서버 오류로 로스터 저장에 실패했습니다.' });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
