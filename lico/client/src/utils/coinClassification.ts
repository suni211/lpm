/**
 * 코인 분류 및 위험도 평가 유틸리티
 */

export type CoinRiskLevel = 'DUST' | 'POTATO' | 'SAFE' | 'MAJOR';

export interface CoinClassification {
  riskLevel: CoinRiskLevel;
  badge: string;
  badgeColor: string;
  warningMessage: string | null;
  warningColor: string;
}

/**
 * 가격 기반 코인 분류
 * - 1골드 미만: 먼지주 (위험)
 * - 1~10골드: 감자주 (주의)
 * - 10골드 이상: 일반
 * - MAJOR 코인: 항상 안전
 */
export function classifyCoin(
  price: number,
  coinType?: 'MAJOR' | 'MEME'
): CoinClassification {
  // MAJOR 코인은 항상 안전
  if (coinType === 'MAJOR') {
    return {
      riskLevel: 'MAJOR',
      badge: '🏆 MAJOR',
      badgeColor: '#10b981',
      warningMessage: null,
      warningColor: '#10b981'
    };
  }

  // 먼지주: 1골드 미만
  if (price < 1) {
    return {
      riskLevel: 'DUST',
      badge: '💨 먼지주',
      badgeColor: '#ef4444',
      warningMessage: '⚠️ 경고: 1골드 미만의 먼지주는 극도로 위험합니다. 투자에 신중하세요!',
      warningColor: '#ef4444'
    };
  }

  // 감자주: 1~10골드
  if (price >= 1 && price < 10) {
    return {
      riskLevel: 'POTATO',
      badge: '🥔 감자주',
      badgeColor: '#f59e0b',
      warningMessage: '💡 참고: 1~10골드의 감자주입니다. 안정적이지만 선택은 신중히 하세요.',
      warningColor: '#f59e0b'
    };
  }

  // 10골드 이상: 안전
  return {
    riskLevel: 'SAFE',
    badge: '✅ 안전',
    badgeColor: '#10b981',
    warningMessage: null,
    warningColor: '#10b981'
  };
}

/**
 * 위험도에 따른 투자 권장 메시지
 */
export function getInvestmentAdvice(riskLevel: CoinRiskLevel): string {
  switch (riskLevel) {
    case 'MAJOR':
      return '메이저 코인으로 안전한 투자 대상입니다.';
    case 'DUST':
      return '고위험 코인입니다. 손실 가능성이 매우 높습니다.';
    case 'POTATO':
      return '중위험 코인입니다. 신중한 투자가 필요합니다.';
    case 'SAFE':
      return '안정적인 가격대의 코인입니다.';
    default:
      return '';
  }
}
