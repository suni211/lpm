import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { query, getConnection } from '../database/db';

const router = express.Router();

// 활성 경매 목록 조회
router.get('/active', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { position, minCost, maxCost, sortBy = 'auction_end_time' } = req.query;

    let sql = `
      SELECT a.*,
             pc.player_name, pc.position, pc.cost, pc.power, pc.team,
             t.team_name as seller_team_name,
             TIMESTAMPDIFF(SECOND, NOW(), a.auction_end_time) as time_remaining
      FROM auctions a
      JOIN player_cards pc ON a.player_card_id = pc.id
      JOIN teams t ON a.seller_team_id = t.id
      WHERE a.status = 'ACTIVE'
      AND a.auction_end_time > NOW()
    `;
    const params: any[] = [];

    if (position) {
      sql += ' AND pc.position = ?';
      params.push(position);
    }

    if (minCost) {
      sql += ' AND pc.cost >= ?';
      params.push(Number(minCost));
    }

    if (maxCost) {
      sql += ' AND pc.cost <= ?';
      params.push(Number(maxCost));
    }

    // 정렬
    if (sortBy === 'price_low') {
      sql += ' ORDER BY a.current_price ASC';
    } else if (sortBy === 'price_high') {
      sql += ' ORDER BY a.current_price DESC';
    } else if (sortBy === 'ending_soon') {
      sql += ' ORDER BY a.auction_end_time ASC';
    } else {
      sql += ' ORDER BY a.auction_end_time ASC';
    }

    const auctions = await query(sql, params);

    res.json({ auctions });
  } catch (error) {
    console.error('경매 목록 조회 오류:', error);
    res.status(500).json({ error: '경매 목록 조회에 실패했습니다' });
  }
});

// 특정 경매 상세 조회
router.get('/:auctionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { auctionId } = req.params;

    const auctionResult = await query(
      `SELECT a.*,
              pc.player_name, pc.position, pc.cost, pc.power, pc.team, pc.level, pc.exp,
              pc.mental, pc.team_fight, pc.cs_ability, pc.vision, pc.judgment, pc.laning,
              t.team_name as seller_team_name,
              TIMESTAMPDIFF(SECOND, NOW(), a.auction_end_time) as time_remaining
       FROM auctions a
       JOIN player_cards pc ON a.player_card_id = pc.id
       JOIN teams t ON a.seller_team_id = t.id
       WHERE a.id = ?`,
      [auctionId]
    );

    if (auctionResult.length === 0) {
      return res.status(404).json({ error: '경매를 찾을 수 없습니다' });
    }

    // 입찰 내역 조회
    const bids = await query(
      `SELECT ab.*, t.team_name
       FROM auction_bids ab
       JOIN teams t ON ab.bidder_team_id = t.id
       WHERE ab.auction_id = ?
       ORDER BY ab.bid_time DESC
       LIMIT 10`,
      [auctionId]
    );

    res.json({
      auction: auctionResult[0],
      bids,
    });
  } catch (error) {
    console.error('경매 상세 조회 오류:', error);
    res.status(500).json({ error: '경매 상세 조회에 실패했습니다' });
  }
});

// 경매 등록
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { playerCardId, startingPrice, buyoutPrice, durationHours = 24 } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    if (teamResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
    }

    const teamId = teamResult[0].id;

    // 선수 카드 소유권 확인
    const [ownerResult]: any = await client.query(
      `SELECT upc.*, r.top_player_id, r.jungle_player_id, r.mid_player_id, r.adc_player_id, r.support_player_id
       FROM user_player_cards upc
       LEFT JOIN rosters r ON upc.team_id = r.team_id
       WHERE upc.player_card_id = ? AND upc.team_id = ?`,
      [playerCardId, teamId]
    );

    if (ownerResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '선수 카드를 찾을 수 없습니다' });
    }

    const roster = ownerResult[0];

    // 로스터에 배치된 선수는 경매 불가
    const userPlayerCardId = ownerResult[0].id;
    if (
      userPlayerCardId === roster.top_player_id ||
      userPlayerCardId === roster.jungle_player_id ||
      userPlayerCardId === roster.mid_player_id ||
      userPlayerCardId === roster.adc_player_id ||
      userPlayerCardId === roster.support_player_id
    ) {
      await client.rollback();
      return res.status(400).json({ error: '로스터에 배치된 선수는 경매에 등록할 수 없습니다' });
    }

    // 가격 검증
    if (startingPrice < 1000000) {
      await client.rollback();
      return res.status(400).json({ error: '시작 가격은 최소 100만원 이상이어야 합니다' });
    }

    if (buyoutPrice && buyoutPrice <= startingPrice) {
      await client.rollback();
      return res.status(400).json({ error: '즉시 구매 가격은 시작 가격보다 높아야 합니다' });
    }

    // 경매 생성
    const auctionEndTime = new Date();
    auctionEndTime.setHours(auctionEndTime.getHours() + durationHours);

    const [insertResult]: any = await client.query(
      `INSERT INTO auctions (
        seller_team_id, player_card_id, starting_price, current_price,
        buyout_price, auction_start_time, auction_end_time, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, 'ACTIVE')`,
      [teamId, playerCardId, startingPrice, startingPrice, buyoutPrice || null, auctionEndTime]
    );

    const auctionId = insertResult.insertId;

    await client.commit();

    res.json({
      message: '경매가 등록되었습니다',
      auctionId,
      auctionEndTime,
    });
  } catch (error) {
    await client.rollback();
    console.error('경매 등록 오류:', error);
    res.status(500).json({ error: '경매 등록에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 입찰
router.post('/:auctionId/bid', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { auctionId } = req.params;
    const { bidAmount, isBuyout = false } = req.body;

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

    // 경매 정보 조회
    const [auctionResult]: any = await client.query(
      'SELECT * FROM auctions WHERE id = ?',
      [auctionId]
    );

    if (auctionResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '경매를 찾을 수 없습니다' });
    }

    const auction = auctionResult[0];

    // 경매 상태 확인
    if (auction.status !== 'ACTIVE') {
      await client.rollback();
      return res.status(400).json({ error: '진행 중인 경매가 아닙니다' });
    }

    if (new Date(auction.auction_end_time) < new Date()) {
      await client.rollback();
      return res.status(400).json({ error: '경매가 종료되었습니다' });
    }

    // 자신의 경매에는 입찰 불가
    if (auction.seller_team_id === team.id) {
      await client.rollback();
      return res.status(400).json({ error: '자신의 경매에는 입찰할 수 없습니다' });
    }

    // 즉시 구매
    if (isBuyout) {
      if (!auction.buyout_price) {
        await client.rollback();
        return res.status(400).json({ error: '즉시 구매가 설정되지 않은 경매입니다' });
      }

      if (team.balance < auction.buyout_price) {
        await client.rollback();
        return res.status(400).json({ error: '잔액이 부족합니다' });
      }

      // 즉시 구매 처리
      await processBuyout(client, auction, team.id, auction.buyout_price);

      await client.commit();

      return res.json({
        message: '즉시 구매가 완료되었습니다!',
        finalPrice: auction.buyout_price,
      });
    }

    // 일반 입찰
    if (bidAmount <= auction.current_price) {
      await client.rollback();
      return res.status(400).json({ error: '현재가보다 높은 금액을 입찰해주세요' });
    }

    const minBidIncrement = 1000000; // 최소 입찰 단위 100만원
    if (bidAmount < auction.current_price + minBidIncrement) {
      await client.rollback();
      return res.status(400).json({ error: `최소 ${minBidIncrement.toLocaleString()}원 이상 입찰해야 합니다` });
    }

    if (team.balance < bidAmount) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 기존 최고가 입찰 업데이트
    await client.query(
      'UPDATE auction_bids SET is_highest = FALSE WHERE auction_id = ?',
      [auctionId]
    );

    // 입찰 등록
    await client.query(
      `INSERT INTO auction_bids (auction_id, bidder_team_id, bid_amount, bid_time, is_highest)
       VALUES (?, ?, ?, NOW(), TRUE)`,
      [auctionId, team.id, bidAmount]
    );

    // 경매 현재가 업데이트
    await client.query(
      `UPDATE auctions
       SET current_price = ?,
           highest_bidder_team_id = ?,
           bid_count = bid_count + 1
       WHERE id = ?`,
      [bidAmount, team.id, auctionId]
    );

    // 이전 최고가 입찰자에게 알림
    if (auction.highest_bidder_team_id) {
      await client.query(
        `INSERT INTO auction_notifications (team_id, auction_id, notification_type, message)
         VALUES (?, ?, 'OUTBID', '입찰가가 갱신되었습니다')`,
        [auction.highest_bidder_team_id, auctionId]
      );
    }

    await client.commit();

    res.json({
      message: '입찰이 완료되었습니다',
      currentPrice: bidAmount,
    });
  } catch (error) {
    await client.rollback();
    console.error('입찰 오류:', error);
    res.status(500).json({ error: '입찰에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 경매 취소
router.post('/:auctionId/cancel', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { auctionId } = req.params;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    // 경매 정보 조회
    const [auctionResult]: any = await client.query(
      'SELECT * FROM auctions WHERE id = ? AND seller_team_id = ?',
      [auctionId, teamId]
    );

    if (auctionResult.length === 0) {
      await client.rollback();
      return res.status(404).json({ error: '경매를 찾을 수 없습니다' });
    }

    const auction = auctionResult[0];

    // 입찰이 있으면 취소 불가
    if (auction.bid_count > 0) {
      await client.rollback();
      return res.status(400).json({ error: '입찰이 있는 경매는 취소할 수 없습니다' });
    }

    // 경매 취소
    await client.query(
      'UPDATE auctions SET status = "CANCELLED" WHERE id = ?',
      [auctionId]
    );

    await client.commit();

    res.json({ message: '경매가 취소되었습니다' });
  } catch (error) {
    await client.rollback();
    console.error('경매 취소 오류:', error);
    res.status(500).json({ error: '경매 취소에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 내 입찰 목록 조회
router.get('/my/bids', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    const bids = await query(
      `SELECT ab.*, a.status, a.current_price, a.auction_end_time,
              pc.player_name, pc.position, pc.cost, pc.power,
              ab.is_highest
       FROM auction_bids ab
       JOIN auctions a ON ab.auction_id = a.id
       JOIN player_cards pc ON a.player_card_id = pc.id
       WHERE ab.bidder_team_id = ?
       ORDER BY ab.bid_time DESC
       LIMIT 20`,
      [teamId]
    );

    res.json({ bids });
  } catch (error) {
    console.error('입찰 목록 조회 오류:', error);
    res.status(500).json({ error: '입찰 목록 조회에 실패했습니다' });
  }
});

// 내 경매 목록 조회
router.get('/my/auctions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const teamResult = await query(
      'SELECT id FROM teams WHERE user_id = ?',
      [req.user.id]
    );

    const teamId = teamResult[0].id;

    const auctions = await query(
      `SELECT a.*,
              pc.player_name, pc.position, pc.cost, pc.power,
              TIMESTAMPDIFF(SECOND, NOW(), a.auction_end_time) as time_remaining
       FROM auctions a
       JOIN player_cards pc ON a.player_card_id = pc.id
       WHERE a.seller_team_id = ?
       ORDER BY a.created_at DESC
       LIMIT 20`,
      [teamId]
    );

    res.json({ auctions });
  } catch (error) {
    console.error('경매 목록 조회 오류:', error);
    res.status(500).json({ error: '경매 목록 조회에 실패했습니다' });
  }
});

// 즉시 구매 처리 함수
async function processBuyout(client: any, auction: any, buyerTeamId: string, price: number) {
  // 구매자 잔액 차감
  await client.query(
    'UPDATE teams SET balance = balance - ? WHERE id = ?',
    [price, buyerTeamId]
  );

  // 판매자에게 수익 지급 (10% 수수료)
  const fee = Math.floor(price * 0.1);
  const revenue = price - fee;

  await client.query(
    'UPDATE teams SET balance = balance + ? WHERE id = ?',
    [revenue, auction.seller_team_id]
  );

  // 선수 카드 이전
  await client.query(
    'UPDATE user_player_cards SET team_id = ? WHERE player_card_id = ? AND team_id = ?',
    [buyerTeamId, auction.player_card_id, auction.seller_team_id]
  );

  // 경매 상태 업데이트
  await client.query(
    'UPDATE auctions SET status = "SOLD", highest_bidder_team_id = ?, current_price = ? WHERE id = ?',
    [buyerTeamId, price, auction.id]
  );

  // 입찰 기록 추가
  await client.query(
    `INSERT INTO auction_bids (auction_id, bidder_team_id, bid_amount, bid_time, is_highest, is_buyout)
     VALUES (?, ?, ?, NOW(), TRUE, TRUE)`,
    [auction.id, buyerTeamId, price]
  );

  // 거래 내역 저장
  await client.query(
    `INSERT INTO auction_transactions (
      auction_id, seller_team_id, buyer_team_id, player_card_id,
      final_price, seller_fee, seller_revenue, transaction_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [auction.id, auction.seller_team_id, buyerTeamId, auction.player_card_id, price, fee, revenue]
  );

  // 알림 생성
  await client.query(
    `INSERT INTO auction_notifications (team_id, auction_id, notification_type, message)
     VALUES (?, ?, 'SOLD', '경매가 즉시 구매로 낙찰되었습니다')`,
    [auction.seller_team_id, auction.id]
  );

  await client.query(
    `INSERT INTO auction_notifications (team_id, auction_id, notification_type, message)
     VALUES (?, ?, 'WON', '경매에서 선수를 즉시 구매했습니다')`,
    [buyerTeamId, auction.id]
  );
}

export default router;
