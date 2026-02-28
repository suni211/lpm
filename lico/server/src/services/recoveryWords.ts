import crypto from 'crypto';

/**
 * 복구 단어 목록 (120개, 한국어 2~4글자)
 */
const RECOVERY_WORDS = [
  '가나', '가다', '가로', '가면', '가방', '가위', '가지', '간식', '갈색', '감자',
  '강아지', '개구리', '거북이', '거울', '거리', '건물', '검정', '게임', '겨울', '고기',
  '고양이', '곰', '공원', '공책', '과자', '과일', '관람', '광장', '구름', '국수',
  '군인', '굴', '귤', '그림', '그릇', '금', '기차', '기쁨', '길', '김',
  '나무', '나비', '나이', '낙엽', '날씨', '남자', '낮', '내일', '너', '노래',
  '노란', '놀이', '눈', '눈물', '다리', '다음', '달', '달리기', '닭', '대답',
  '도서관', '도시', '도자기', '독서', '돈', '동물', '동생', '두부', '드라마', '들',
  '등산', '딸기', '땅', '떡', '라디오', '라면', '마음', '마을', '마지막', '만화',
  '맛', '맥주', '머리', '먹다', '멀리', '모자', '목소리', '무지개', '문', '물',
  '물고기', '바다', '바람', '바지', '밤', '밥', '방', '배', '배추', '벌',
  '벽', '별', '병원', '보라', '복숭아', '부모', '북', '불', '붉은', '비',
  '비행기', '빨강', '사과', '사람', '사슴', '산', '상자', '새', '새벽', '생선',
  '서울', '선생님', '설탕', '소', '소나기', '손', '수박', '숲', '쉬다', '시계',
  '시작', '신발', '실내', '아기', '아침', '안경', '앞', '야구', '약', '양',
  '어머니', '어제', '엄마', '여름', '여자', '연필', '열쇠', '오늘', '오리', '옷',
  '옥수수', '와인', '외출', '요리', '우유', '우산', '운동', '원숭이', '위', '유리',
  '은', '음악', '의자', '이름', '이모', '인형', '일', '자동차', '자리', '자전거',
  '작은', '잠', '장난감', '장미', '재미', '저녁', '전화', '점심', '정원', '제비',
  '조용한', '주스', '주인', '주황', '지도', '지붕', '지하철', '진달래', '집', '차',
  '참새', '책', '책상', '천', '청소', '초록', '초콜릿', '축구', '친구', '카페',
  '컴퓨터', '코끼리', '콩', '키', '타고', '탁자', '태양', '토끼', '파란', '파도',
  '팔', '펜', '편지', '평화', '포도', '표', '풀', '풍경', '학교', '학생',
  '한강', '한복', '할머니', '할아버지', '함께', '해', '해변', '햇빛', '행복', '호수',
  '호텔', '혼자', '화가', '화분', '화장실', '회색', '후추', '휴식', '흰색', '힘'
];

/**
 * 복구 단어 서비스
 */
export class RecoveryWordsService {
  /**
   * 6개의 랜덤 복구 단어 생성
   */
  generateRecoveryWords(): string[] {
    const words: string[] = [];
    const usedIndices = new Set<number>();

    while (words.length < 6) {
      const randomIndex = Math.floor(Math.random() * RECOVERY_WORDS.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        words.push(RECOVERY_WORDS[randomIndex]);
      }
    }

    return words;
  }

  /**
   * 복구 단어를 해시로 변환 (저장용)
   */
  hashRecoveryWords(words: string[]): string {
    const wordsString = words.join(',');
    return crypto.createHash('sha256').update(wordsString).digest('hex');
  }

  /**
   * 복구 단어 검증
   */
  verifyRecoveryWords(inputWords: string[], storedHash: string): boolean {
    const inputHash = this.hashRecoveryWords(inputWords);
    return inputHash === storedHash;
  }

  /**
   * 복구 단어 목록 반환 (사용자에게 표시용)
   */
  getRecoveryWordsList(): string[] {
    return [...RECOVERY_WORDS];
  }
}

export default new RecoveryWordsService();

