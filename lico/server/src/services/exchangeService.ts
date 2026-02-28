import { query } from '../database/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 환전 서비스
 * MEME → MAJOR: 5% 수수료
 * MAJOR → Gold: 5% 수수료
 * MEME → Gold: 불가능 (2단계 필요)
 */

const EXCHANGE_FEE_PERCENTAGE = 5.0; // 5%

interface ExchangeResult {
  exchangeId: string;
  fromAmount: number;
  toAmount: number;
  feeAmount: number;
  exchangeRate: number;
}

export class ExchangeService {
  /**
   * 환전 실행
   * @param walletId 지갑 ID
   * @param fromCoinId 환전할 코인 ID (MEME 또는 MAJOR)
   * @param toCoinId 받을 코인 ID (MAJOR 또는 null=Gold)
   * @param amount 환전할 수량
   */
  async exchange(
    walletId: string,
    fromCoinId: string,
    toCoinId: string | null, // null이면 Gold로 환전
    amount: number
  ): Promise<ExchangeResult> {
    // 1. 지갑 조회
    const wallets = await query('SELECT * FROM user_wallets WHERE id = ?', [walletId]);
    if (wallets.length === 0) {
      throw new Error('지갑을 찾을 수 없습니다');
    }
    const wallet = wallets[0];

    // 2. From 코인 정보 조회
    const fromCoins = await query('SELECT * FROM coins WHERE id = ?', [fromCoinId]);
    if (fromCoins.length === 0) {
      throw new Error('환전할 코인을 찾을 수 없습니다');
    }
    const fromCoin = fromCoins[0];

    // 3. 잔액 확인
    const balances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, fromCoinId]
    );
    if (balances.length === 0) {
      throw new Error('보유 코인이 없습니다');
    }
    const balance = balances[0];
    const availableAmount = typeof balance.available_amount === 'string'
      ? parseFloat(balance.available_amount)
      : (balance.available_amount || 0);

    if (availableAmount < amount) {
      throw new Error(`잔액이 부족합니다 (보유: ${availableAmount}, 필요: ${amount})`);
    }

    // 4. Gold로 환전하는 경우
    if (toCoinId === null) {
      return await this.exchangeToGold(walletId, fromCoin, amount);
    }

    // 5. To 코인 정보 조회
    const toCoins = await query('SELECT * FROM coins WHERE id = ?', [toCoinId]);
    if (toCoins.length === 0) {
      throw new Error('받을 코인을 찾을 수 없습니다');
    }
    const toCoin = toCoins[0];

    // 6. 환전 유효성 검사
    this.validateExchange(fromCoin, toCoin);

    // 7. 환전 실행
    return await this.executeCoinExchange(walletId, fromCoin, toCoin, amount);
  }

  /**
   * 환전 유효성 검사
   */
  private validateExchange(fromCoin: any, toCoin: any) {
    // MEME → MAJOR: OK
    if (fromCoin.coin_type === 'MEME' && toCoin.coin_type === 'MAJOR') {
      return;
    }

    // MAJOR → MAJOR: 불가능
    if (fromCoin.coin_type === 'MAJOR' && toCoin.coin_type === 'MAJOR') {
      throw new Error('MAJOR 코인끼리는 직접 환전할 수 없습니다. Gold를 통해 환전하세요.');
    }

    // MAJOR → MEME: 불가능
    if (fromCoin.coin_type === 'MAJOR' && toCoin.coin_type === 'MEME') {
      throw new Error('MAJOR 코인을 MEME 코인으로 직접 환전할 수 없습니다. 거래소에서 거래하세요.');
    }

    // MEME → MEME: 불가능
    if (fromCoin.coin_type === 'MEME' && toCoin.coin_type === 'MEME') {
      throw new Error('MEME 코인끼리는 직접 환전할 수 없습니다.');
    }

    throw new Error('잘못된 환전 요청입니다');
  }

  /**
   * 코인 → 코인 환전 (MEME → MAJOR만 가능)
   */
  private async executeCoinExchange(
    walletId: string,
    fromCoin: any,
    toCoin: any,
    amount: number
  ): Promise<ExchangeResult> {
    const fromPrice = typeof fromCoin.current_price === 'string'
      ? parseFloat(fromCoin.current_price)
      : (fromCoin.current_price || 0);
    const toPrice = typeof toCoin.current_price === 'string'
      ? parseFloat(toCoin.current_price)
      : (toCoin.current_price || 0);

    // 환전 비율 계산 (MEME 1개 = ? MAJOR)
    // 예: DOGE(10 Gold) → SOL(1000 Gold) = 0.01 SOL
    const exchangeRate = fromPrice / toPrice;
    const grossToAmount = amount * exchangeRate; // 수수료 전

    // 5% 수수료 차감
    const feeAmount = grossToAmount * (EXCHANGE_FEE_PERCENTAGE / 100);
    const netToAmount = grossToAmount - feeAmount;

    // From 코인 차감
    await query(
      'UPDATE user_coin_balances SET available_amount = available_amount - ? WHERE wallet_id = ? AND coin_id = ?',
      [amount, walletId, fromCoin.id]
    );

    // To 코인 증가
    const toBalances = await query(
      'SELECT * FROM user_coin_balances WHERE wallet_id = ? AND coin_id = ?',
      [walletId, toCoin.id]
    );

    if (toBalances.length > 0) {
      await query(
        'UPDATE user_coin_balances SET available_amount = available_amount + ? WHERE wallet_id = ? AND coin_id = ?',
        [netToAmount, walletId, toCoin.id]
      );
    } else {
      await query(
        'INSERT INTO user_coin_balances (id, wallet_id, coin_id, available_amount) VALUES (?, ?, ?, ?)',
        [uuidv4(), walletId, toCoin.id, netToAmount]
      );
    }

    // 환전 기록 저장
    const exchangeId = uuidv4();
    await query(
      `INSERT INTO exchanges (id, wallet_id, from_coin_id, to_coin_id, from_amount, to_amount, exchange_rate, fee_percentage, fee_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [exchangeId, walletId, fromCoin.id, toCoin.id, amount, netToAmount, exchangeRate, EXCHANGE_FEE_PERCENTAGE, feeAmount]
    );

    console.log(`💱 환전 완료: ${fromCoin.symbol} ${amount} → ${toCoin.symbol} ${netToAmount.toFixed(8)} (수수료: ${feeAmount.toFixed(8)})`);

    return {
      exchangeId,
      fromAmount: amount,
      toAmount: netToAmount,
      feeAmount,
      exchangeRate,
    };
  }

  /**
   * 코인 → Gold 환전 (MAJOR만 가능)
   */
  private async exchangeToGold(walletId: string, fromCoin: any, amount: number): Promise<ExchangeResult> {
    // MEME 코인은 직접 Gold로 환전 불가능
    if (fromCoin.coin_type === 'MEME') {
      throw new Error('MEME 코인은 직접 Gold로 환전할 수 없습니다. 먼저 MAJOR 코인으로 환전하세요.');
    }

    const fromPrice = typeof fromCoin.current_price === 'string'
      ? parseFloat(fromCoin.current_price)
      : (fromCoin.current_price || 0);

    // Gold 환산 금액
    const grossGoldAmount = amount * fromPrice;

    // 5% 수수료 차감
    const feeAmount = grossGoldAmount * (EXCHANGE_FEE_PERCENTAGE / 100);
    const netGoldAmount = grossGoldAmount - feeAmount;

    // From 코인 차감
    await query(
      'UPDATE user_coin_balances SET available_amount = available_amount - ? WHERE wallet_id = ? AND coin_id = ?',
      [amount, walletId, fromCoin.id]
    );

    // Gold 증가
    await query(
      'UPDATE user_wallets SET gold_balance = gold_balance + ? WHERE id = ?',
      [netGoldAmount, walletId]
    );

    // 환전 기록 저장 (to_coin_id는 NULL = Gold)
    const exchangeId = uuidv4();
    await query(
      `INSERT INTO exchanges (id, wallet_id, from_coin_id, to_coin_id, from_amount, to_amount, exchange_rate, fee_percentage, fee_amount)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
      [exchangeId, walletId, fromCoin.id, amount, netGoldAmount, fromPrice, EXCHANGE_FEE_PERCENTAGE, feeAmount]
    );

    console.log(`💱 환전 완료: ${fromCoin.symbol} ${amount} → Gold ${netGoldAmount.toFixed(2)} (수수료: ${feeAmount.toFixed(2)})`);

    return {
      exchangeId,
      fromAmount: amount,
      toAmount: netGoldAmount,
      feeAmount,
      exchangeRate: fromPrice,
    };
  }

  /**
   * 환전 기록 조회
   */
  async getExchangeHistory(walletId: string, limit: number = 50): Promise<any[]> {
    const exchanges = await query(
      `SELECT
        e.*,
        fc.symbol as from_symbol,
        fc.name as from_name,
        tc.symbol as to_symbol,
        tc.name as to_name
       FROM exchanges e
       JOIN coins fc ON e.from_coin_id = fc.id
       LEFT JOIN coins tc ON e.to_coin_id = tc.id
       WHERE e.wallet_id = ?
       ORDER BY e.created_at DESC
       LIMIT ?`,
      [walletId, limit]
    );

    return exchanges.map((ex: any) => ({
      ...ex,
      to_symbol: ex.to_symbol || 'Gold',
      to_name: ex.to_name || 'Gold',
    }));
  }
}

export default new ExchangeService();
