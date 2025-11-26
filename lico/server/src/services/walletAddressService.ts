import { query } from '../database/db';
import crypto from 'crypto';

/**
 * 지갑 주소 생성 서비스
 *
 * 형식: 0x + 40자리 16진수 (Ethereum 스타일)
 * 예: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8
 */
export class WalletAddressService {
  /**
   * 새 지갑 주소 생성
   */
  async generateWalletAddress(minecraftUsername: string): Promise<string> {
    let walletAddress: string;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    do {
      // UUID 기반 지갑 주소 생성
      const hash = crypto
        .createHash('sha256')
        .update(minecraftUsername + Date.now() + Math.random())
        .digest('hex');

      // 처음 40자리만 사용
      walletAddress = '0x' + hash.substring(0, 40);

      // 중복 체크
      const exists = await this.checkDuplicate(walletAddress);
      if (!exists) {
        return walletAddress;
      }

      attempts++;
    } while (attempts < MAX_ATTEMPTS);

    throw new Error('지갑 주소 생성 실패: 최대 시도 횟수 초과');
  }

  /**
   * 지갑 주소 중복 체크
   */
  private async checkDuplicate(walletAddress: string): Promise<boolean> {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_wallets WHERE wallet_address = ?',
      [walletAddress]
    );
    return result[0].count > 0;
  }

  /**
   * 지갑 주소 유효성 검사
   */
  validateWalletAddress(walletAddress: string): boolean {
    // 형식 체크 (0x + 40자리 16진수)
    const regex = /^0x[a-fA-F0-9]{40}$/;
    return regex.test(walletAddress);
  }

  /**
   * 지갑 주소로 지갑 조회
   */
  async getWalletByAddress(walletAddress: string): Promise<any> {
    const wallets = await query(
      'SELECT * FROM user_wallets WHERE wallet_address = ? AND status = "ACTIVE"',
      [walletAddress]
    );
    return wallets[0] || null;
  }

  /**
   * 지갑 주소 단축 표시
   * 예: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8 → 0x742d...bEb8
   */
  shortenAddress(walletAddress: string): string {
    if (!this.validateWalletAddress(walletAddress)) {
      return walletAddress;
    }

    return `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
  }

  /**
   * QR 코드용 데이터 생성
   */
  generateQRData(walletAddress: string): string {
    return `lico:${walletAddress}`;
  }
}

export default new WalletAddressService();
