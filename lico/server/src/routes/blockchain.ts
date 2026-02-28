import express, { Request, Response } from 'express';
import { query } from '../database/db';
import blockchainService from '../services/blockchainService';
import { isAdmin } from '../middleware/auth';

const router = express.Router();

// 블록 목록 조회
router.get('/blocks', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const blocks = await query(
      `SELECT * FROM blockchain_blocks
       ORDER BY block_number DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );

    const countResult = await query('SELECT COUNT(*) as total FROM blockchain_blocks');

    res.json({
      blocks,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('블록 목록 조회 오류:', error);
    res.status(500).json({ error: '블록 목록 조회 실패' });
  }
});

// 블록 상세 조회
router.get('/blocks/:block_number', async (req: Request, res: Response) => {
  try {
    const { block_number } = req.params;

    const blocks = await query('SELECT * FROM blockchain_blocks WHERE block_number = ?', [
      Number(block_number),
    ]);

    if (blocks.length === 0) {
      return res.status(404).json({ error: '블록을 찾을 수 없습니다' });
    }

    const block = blocks[0];

    // 블록에 포함된 거래 조회
    const transactions = await query(
      'SELECT * FROM blockchain_transactions WHERE block_id = ? ORDER BY created_at ASC',
      [block.id]
    );

    res.json({
      block,
      transactions,
    });
  } catch (error) {
    console.error('블록 조회 오류:', error);
    res.status(500).json({ error: '블록 조회 실패' });
  }
});

// 거래 조회 (해시로)
router.get('/transactions/:tx_hash', async (req: Request, res: Response) => {
  try {
    const { tx_hash } = req.params;

    const transactions = await query(
      `SELECT t.*, b.block_number, b.current_hash as block_hash
       FROM blockchain_transactions t
       LEFT JOIN blockchain_blocks b ON t.block_id = b.id
       WHERE t.tx_hash = ?`,
      [tx_hash]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: '거래를 찾을 수 없습니다' });
    }

    res.json({ transaction: transactions[0] });
  } catch (error) {
    console.error('거래 조회 오류:', error);
    res.status(500).json({ error: '거래 조회 실패' });
  }
});

// 주소별 거래 내역
router.get('/transactions/address/:wallet_address', async (req: Request, res: Response) => {
  try {
    const { wallet_address } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const transactions = await query(
      `SELECT t.*, b.block_number
       FROM blockchain_transactions t
       LEFT JOIN blockchain_blocks b ON t.block_id = b.id
       WHERE t.from_address = ? OR t.to_address = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [wallet_address, wallet_address, Number(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) as total FROM blockchain_transactions WHERE from_address = ? OR to_address = ?',
      [wallet_address, wallet_address]
    );

    res.json({
      transactions,
      total: countResult[0].total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    console.error('주소 거래 내역 조회 오류:', error);
    res.status(500).json({ error: '주소 거래 내역 조회 실패' });
  }
});

// 대기 중인 거래 목록
router.get('/transactions/pending', async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    const transactions = await query(
      `SELECT * FROM blockchain_transactions
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT ?`,
      [Number(limit)]
    );

    res.json({ transactions });
  } catch (error) {
    console.error('대기 거래 조회 오류:', error);
    res.status(500).json({ error: '대기 거래 조회 실패' });
  }
});

// 블록 채굴 (관리자 또는 채굴자)
router.post('/mine', async (req: Request, res: Response) => {
  try {
    const { miner_address } = req.body;

    // 대기 중인 거래 가져오기
    const pendingTxs = await blockchainService.getPendingTransactions(100);

    if (pendingTxs.length === 0) {
      return res.status(400).json({ error: '채굴할 거래가 없습니다' });
    }

    // 블록 생성 및 채굴
    const newBlock = await blockchainService.createBlock(pendingTxs, miner_address);

    res.json({
      success: true,
      block: newBlock,
      message: `블록 #${newBlock.block_number}이 채굴되었습니다`,
      reward: newBlock.reward,
    });
  } catch (error) {
    console.error('블록 채굴 오류:', error);
    res.status(500).json({ error: '블록 채굴 실패' });
  }
});

// 블록체인 검증 (관리자)
router.post('/validate', isAdmin, async (req: Request, res: Response) => {
  try {
    const isValid = await blockchainService.validateBlockchain();

    res.json({
      valid: isValid,
      message: isValid ? '블록체인이 유효합니다' : '블록체인이 손상되었습니다',
    });
  } catch (error) {
    console.error('블록체인 검증 오류:', error);
    res.status(500).json({ error: '블록체인 검증 실패' });
  }
});

// 블록체인 통계
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 총 블록 수
    const blockResult = await query('SELECT COUNT(*) as total_blocks FROM blockchain_blocks');

    // 총 거래 수
    const txResult = await query('SELECT COUNT(*) as total_transactions FROM blockchain_transactions');

    // 확정된 거래 수
    const confirmedResult = await query(
      'SELECT COUNT(*) as confirmed_transactions FROM blockchain_transactions WHERE status = "CONFIRMED"'
    );

    // 대기 중인 거래 수
    const pendingResult = await query(
      'SELECT COUNT(*) as pending_transactions FROM blockchain_transactions WHERE status = "PENDING"'
    );

    // 최근 블록
    const recentBlocks = await query(
      'SELECT * FROM blockchain_blocks ORDER BY block_number DESC LIMIT 5'
    );

    // 총 채굴 보상
    const rewardResult = await query('SELECT SUM(reward) as total_rewards FROM blockchain_blocks');

    res.json({
      total_blocks: blockResult[0].total_blocks,
      total_transactions: txResult[0].total_transactions,
      confirmed_transactions: confirmedResult[0].confirmed_transactions,
      pending_transactions: pendingResult[0].pending_transactions,
      total_mining_rewards: rewardResult[0].total_rewards || 0,
      recent_blocks: recentBlocks,
    });
  } catch (error) {
    console.error('블록체인 통계 조회 오류:', error);
    res.status(500).json({ error: '블록체인 통계 조회 실패' });
  }
});

export default router;
