import express, { Request, Response } from 'express';
import pool, { query, getConnection } from '../database/db';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// 경매 목록 조회
router.get('/auctions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        p.*,
        pc.card_name,
        pc.position,
        pc.cost,
        pc.power,
        pc.rarity,
        t.team_name as seller_team_name,
        u.display_name as seller_name,
        (SELECT COUNT(*) FROM auction_bids WHERE auction_id = p.id) as bid_count,
        (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = p.id) as highest_bid
      FROM postings p
      JOIN user_player_cards upc ON p.user_card_id = upc.id
      JOIN player_cards pc ON upc.player_card_id = pc.id
      JOIN teams t ON p.seller_team_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE p.status = 'active'
        AND p.end_time > NOW()
      ORDER BY p.created_at DESC
    `);

    res.json({ auctions: result });
  } catch (error) {
    console.error('경매 목록 조회 실패:', error);
    res.status(500).json({ error: '경매 목록 조회에 실패했습니다' });
  }
});

// 내 경매 목록 조회
router.get('/my-auctions', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const teamResult = await query('SELECT id FROM teams WHERE user_id = ?', [userId]);
    const teamId = teamResult[0].id;

    const result = await query(`
      SELECT
        p.*,
        pc.card_name,
        pc.position,
        pc.cost,
        pc.power,
        pc.rarity,
        (SELECT COUNT(*) FROM auction_bids WHERE auction_id = p.id) as bid_count,
        (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = p.id) as highest_bid
      FROM postings p
      JOIN user_player_cards upc ON p.user_card_id = upc.id
      JOIN player_cards pc ON upc.player_card_id = pc.id
      WHERE p.seller_team_id = ?
      ORDER BY p.created_at DESC
      LIMIT 20
    `, [teamId]);

    res.json({ auctions: result });
  } catch (error) {
    console.error('내 경매 목록 조회 실패:', error);
    res.status(500).json({ error: '경매 목록 조회에 실패했습니다' });
  }
});

// 경매 등록
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    const userId = req.user?.id;
    const { userCardId, startingPrice, buyoutPrice, durationHours } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query('SELECT id FROM teams WHERE user_id = ?', [userId]);
    const teamId = teamResult[0].id;

    // 카드 소유 확인
    const [cardCheck]: any = await client.query(
      'SELECT * FROM user_player_cards WHERE id = ? AND team_id = ? AND is_in_roster = false',
      [userCardId, teamId]
    );

    if (cardCheck.length === 0) {
      await client.rollback();
      return res.status(400).json({ error: '해당 카드를 소유하고 있지 않거나 로스터에 배치된 카드입니다' });
    }

    // 경매 생성
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + (durationHours || 24));

    const [postingInsert]: any = await client.query(`
      INSERT INTO postings (
        user_card_id,
        seller_team_id,
        starting_price,
        buyout_price,
        end_time,
        status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `, [userCardId, teamId, startingPrice, buyoutPrice, endTime]);

    const newPosting = await query('SELECT * FROM postings WHERE id = ?', [postingInsert.insertId]);

    // 카드를 경매 상태로 변경
    await client.query(
      'UPDATE user_player_cards SET is_on_auction = true WHERE id = ?',
      [userCardId]
    );

    await client.commit();

    res.json({
      message: '경매가 등록되었습니다',
      posting: newPosting[0]
    });
  } catch (error) {
    await client.rollback();
    console.error('경매 등록 실패:', error);
    res.status(500).json({ error: '경매 등록에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 입찰
router.post('/bid', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    const userId = req.user?.id;
    const { auctionId, bidAmount } = req.body;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query('SELECT id, balance FROM teams WHERE user_id = ?', [userId]);
    const team = teamResult[0];

    if (team.balance < bidAmount) {
      await client.rollback();
      return res.status(400).json({ error: '잔액이 부족합니다' });
    }

    // 경매 정보 조회
    const [auctionResult]: any = await client.query(`
      SELECT p.*,
        (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = p.id) as current_highest_bid
      FROM postings p
      WHERE p.id = ? AND p.status = 'active' AND p.end_time > NOW()
    `, [auctionId]);

    if (auctionResult.length === 0) {
      await client.rollback();
      return res.status(400).json({ error: '유효하지 않은 경매입니다' });
    }

    const auction = auctionResult[0];

    // 자신의 경매인지 확인
    if (auction.seller_team_id === team.id) {
      await client.rollback();
      return res.status(400).json({ error: '자신의 경매에는 입찰할 수 없습니다' });
    }

    // 최소 입찰가 확인
    const minimumBid = auction.current_highest_bid
      ? auction.current_highest_bid + 1000000  // 현재 최고가 + 100만원
      : auction.starting_price;

    if (bidAmount < minimumBid) {
      await client.rollback();
      return res.status(400).json({
        error: `최소 입찰가는 ${minimumBid.toLocaleString()}원입니다`
      });
    }

    // 즉시 구매가 확인
    const isBuyout = auction.buyout_price && bidAmount >= auction.buyout_price;

    // 입찰 기록
    await client.query(`
      INSERT INTO auction_bids (auction_id, bidder_team_id, bid_amount)
      VALUES (?, ?, ?)
    `, [auctionId, team.id, bidAmount]);

    // 즉시 구매인 경우
    if (isBuyout) {
      // 카드 이전
      await client.query(`
        UPDATE user_player_cards
        SET team_id = ?, is_on_auction = false
        WHERE id = ?
      `, [team.id, auction.user_card_id]);

      // 판매자에게 금액 지급
      await client.query(
        'UPDATE teams SET balance = balance + ? WHERE id = ?',
        [bidAmount, auction.seller_team_id]
      );

      // 구매자 잔액 차감
      await client.query(
        'UPDATE teams SET balance = balance - ? WHERE id = ?',
        [bidAmount, team.id]
      );

      // 경매 종료
      await client.query(
        "UPDATE postings SET status = 'completed', winner_team_id = ?, final_price = ? WHERE id = ?",
        [team.id, bidAmount, auctionId]
      );

      await client.commit();
      return res.json({
        message: '즉시 구매가 완료되었습니다!',
        isBuyout: true
      });
    }

    await client.commit();

    res.json({
      message: '입찰이 완료되었습니다',
      isBuyout: false
    });
  } catch (error) {
    await client.rollback();
    console.error('입찰 실패:', error);
    res.status(500).json({ error: '입찰에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 경매 취소
router.post('/cancel/:auctionId', isAuthenticated, async (req: Request, res: Response) => {
  const client = await getConnection();

  try {
    const userId = req.user?.id;
    const { auctionId } = req.params;

    await client.beginTransaction();

    // 팀 정보 조회
    const [teamResult]: any = await client.query('SELECT id FROM teams WHERE user_id = ?', [userId]);
    const teamId = teamResult[0].id;

    // 경매 정보 조회
    const [auctionResult]: any = await client.query(
      'SELECT * FROM postings WHERE id = ? AND seller_team_id = ? AND status = ?',
      [auctionId, teamId, 'active']
    );

    if (auctionResult.length === 0) {
      await client.rollback();
      return res.status(400).json({ error: '취소할 수 없는 경매입니다' });
    }

    const auction = auctionResult[0];

    // 입찰이 있는지 확인
    const [bidCheck]: any = await client.query(
      'SELECT COUNT(*) as count FROM auction_bids WHERE auction_id = ?',
      [auctionId]
    );

    if (bidCheck[0].count > 0) {
      await client.rollback();
      return res.status(400).json({ error: '입찰이 있는 경매는 취소할 수 없습니다' });
    }

    // 경매 취소
    await client.query(
      "UPDATE postings SET status = 'cancelled' WHERE id = ?",
      [auctionId]
    );

    // 카드 상태 복구
    await client.query(
      'UPDATE user_player_cards SET is_on_auction = false WHERE id = ?',
      [auction.user_card_id]
    );

    await client.commit();

    res.json({ message: '경매가 취소되었습니다' });
  } catch (error) {
    await client.rollback();
    console.error('경매 취소 실패:', error);
    res.status(500).json({ error: '경매 취소에 실패했습니다' });
  } finally {
    client.release();
  }
});

// 경매 상세 정보 조회
router.get('/:auctionId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { auctionId } = req.params;

    // 경매 정보
    const auctionResult = await query(`
      SELECT
        p.*,
        pc.card_name,
        pc.position,
        pc.cost,
        pc.power,
        pc.rarity,
        pc.mental,
        pc.team_fight,
        pc.cs_ability,
        pc.vision,
        pc.judgment,
        pc.laning,
        pc.team as player_team,
        pc.nationality,
        t.team_name as seller_team_name,
        u.display_name as seller_name
      FROM postings p
      JOIN user_player_cards upc ON p.user_card_id = upc.id
      JOIN player_cards pc ON upc.player_card_id = pc.id
      JOIN teams t ON p.seller_team_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE p.id = ?
    `, [auctionId]);

    if (auctionResult.length === 0) {
      return res.status(404).json({ error: '경매를 찾을 수 없습니다' });
    }

    // 입찰 내역
    const bidsResult = await query(`
      SELECT
        ab.*,
        t.team_name as bidder_team_name
      FROM auction_bids ab
      JOIN teams t ON ab.bidder_team_id = t.id
      WHERE ab.auction_id = ?
      ORDER BY ab.bid_amount DESC, ab.bid_time DESC
      LIMIT 10
    `, [auctionId]);

    res.json({
      auction: auctionResult[0],
      bids: bidsResult
    });
  } catch (error) {
    console.error('경매 상세 조회 실패:', error);
    res.status(500).json({ error: '경매 조회에 실패했습니다' });
  }
});

export default router;
