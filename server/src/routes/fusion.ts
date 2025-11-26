import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 합성 레시피 목록 조회
router.get('/recipes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const recipes = await query(
      'SELECT * FROM fusion_recipes ORDER BY min_cost ASC, required_cards ASC'
    );

    res.json({ recipes });
  } catch (error) {
    console.error('레시피 조회 오류:', error);
    res.status(500).json({ error: '레시피 조회에 실패했습니다' });
  }
});

// 합성 가능한 카드 목록 조회
router.get('/available-cards', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { minCost, maxCost } = req.query;

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    let sql = `
      SELECT upc.id as user_card_id, upc.player_card_id, upc.team_id,
             pc.player_name, pc.position, pc.cost, pc.power, pc.team
      FROM user_player_cards upc
      JOIN player_cards pc ON upc.player_card_id = pc.id
      LEFT JOIN rosters r ON upc.team_id = r.team_id
      WHERE upc.team_id = ?
      AND upc.id NOT IN (r.top_player_id, r.jungle_player_id, r.mid_player_id, r.adc_player_id, r.support_player_id)
    `;
    const params: any[] = [teamId];

    if (minCost) {
      sql += ' AND pc.cost >= ?';
      params.push(Number(minCost));
    }

    if (maxCost) {
      sql += ' AND pc.cost <= ?';
      params.push(Number(maxCost));
    }

    sql += ' ORDER BY pc.cost ASC, pc.power DESC';

    const cards = await query(sql, params);

    res.json({ cards });
  } catch (error) {
    console.error('카드 목록 조회 오류:', error);
    res.status(500).json({ error: '카드 목록 조회에 실패했습니다' });
  }
});

// 카드 합성 실행
router.post('/execute', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipeId, cardIds } = req.body; // cardIds는 user_player_cards의 id 배열

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

    // 레시피 정보 조회
    const [recipeResult]: any = await client.query(
      'SELECT * FROM fusion_recipes WHERE id = ?',
      [recipeId]
    );

    if (recipeResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '레시피를 찾을 수 없습니다' });
    }

    const recipe = recipeResult[0];

    // 카드 개수 확인
    if (cardIds.length !== recipe.required_cards) {
      await client.rollback();
      return res.status(400).json({
        error: `${recipe.required_cards}장의 카드가 필요합니다`,
      });
    }

    // 카드 검증
    const [cardsResult]: any = await client.query(
      `SELECT upc.id, upc.player_card_id, pc.cost
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.id IN (?) AND upc.team_id = ?`,
      [cardIds, team.id]
    );

    if (cardsResult.length !== cardIds.length) {
      await client.rollback();
      return res.status(400).json({ error: '유효하지 않은 카드가 포함되어 있습니다' });
    }

    // 코스트 범위 확인
    for (const card of cardsResult) {
      if (card.cost < recipe.min_cost || card.cost > recipe.max_cost) {
        await client.rollback();
        return res.status(400).json({
          error: `코스트 ${recipe.min_cost}~${recipe.max_cost} 범위의 카드만 사용할 수 있습니다`,
        });
      }
    }

    // 로스터에 배치된 카드인지 확인
    const [rosterResult]: any = await client.query(
      `SELECT top_player_id, jungle_player_id, mid_player_id, adc_player_id, support_player_id
       FROM rosters WHERE team_id = ?`,
      [team.id]
    );

    if (rosterResult.length > 0) {
      const roster = rosterResult[0];
      const rosterCardIds = [
        roster.top_player_id,
        roster.jungle_player_id,
        roster.mid_player_id,
        roster.adc_player_id,
        roster.support_player_id,
      ];

      for (const cardId of cardIds) {
        if (rosterCardIds.includes(cardId)) {
          await client.rollback();
          return res.status(400).json({ error: '로스터에 배치된 카드는 합성할 수 없습니다' });
        }
      }
    }

    // 합성 성공 여부 결정
    const success = Math.random() * 100 < recipe.success_rate;

    let rewardCardId = null;
    let rewardMoney = null;

    if (success) {
      if (recipe.reward_type === 'MONEY') {
        // 돈 보상
        rewardMoney = 20000000; // 2000만원
        await client.query(
          'UPDATE teams SET balance = balance + ? WHERE id = ?',
          [rewardMoney, team.id]
        );
      } else if (recipe.reward_type === 'TACTIC_CARD') {
        // 작전 카드 보상 (간단히 처리 - 실제로는 tactic_cards 테이블에서 선택)
        // TODO: 작전 카드 지급 로직 추가
        rewardCardId = 1; // 임시
      } else if (recipe.reward_type === 'SUPPORT_CARD') {
        // 서포트 카드 보상 (간단히 처리)
        // TODO: 서포트 카드 지급 로직 추가
        rewardCardId = 1; // 임시
      }
    }

    // 카드 제거
    await client.query(
      'DELETE FROM user_player_cards WHERE id IN (?)',
      [cardIds]
    );

    // 합성 기록 저장
    const [insertResult]: any = await client.query(
      `INSERT INTO fusion_history (
        team_id, recipe_id, sacrificed_cards, success,
        reward_type, reward_card_id, reward_money, fusion_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        team.id,
        recipeId,
        JSON.stringify(cardIds),
        success,
        recipe.reward_type,
        rewardCardId,
        rewardMoney,
      ]
    );

    // 합성 통계 업데이트
    await updateFusionStats(client, team.id, success, recipe.required_cards, recipe.reward_rarity);

    await client.commit();

    res.json({
      success,
      message: success
        ? `합성 성공! ${recipe.reward_rarity || ''} ${recipe.reward_type} 획득!`
        : '합성 실패... 카드가 소실되었습니다.',
      rewardType: recipe.reward_type,
      rewardRarity: recipe.reward_rarity,
      rewardMoney,
      rewardCardId,
    });
  } catch (error) {
    await client.rollback();
    console.error('합성 실행 오류:', error);
    res.status(500).json({ error: '합성 실행에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 합성 내역 조회
router.get('/history', isAuthenticated, async (req: Request, res: Response) => {
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
      `SELECT fh.*, fr.recipe_name, fr.reward_type, fr.reward_rarity
       FROM fusion_history fh
       JOIN fusion_recipes fr ON fh.recipe_id = fr.id
       WHERE fh.team_id = ?
       ORDER BY fh.fusion_date DESC
       LIMIT 50`,
      [teamId]
    );

    res.json({ history });
  } catch (error) {
    console.error('합성 내역 조회 오류:', error);
    res.status(500).json({ error: '합성 내역 조회에 실패했습니다' });
  }
});

// 합성 통계 조회
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
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

    const statsResult = await query(
      'SELECT * FROM fusion_stats WHERE team_id = ?',
      [teamId]
    );

    if (statsResult.length === 0) {
      // 통계가 없으면 초기화
      await query(
        'INSERT INTO fusion_stats (team_id) VALUES (?)',
        [teamId]
      );

      const newStatsResult = await query(
        'SELECT * FROM fusion_stats WHERE team_id = ?',
        [teamId]
      );

      return res.json({ stats: newStatsResult[0] });
    }

    res.json({ stats: statsResult[0] });
  } catch (error) {
    console.error('합성 통계 조회 오류:', error);
    res.status(500).json({ error: '합성 통계 조회에 실패했습니다' });
  }
});

// 합성 시뮬레이션 (미리 보기)
router.post('/simulate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { recipeId, cardIds } = req.body;

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    // 레시피 정보 조회
    const recipeResult = await query(
      'SELECT * FROM fusion_recipes WHERE id = ?',
      [recipeId]
    );

    if (recipeResult.length === 0) {
      return res.status(404).json({ error: '레시피를 찾을 수 없습니다' });
    }

    const recipe = recipeResult[0];

    // 카드 정보 조회
    const cardsResult = await query(
      `SELECT upc.id, pc.player_name, pc.cost, pc.power
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.id IN (?) AND upc.team_id = ?`,
      [cardIds, teamId]
    );

    // 합성 가능 여부 확인
    const isValid = cardsResult.length === recipe.required_cards;
    const totalValue = cardsResult.reduce((sum: number, card: any) => sum + card.power, 0);

    res.json({
      recipe,
      selectedCards: cardsResult,
      isValid,
      totalValue,
      successRate: recipe.success_rate,
      expectedReward: {
        type: recipe.reward_type,
        rarity: recipe.reward_rarity,
      },
    });
  } catch (error) {
    console.error('합성 시뮬레이션 오류:', error);
    res.status(500).json({ error: '합성 시뮬레이션에 실패했습니다' });
  }
});

// 합성 통계 업데이트 함수
async function updateFusionStats(
  client: any,
  teamId: string,
  success: boolean,
  cardsUsed: number,
  rewardRarity: string | null
) {
  const [statsResult]: any = await client.query(
    'SELECT * FROM fusion_stats WHERE team_id = ?',
    [teamId]
  );

  if (statsResult.length === 0) {
    await client.query(
      'INSERT INTO fusion_stats (team_id) VALUES (?)',
      [teamId]
    );
  }

  const legendaryObtained = success && rewardRarity === 'LEGEND' ? 1 : 0;

  await client.query(
    `UPDATE fusion_stats
     SET total_fusions = total_fusions + 1,
         successful_fusions = successful_fusions + ?,
         failed_fusions = failed_fusions + ?,
         total_cards_sacrificed = total_cards_sacrificed + ?,
         legendary_obtained = legendary_obtained + ?,
         success_rate = (successful_fusions + ?) * 100.0 / (total_fusions + 1)
     WHERE team_id = ?`,
    [
      success ? 1 : 0,
      success ? 0 : 1,
      cardsUsed,
      legendaryObtained,
      success ? 1 : 0,
      teamId,
    ]
  );
}

export default router;
