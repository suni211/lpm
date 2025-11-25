import { getConnection } from '../database/db';

// 카드팩 종류 및 가격
export enum CardPackType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  LEGEND = 'LEGEND',
}

export const CARD_PACK_PRICES = {
  [CardPackType.BASIC]: 10000000,    // 1천만원 - 파워 400 이하
  [CardPackType.PREMIUM]: 20000000,  // 2천만원 - 파워 400 이상
  [CardPackType.LEGEND]: 50000000,   // 5천만원 - 모든 파워
};

// 카드 타입별 확률 (총 100%)
const CARD_TYPE_PROBABILITY = {
  PLAYER: 70,   // 70% 선수 카드
  TACTIC: 20,   // 20% 작전 카드
  SUPPORT: 7,   // 7% 서포트 카드
  COACH: 3,     // 3% 감독 카드
};

interface GachaResult {
  card_type: 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT';
  card: any;
  is_duplicate: boolean;
  experience_gained?: number;
  user_card_id?: string;
}

/**
 * 카드 뽑기 메인 함수
 */
export async function drawCard(
  userId: string,
  packType: CardPackType
): Promise<GachaResult> {
  const client = await getConnection();

  try {
    await client.beginTransaction();

    // 1. 사용자 팀 조회 및 잔액 확인
    const [teamResult]: any = await client.query(
      'SELECT * FROM teams WHERE user_id = ?',
      [userId]
    );

    if (teamResult.length === 0) {
      throw new Error('팀을 찾을 수 없습니다');
    }

    const team = teamResult[0];
    const packPrice = CARD_PACK_PRICES[packType];

    if (team.balance < packPrice) {
      throw new Error('잔액이 부족합니다');
    }

    // 2. 카드 타입 결정 (확률 기반)
    const cardType = getRandomCardType();

    // 3. 파워 제한에 따라 카드 뽑기
    let card: any;
    let isDuplicate = false;
    let experienceGained = 0;
    let userCardId: string | undefined;

    if (cardType === 'PLAYER') {
      const playerResult = await drawPlayerCard(client, userId, packType);
      card = playerResult.card;
      isDuplicate = playerResult.isDuplicate;
      experienceGained = playerResult.experienceGained;
      userCardId = playerResult.userCardId;
    } else if (cardType === 'COACH') {
      const coachResult = await drawCoachCard(client, userId, packType);
      card = coachResult.card;
      isDuplicate = coachResult.isDuplicate;
    } else if (cardType === 'TACTIC') {
      const tacticResult = await drawTacticCard(client, userId, packType);
      card = tacticResult.card;
    } else {
      const supportResult = await drawSupportCard(client, userId, packType);
      card = supportResult.card;
    }

    // 4. 잔액 차감
    await client.query(
      'UPDATE teams SET balance = balance - ? WHERE user_id = ?',
      [packPrice, userId]
    );

    await client.commit();

    return {
      card_type: cardType,
      card,
      is_duplicate: isDuplicate,
      experience_gained: experienceGained,
      user_card_id: userCardId,
    };
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 랜덤 카드 타입 결정
 */
function getRandomCardType(): 'PLAYER' | 'COACH' | 'TACTIC' | 'SUPPORT' {
  const rand = Math.random() * 100;

  if (rand < CARD_TYPE_PROBABILITY.PLAYER) {
    return 'PLAYER';
  } else if (rand < CARD_TYPE_PROBABILITY.PLAYER + CARD_TYPE_PROBABILITY.TACTIC) {
    return 'TACTIC';
  } else if (
    rand <
    CARD_TYPE_PROBABILITY.PLAYER +
      CARD_TYPE_PROBABILITY.TACTIC +
      CARD_TYPE_PROBABILITY.SUPPORT
  ) {
    return 'SUPPORT';
  } else {
    return 'COACH';
  }
}

/**
 * 선수 카드 뽑기
 */
async function drawPlayerCard(client: any, userId: string, packType: CardPackType) {
  // 파워 제한 조건
  let powerCondition = '';
  if (packType === CardPackType.BASIC) {
    powerCondition = 'AND power <= 400';
  } else if (packType === CardPackType.PREMIUM) {
    powerCondition = 'AND power > 400';
  }
  // LEGEND는 조건 없음 (모든 파워)

  // 랜덤 선수 카드 선택
  const [cardResult]: any = await client.query(
    `SELECT * FROM player_cards
     WHERE 1=1 ${powerCondition}
     ORDER BY RAND()
     LIMIT 1`
  );

  if (cardResult.length === 0) {
    throw new Error('뽑을 수 있는 카드가 없습니다');
  }

  const card = cardResult[0];

  // 중복 확인
  const [duplicateCheck]: any = await client.query(
    `SELECT * FROM user_player_cards
     WHERE user_id = ? AND player_card_id = ?`,
    [userId, card.id]
  );

  if (duplicateCheck.length > 0) {
    // 중복! 경험치 1000 증가
    const userCard = duplicateCheck[0];
    await client.query(
      `UPDATE user_player_cards
       SET experience = experience + 1000
       WHERE id = ?`,
      [userCard.id]
    );

    return {
      card,
      isDuplicate: true,
      experienceGained: 1000,
      userCardId: userCard.id,
    };
  } else {
    // 새 카드! 인벤토리에 추가
    const insertResult: any = await client.query(
      `INSERT INTO user_player_cards
       (user_id, player_card_id, level, experience, \`condition\`, form, traits)
       VALUES (?, ?, 1, 0, 'YELLOW', 0, '[]')`,
      [userId, card.id]
    );

    return {
      card,
      isDuplicate: false,
      experienceGained: 0,
      userCardId: insertResult.insertId,
    };
  }
}

/**
 * 감독 카드 뽑기
 */
async function drawCoachCard(client: any, userId: string, packType: CardPackType) {
  let powerCondition = '';
  if (packType === CardPackType.BASIC) {
    powerCondition = 'AND power <= 400';
  } else if (packType === CardPackType.PREMIUM) {
    powerCondition = 'AND power > 400';
  }

  const [cardResult]: any = await client.query(
    `SELECT * FROM coach_cards
     WHERE 1=1 ${powerCondition}
     ORDER BY RAND()
     LIMIT 1`
  );

  if (cardResult.length === 0) {
    throw new Error('뽑을 수 있는 감독 카드가 없습니다');
  }

  const card = cardResult[0];

  // 중복 확인
  const [duplicateCheck]: any = await client.query(
    `SELECT * FROM user_coach_cards
     WHERE user_id = ? AND coach_card_id = ?`,
    [userId, card.id]
  );

  if (duplicateCheck.length > 0) {
    // 이미 보유 중 (감독은 경험치 없음)
    return { card, isDuplicate: true };
  } else {
    // 새 카드 추가
    await client.query(
      `INSERT INTO user_coach_cards (user_id, coach_card_id)
       VALUES (?, ?)`,
      [userId, card.id]
    );

    return { card, isDuplicate: false };
  }
}

/**
 * 작전 카드 뽑기
 */
async function drawTacticCard(client: any, userId: string, packType: CardPackType) {
  const [cardResult]: any = await client.query(
    `SELECT * FROM tactic_cards
     ORDER BY RAND()
     LIMIT 1`
  );

  const card = cardResult[0];

  // 작전 카드는 수량 증가
  const [existingCard]: any = await client.query(
    `SELECT * FROM user_tactic_cards
     WHERE user_id = ? AND tactic_card_id = ?`,
    [userId, card.id]
  );

  if (existingCard.length > 0) {
    await client.query(
      `UPDATE user_tactic_cards
       SET quantity = quantity + 1
       WHERE user_id = ? AND tactic_card_id = ?`,
      [userId, card.id]
    );
  } else {
    await client.query(
      `INSERT INTO user_tactic_cards (user_id, tactic_card_id, quantity)
       VALUES (?, ?, 1)`,
      [userId, card.id]
    );
  }

  return { card };
}

/**
 * 서포트 카드 뽑기
 */
async function drawSupportCard(client: any, userId: string, packType: CardPackType) {
  const [cardResult]: any = await client.query(
    `SELECT * FROM support_cards
     ORDER BY RAND()
     LIMIT 1`
  );

  const card = cardResult[0];

  // 서포트 카드는 수량 증가
  const [existingCard]: any = await client.query(
    `SELECT * FROM user_support_cards
     WHERE user_id = ? AND support_card_id = ?`,
    [userId, card.id]
  );

  if (existingCard.length > 0) {
    await client.query(
      `UPDATE user_support_cards
       SET quantity = quantity + 1
       WHERE user_id = ? AND support_card_id = ?`,
      [userId, card.id]
    );
  } else {
    await client.query(
      `INSERT INTO user_support_cards (user_id, support_card_id, quantity)
       VALUES (?, ?, 1)`,
      [userId, card.id]
    );
  }

  return { card };
}
