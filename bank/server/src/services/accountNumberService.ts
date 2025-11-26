import { query } from '../database/db';

/**
 * 계좌번호 생성 서비스
 *
 * 형식: XXXX-XXXX-XXXX-XXXX (16자리)
 * - 첫 4자리: 은행 코드 (1234 고정)
 * - 다음 8자리: 랜덤 숫자
 * - 마지막 4자리: 체크섬
 */
export class AccountNumberService {
  private readonly BANK_CODE = '1234'; // 은행 코드 (고정)

  /**
   * 새 계좌번호 생성
   */
  async generateAccountNumber(): Promise<string> {
    let accountNumber: string;
    let attempts = 0;
    const MAX_ATTEMPTS = 100;

    do {
      // 랜덤 8자리 생성
      const randomPart = this.generateRandomDigits(8);

      // 체크섬 4자리 계산
      const baseNumber = this.BANK_CODE + randomPart;
      const checksum = this.calculateChecksum(baseNumber);

      // 계좌번호 조합 (XXXX-XXXX-XXXX-XXXX)
      const fullNumber = baseNumber + checksum;
      accountNumber = this.formatAccountNumber(fullNumber);

      // 중복 체크
      const exists = await this.checkDuplicate(accountNumber);
      if (!exists) {
        return accountNumber;
      }

      attempts++;
    } while (attempts < MAX_ATTEMPTS);

    throw new Error('계좌번호 생성 실패: 최대 시도 횟수 초과');
  }

  /**
   * 랜덤 숫자 생성
   */
  private generateRandomDigits(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * 체크섬 계산 (Luhn 알고리즘)
   */
  private calculateChecksum(number: string): string {
    const digits = number.split('').map(Number);
    let sum = 0;

    // Luhn 알고리즘
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];

      // 홀수 위치는 2배
      if ((digits.length - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
    }

    // 체크섬 계산
    const checkDigit = (10 - (sum % 10)) % 10;

    // 4자리로 확장
    const randomPart = this.generateRandomDigits(3);
    return randomPart + checkDigit.toString();
  }

  /**
   * 계좌번호 포맷팅 (XXXX-XXXX-XXXX-XXXX)
   */
  private formatAccountNumber(number: string): string {
    return number.match(/.{1,4}/g)?.join('-') || number;
  }

  /**
   * 계좌번호 중복 체크
   */
  private async checkDuplicate(accountNumber: string): Promise<boolean> {
    const result = await query(
      'SELECT COUNT(*) as count FROM accounts WHERE account_number = ?',
      [accountNumber]
    );
    return result[0].count > 0;
  }

  /**
   * 계좌번호 유효성 검사
   */
  validateAccountNumber(accountNumber: string): boolean {
    // 형식 체크 (XXXX-XXXX-XXXX-XXXX)
    const formatRegex = /^\d{4}-\d{4}-\d{4}-\d{4}$/;
    if (!formatRegex.test(accountNumber)) {
      return false;
    }

    // 하이픈 제거
    const cleanNumber = accountNumber.replace(/-/g, '');

    // 은행 코드 체크
    if (!cleanNumber.startsWith(this.BANK_CODE)) {
      return false;
    }

    // 체크섬 검증
    const baseNumber = cleanNumber.substring(0, 12);
    const providedChecksum = cleanNumber.substring(12);
    const calculatedChecksum = this.calculateChecksum(baseNumber);

    // 마지막 자리만 비교 (체크 디지트)
    return providedChecksum.charAt(3) === calculatedChecksum.charAt(3);
  }

  /**
   * 계좌번호로 계좌 조회
   */
  async getAccountByNumber(accountNumber: string): Promise<any> {
    const accounts = await query(
      'SELECT * FROM accounts WHERE account_number = ? AND status = "ACTIVE"',
      [accountNumber]
    );
    return accounts[0] || null;
  }

  /**
   * 계좌번호 마스킹 (보안)
   * 예: 1234-5678-9012-3456 → 1234-****-****-3456
   */
  maskAccountNumber(accountNumber: string): string {
    const parts = accountNumber.split('-');
    if (parts.length !== 4) return accountNumber;

    return `${parts[0]}-****-****-${parts[3]}`;
  }
}

export default new AccountNumberService();
