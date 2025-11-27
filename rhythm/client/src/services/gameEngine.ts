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
  // 판정선을 지나기 전까지 표시 (200ms 여유)
  return timeUntilHit >= -200 && timeUntilHit <= visibilityWindow;
};

// 노트의 Y 위치 계산 (판정선 기준)
export const calculateNoteYPosition = (
  noteTimestamp: number,
  currentTime: number,
  noteSpeed: number,
  _canvasHeight: number,
  offsetY: number = 0,
  judgementLineY: number = 0
): number => {
  const timeUntilHit = noteTimestamp - currentTime;
  const fallTime = 2000 / noteSpeed; // 노트가 내려오는 시간 (ms)
  
  // 판정선까지의 거리
  const fallDistance = judgementLineY - offsetY;
  
  // 진행률 계산 (0 = 시작 위치, 1 = 판정선)
  // timeUntilHit이 음수면 이미 지나간 노트
  if (timeUntilHit < 0) {
    // 이미 지나간 노트는 판정선 아래로 (표시하지 않음)
    return judgementLineY + 10;
  }
  
  // 진행률 계산: timeUntilHit이 fallTime이면 progress = 0 (시작 위치)
  // timeUntilHit이 0이면 progress = 1 (판정선)
  const progress = Math.max(0, Math.min(1, 1 - (timeUntilHit / fallTime)));
  
  // 노트 위치 = 시작 위치 + (판정선까지 거리 * 진행률)
  const y = offsetY + progress * fallDistance;
  
  // 노트가 판정선을 넘어가지 않도록
  return Math.min(y, judgementLineY + 10);
};

// 롱노트 길이 계산 (위로 올라가는 방향)
export const calculateLongNoteLength = (
  duration: number,
  noteSpeed: number,
  canvasHeight: number
): number => {
  const fallTime = 2000 / noteSpeed; // 노트가 내려오는 시간 (ms)
  // 롱노트는 위로 올라가므로, duration에 비례하여 길이 계산
  return (duration / fallTime) * (canvasHeight * 0.7);
};
