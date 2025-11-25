import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { drawCard, CardPackType, CARD_PACK_PRICES } from '../services/gachaService';
import pool, { query } from '../database/db';

const router = express.Router();

// 카드팩 정보 조회
router.get('/packs', isAuthenticated, (req: Request, res: Response) => {
  res.json({
    packs: [
      {
        type: CardPackType.BASIC,
        name: '베이직 팩',
        price: CARD_PACK_PRICES[CardPackType.BASIC],
        description: '파워 400 이하의 선수 카드',
        icon: '📦',
      },
      {
        type: CardPackType.PREMIUM,
        name: '프리미엄 팩',
        price: CARD_PACK_PRICES[CardPackType.PREMIUM],
        description: '파워 400 이상의 강력한 선수 카드',
        icon: '🎁',
      },
      {
        type: CardPackType.LEGEND,
        name: '레전드 팩',
        price: CARD_PACK_PRICES[CardPackType.LEGEND],
        description: '모든 등급의 선수를 획득할 수 있는 최상급 팩',
        icon: '💎',
      },
    ],
  });
});

// 카드 뽑기
router.post('/draw', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { packType } = req.body;

    if (!packType || !Object.values(CardPackType).includes(packType)) {
      return res.status(400).json({ error: '유효하지 않은 카드팩 타입입니다' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await drawCard(req.user.id, packType);

    res.json(result);
  } catch (error) {
    console.error('카드 뽑기 오류:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : '카드 뽑기에 실패했습니다',
    });
  }
});

// 카드 컬렉션 조회 (내가 보유한 카드들)
router.get('/collection', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 선수 카드
    const playerCards = await query(
      `SELECT
        upc.*,
        pc.card_name,
        pc.card_image,
        pc.position,
        pc.cost,
        pc.mental,
        pc.team_fight,
        pc.cs_ability,
        pc.vision,
        pc.judgment,
        pc.laning,
        pc.power,
        pc.rarity
       FROM user_player_cards upc
       JOIN player_cards pc ON upc.player_card_id = pc.id
       WHERE upc.user_id = ?
       ORDER BY pc.power DESC, upc.acquired_at DESC`,
      [req.user.id]
    );

    // 감독 카드
    const coachCards = await query(
      `SELECT
        ucc.*,
        cc.coach_name,
        cc.coach_image,
        cc.command,
        cc.ban_pick,
        cc.meta,
        cc.cold,
        cc.warm,
        cc.power,
        cc.rarity
       FROM user_coach_cards ucc
       JOIN coach_cards cc ON ucc.coach_card_id = cc.id
       WHERE ucc.user_id = ?
       ORDER BY cc.power DESC, ucc.acquired_at DESC`,
      [req.user.id]
    );

    // 작전 카드
    const tacticCards = await query(
      `SELECT
        utc.*,
        tc.tactic_name,
        tc.tactic_image,
        tc.position,
        tc.effect_description,
        tc.effect_type,
        tc.effect_value,
        tc.rarity
       FROM user_tactic_cards utc
       JOIN tactic_cards tc ON utc.tactic_card_id = tc.id
       WHERE utc.user_id = ?
       ORDER BY utc.quantity DESC, utc.acquired_at DESC`,
      [req.user.id]
    );

    // 서포트 카드
    const supportCards = await query(
      `SELECT
        usc.*,
        sc.support_name,
        sc.support_image,
        sc.effect_description,
        sc.effect_type,
        sc.effect_value,
        sc.rarity
       FROM user_support_cards usc
       JOIN support_cards sc ON usc.support_card_id = sc.id
       WHERE usc.user_id = ?
       ORDER BY usc.quantity DESC, usc.acquired_at DESC`,
      [req.user.id]
    );

    res.json({
      players: playerCards,
      coaches: coachCards,
      tactics: tacticCards,
      supports: supportCards,
    });
  } catch (error) {
    console.error('컬렉션 조회 오류:', error);
    res.status(500).json({ error: '컬렉션 조회에 실패했습니다' });
  }
});

export default router;
