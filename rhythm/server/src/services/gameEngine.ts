import { Note, JudgementType } from '../types';

// 판정 윈도우 (ms)
export const JUDGEMENT_WINDOWS = {
  YAS: 50,    // ±50ms
  OH: 100,    // ±100ms
  AH: 150,    // ±150ms
  FUCK: 200   // ±200ms 이상
};

// 노트 판정 함수
export const judgeNote = (timeDiff: number): JudgementType => {
  const absDiff = Math.abs(timeDiff);

  if (absDiff <= JUDGEMENT_WINDOWS.YAS) {
    return JudgementType.YAS;
  } else if (absDiff <= JUDGEMENT_WINDOWS.OH) {
    return JudgementType.OH;
  } else if (absDiff <= JUDGEMENT_WINDOWS.AH) {
    return JudgementType.AH;
  } else {
    return JudgementType.FUCK;
  }
};

// 점수 계산
export const calculateScore = (
  judgement: JudgementType,
  combo: number,
  totalNotes: number
): number => {
  const baseScore = 1000000 / totalNotes;
  let multiplier = 1.0;

  switch (judgement) {
    case JudgementType.YAS:
      multiplier = 1.0;
      break;
    case JudgementType.OH:
      multiplier = 0.7;
      break;
    case JudgementType.AH:
      multiplier = 0.4;
      break;
    case JudgementType.FUCK:
      multiplier = 0.0;
      break;
  }

  // 콤보 보너스 (최대 2배)
  const comboBonus = Math.min(1.0 + (combo / 100), 2.0);

  return Math.floor(baseScore * multiplier * comboBonus);
};

// 롱노트 판정 (10ms당 1콤보)
export const calculateLongNoteCombo = (duration: number): number => {
  return Math.floor(duration / 10);
};

// 정확도 계산
export const calculateAccuracy = (
  countYas: number,
  countOh: number,
  countAh: number,
  countFuck: number
): number => {
  const total = countYas + countOh + countAh + countFuck;
  if (total === 0) return 0;

  const weightedScore = (
    countYas * 100 +
    countOh * 70 +
    countAh * 40 +
    countFuck * 0
  ) / total;

  return Math.round(weightedScore * 100) / 100;
};

// 레이팅 변화 계산
export const calculateRatingChange = (
  playerRating: number,
  opponentRating: number,
  won: boolean
): number => {
  const K = 32; // K-factor
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actualScore = won ? 1 : 0;

  return Math.round(K * (actualScore - expectedScore));
};
