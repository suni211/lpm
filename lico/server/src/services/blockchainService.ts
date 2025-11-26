import crypto from 'crypto';
import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 블록체인 서비스
 * - 블록 생성 및 검증
 * - 거래 해싱 및 서명
 * - 머클 트리 구현
 */
export class BlockchainService {
  private readonly DIFFICULTY = 4; // 채굴 난이도 (앞에 0이 4개)
  private readonly BLOCK_TIME = 60000; // 블록 생성 시간 (60초)
  private readonly MINING_REWARD = 10000; // 채굴 보상 (10,000 Gold)

  /**
   * Genesis 블록 생성
   */
  async createGenesisBlock() {
    const existing = await query('SELECT * FROM blockchain_blocks WHERE block_number = 1');
    if (existing.length > 0) {
      return existing[0];
    }

    const genesisBlock = {
      id: uuidv4(),
      block_number: 1,
      previous_hash: '0'.repeat(64),
      current_hash: '',
      merkle_root: this.calculateHash('Genesis Block'),
      nonce: 0,
      difficulty: this.DIFFICULTY,
      transaction_count: 0,
    };

    // Genesis 블록 해시 계산
    genesisBlock.current_hash = this.mineBlock(genesisBlock);

    await query(
      `INSERT INTO blockchain_blocks
       (id, block_number, previous_hash, current_hash, merkle_root, nonce, difficulty, transaction_count)
       VALUES (?, 1, ?, ?, ?, ?, ?, 0)`,
      [
        genesisBlock.id,
        genesisBlock.previous_hash,
        genesisBlock.current_hash,
        genesisBlock.merkle_root,
        genesisBlock.nonce,
        genesisBlock.difficulty,
      ]
    );

    console.log('✅ Genesis Block created:', genesisBlock.current_hash);
    return genesisBlock;
  }

  /**
   * 새 블록 생성
   */
  async createBlock(transactions: any[], minerAddress?: string) {
    // 마지막 블록 조회
    const lastBlocks = await query(
      'SELECT * FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1'
    );

    let lastBlock = lastBlocks[0];
    if (!lastBlock) {
      lastBlock = await this.createGenesisBlock();
    }

    // 머클 루트 계산
    const merkleRoot = this.calculateMerkleRoot(transactions.map((tx) => tx.tx_hash));

    const newBlock = {
      id: uuidv4(),
      block_number: lastBlock.block_number + 1,
      previous_hash: lastBlock.current_hash,
      current_hash: '',
      merkle_root: merkleRoot,
      nonce: 0,
      difficulty: this.DIFFICULTY,
      miner_address: minerAddress || null,
      reward: minerAddress ? this.MINING_REWARD : 0,
      transaction_count: transactions.length,
    };

    // 블록 채굴 (PoW)
    newBlock.current_hash = this.mineBlock(newBlock);

    // 블록 저장
    await query(
      `INSERT INTO blockchain_blocks
       (id, block_number, previous_hash, current_hash, merkle_root, nonce, difficulty, miner_address, reward, transaction_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBlock.id,
        newBlock.block_number,
        newBlock.previous_hash,
        newBlock.current_hash,
        newBlock.merkle_root,
        newBlock.nonce,
        newBlock.difficulty,
        newBlock.miner_address,
        newBlock.reward,
        newBlock.transaction_count,
      ]
    );

    // 거래들을 블록에 포함
    for (const tx of transactions) {
      await query(
        `UPDATE blockchain_transactions
         SET block_id = ?, status = 'CONFIRMED', confirmed_at = NOW()
         WHERE id = ?`,
        [newBlock.id, tx.id]
      );
    }

    // 채굴 보상 지급
    if (minerAddress && newBlock.reward > 0) {
      await query(
        'UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE wallet_address = ?',
        [newBlock.reward, minerAddress]
      );

      // 보상 거래 기록
      const rewardTx = {
        id: uuidv4(),
        block_id: newBlock.id,
        tx_hash: this.calculateTransactionHash({
          from: 'SYSTEM',
          to: minerAddress,
          amount: newBlock.reward,
          timestamp: Date.now(),
        }),
        from_address: '0x0000000000000000000000000000000000000000',
        to_address: minerAddress,
        amount: newBlock.reward,
        fee: 0,
        tx_type: 'MINING_REWARD',
        status: 'CONFIRMED',
      };

      await query(
        `INSERT INTO blockchain_transactions
         (id, block_id, tx_hash, from_address, to_address, amount, fee, tx_type, status, confirmed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', NOW())`,
        [
          rewardTx.id,
          rewardTx.block_id,
          rewardTx.tx_hash,
          rewardTx.from_address,
          rewardTx.to_address,
          rewardTx.amount,
          rewardTx.fee,
          rewardTx.tx_type,
        ]
      );
    }

    console.log(`⛏️  Block #${newBlock.block_number} mined:`, newBlock.current_hash);
    return newBlock;
  }

  /**
   * 블록 채굴 (Proof of Work)
   */
  private mineBlock(block: any): string {
    const target = '0'.repeat(this.DIFFICULTY);
    let nonce = 0;

    while (true) {
      const blockData = {
        block_number: block.block_number,
        previous_hash: block.previous_hash,
        merkle_root: block.merkle_root,
        nonce,
      };

      const hash = this.calculateHash(JSON.stringify(blockData));

      if (hash.startsWith(target)) {
        block.nonce = nonce;
        return hash;
      }

      nonce++;
    }
  }

  /**
   * 거래 생성
   */
  async createTransaction(
    fromAddress: string,
    toAddress: string,
    amount: number,
    fee: number,
    txType: string,
    referenceId?: string
  ) {
    const tx = {
      id: uuidv4(),
      tx_hash: this.calculateTransactionHash({
        from: fromAddress,
        to: toAddress,
        amount,
        fee,
        timestamp: Date.now(),
      }),
      from_address: fromAddress,
      to_address: toAddress,
      amount,
      fee,
      tx_type: txType,
      status: 'PENDING',
      reference_id: referenceId || null,
    };

    await query(
      `INSERT INTO blockchain_transactions
       (id, tx_hash, from_address, to_address, amount, fee, tx_type, status, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
      [tx.id, tx.tx_hash, tx.from_address, tx.to_address, tx.amount, tx.fee, tx.tx_type, tx.reference_id]
    );

    return tx;
  }

  /**
   * 대기 중인 거래 조회
   */
  async getPendingTransactions(limit: number = 100) {
    return await query(
      `SELECT * FROM blockchain_transactions
       WHERE status = 'PENDING'
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * 해시 계산
   */
  private calculateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 거래 해시 계산
   */
  calculateTransactionHash(txData: any): string {
    return this.calculateHash(JSON.stringify(txData));
  }

  /**
   * 머클 루트 계산
   */
  private calculateMerkleRoot(txHashes: string[]): string {
    if (txHashes.length === 0) {
      return this.calculateHash('EMPTY_BLOCK');
    }

    if (txHashes.length === 1) {
      return txHashes[0];
    }

    const newLevel: string[] = [];

    for (let i = 0; i < txHashes.length; i += 2) {
      const left = txHashes[i];
      const right = i + 1 < txHashes.length ? txHashes[i + 1] : left;
      const combined = this.calculateHash(left + right);
      newLevel.push(combined);
    }

    return this.calculateMerkleRoot(newLevel);
  }

  /**
   * 블록체인 검증
   */
  async validateBlockchain(): Promise<boolean> {
    const blocks = await query('SELECT * FROM blockchain_blocks ORDER BY block_number ASC');

    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];

      // 이전 블록 해시 검증
      if (currentBlock.previous_hash !== previousBlock.current_hash) {
        console.error(`❌ Block #${currentBlock.block_number} has invalid previous hash`);
        return false;
      }

      // 현재 블록 해시 검증
      const recalculatedHash = this.calculateHash(
        JSON.stringify({
          block_number: currentBlock.block_number,
          previous_hash: currentBlock.previous_hash,
          merkle_root: currentBlock.merkle_root,
          nonce: currentBlock.nonce,
        })
      );

      if (currentBlock.current_hash !== recalculatedHash) {
        console.error(`❌ Block #${currentBlock.block_number} has invalid hash`);
        return false;
      }
    }

    console.log('✅ Blockchain is valid');
    return true;
  }
}

export default new BlockchainService();
