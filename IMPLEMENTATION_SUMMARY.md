# LPM 구현 완료 요약

## ✅ 완료된 기능

### 1. 인증 시스템
- Google OAuth 2.0 로그인
- 세션 관리 (7일 유지)
- 자동 팀 생성 (초기 자금 1억)

### 2. 카드 시스템
- **66명의 LCK 선수 데이터**
- **카드팩 3종류**:
  - 베이직: 1,000만원 (파워 400 이하)
  - 프리미엄: 2,000만원 (파워 400 이상)
  - 레전드: 5,000만원 (모든 파워)
- **뽑기 확률**: 선수 70%, 작전 20%, 서포트 7%, 감독 3%
- **중복 시스템**: 중복 선수 = 경험치 1000 증가
- 슬롯머신 애니메이션 (3초)

### 3. 로스터 시스템
- 48 코스트 제한
- 포지션별 선수 배치 (TOP/JUNGLE/MID/ADC/SUPPORT)
- 포지션 검증 (TOP 선수는 TOP에만)

### 4. 경기 시뮬레이션 (3페이즈)
- **페이즈 1**: 라인전 (라인전, CS, 판단력)
- **페이즈 2**: 오브젝트 한타 (한타력, 시야)
- **페이즈 3**: 최종 한타 (모든 능력치 + 주사위 1~10)
- 컨디션/폼 자동 반영
- AI 매칭 (같은 티어 우선)
- LP 변동 및 티어 승급/강등

### 5. ADMIN 패널
- 카드 이미지 업로드 (선수/감독/작전/서포트)
- 카드 생성 (모든 타입)
- 권한 체크

### 6. UI/UX
- 반응형 디자인 (모바일/태블릿/데스크톱)
- Framer Motion 애니메이션
- 그라디언트 디자인
- 실시간 잔액 업데이트

## 📊 포지션별 파워 계산 공식

```
TOP: 멘탈 + 한타 + CS + 시야*0.5 + 판단 + 라인전*2

JUNGLE: 멘탈*2 + 한타 + CS + 시야*1.5 + 판단 - 라인전*0.5

MID: 멘탈 + 한타 + CS + 시야 + 판단 + 라인전

ADC: CS*1.25 + 라인전*1.25 + 한타*1.25 + 멘탈 + 시야 + 판단

SUPPORT: 시야*1.25 + 한타*1.25 + 멘탈 + CS + 판단 + 라인전
```

## 🗂️ 데이터베이스 스키마

- users: 사용자 정보
- teams: 팀 정보 (잔액, 티어, LP, 명성, 팬덤)
- player_cards: 선수 카드 (66명)
- coach_cards: 감독 카드
- tactic_cards: 작전 카드
- support_cards: 서포트 카드
- user_player_cards: 사용자 선수 카드 인벤토리
- rosters: 로스터 (5명)
- matches: 경기 기록

## 🎯 다음 구현 예정

1. 경매장 시스템 (포스팅)
2. 길드 시스템
3. 업적 시스템 (30개)
4. 스폰서 시스템
5. 팬덤 시스템
6. 기록 & 명예의 전당
7. 프론트엔드 페이지 (로스터, 경기, ADMIN)
8. GCP 배포

## 🚀 실행 방법

```bash
# 데이터베이스 설정
psql -U root -d lpm < server/src/database/schema.sql
psql -U root -d lpm < server/src/database/initial_players.sql
psql -U root -d lpm < server/src/database/update_power_formula.sql

# 서버 실행
cd server
npm install
npm run dev

# 클라이언트 실행
cd client
npm install
npm run dev
```

## 📦 Git 커밋 기록

1. Initial commit: 프로젝트 구조 + DB 스키마
2. feat: 메인 화면 및 네비게이션 바
3. feat: 카드 뽑기 시스템
4. feat: 로스터, 경기, ADMIN 패널

## 🔗 GitHub

https://github.com/suni211/lpm
