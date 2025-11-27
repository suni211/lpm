import { JudgementType } from '../types';

// 판정 윈도우 (ms)
export const JUDGEMENT_WINDOWS = {
  YAS: 50,
  OH: 100,
  AH: 150,
  FUCK: 200
};

// 노트 판정
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

  const comboBonus = Math.min(1.0 + (combo / 100), 2.0);
  return Math.floor(baseScore * multiplier * comboBonus);
};

// 롱노트 콤보 계산
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

// 노트 판정 색상
export const getJudgementColor = (judgement: JudgementType): string => {
  switch (judgement) {
    case JudgementType.YAS:
      return '#00ffff';
    case JudgementType.OH:
      return '#00ff00';
    case JudgementType.AH:
      return '#ffaa00';
    case JudgementType.FUCK:
      return '#ff0000';
  }
};

// 노트가 화면에 보여야 하는지 확인
export const isNoteVisible = (
  noteTimestamp: number,
  currentTime: number,
  noteSpeed: number
): boolean => {
  const timeUntilHit = noteTimestamp - currentTime;
  const visibilityWindow = 2000 / noteSpeed; // 노트 속도에 따른 가시 시간
  return timeUntilHit >= 0 && timeUntilHit <= visibilityWindow;
};

// 노트의 Y 위치 계산
export const calculateNoteYPosition = (
  noteTimestamp: number,
  currentTime: number,
  noteSpeed: number,
  canvasHeight: number
): number => {
  const timeUntilHit = noteTimestamp - currentTime;
  const fallDistance = canvasHeight * 0.8;
  const fallTime = 2000 / noteSpeed;
  const progress = 1 - (timeUntilHit / fallTime);
  return progress * fallDistance;
};

// 롱노트 길이 계산
export const calculateLongNoteLength = (
  duration: number,
  noteSpeed: number,
  canvasHeight: number
): number => {
  const fallDistance = canvasHeight * 0.8;
  const fallTime = 2000 / noteSpeed;
  return (duration / fallTime) * fallDistance;
};
