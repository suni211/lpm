# LPM (LoL Pro Manager) 전체 시스템 완성 🎮

## 완료된 시스템 목록 ✅

### Phase 1: 핵심 데이터 구조
1. ✅ **특성 시스템** (`traits_system.sql`, `initial_traits.sql`)
   - 포지션별 특성 (TOP, JUNGLE, MID, ADC, SUPPORT, ALL)
   - 코스트별 획득 확률 (1코스트 0.9% ~ 10코스트 10%)
   - 총 32개 특성 (긍정/부정 포함)

2. ✅ **스폰서 시스템** (`sponsor_system.sql`, `initial_sponsors.sql`)
   - 17개 기업 (MEGA, BIG, NORMAL, SMALL 티어)
   - 월급 + 보너스 (컨디션, 파워, 경험치, 가챠확률, 돈)
   - 계약 기간 12개월

3. ✅ **컨디션/레벨/경험치 시스템** (`player_condition_level_system.sql`)
   - 5단계 컨디션: 빨강(+15%) > 주황(+8%) > 노랑(기본) > 파랑(-8%) > 보라(-15%)
   - 100레벨 시스템 (총 252,450,000 경험치 필요)
   - 경험치 획득 내역 추적

4. ✅ **시설 시스템** (`facility_system.sql`)
   - 작전 연구소 (5레벨, 총 11.5억)
   - 멘탈리스트 룸 (10레벨, 총 195억)
   - 기록 예측 센터 (10레벨, 예측 정확도 60%~97%)

### Phase 2: 랭크 & 경쟁 시스템
5. ✅ **랭크 리그 시스템** (`ranked_system.sql`)
   - 7티어: 챌린저(6500LP) ~ 브론즈(0LP)
   - 시즌 보상 (1000만 ~ 1억 + 작전 카드)
   - LP 변화 추적, 배치고사 시스템

6. ✅ **솔랭 시스템** (`solo_rank_system.sql`)
   - 선수 개인 MMR 시스템 (기본 1500)
   - 실시간 순위, 월별 기록
   - 경험치 + 케미스트리 획득
   - Socket.IO 실시간 랭킹 준비 완료

7. ✅ **포스팅(경매장) 시스템** (`posting_auction_system.sql`)
   - 24시간 입찰 시스템
   - 즉시 구매 기능
   - 입찰 알림, 관심 목록
   - 10% 판매 수수료

8. ✅ **친선경기 시스템** (`friendly_match_system.sql`)
   - 1:1 초대/수락
   - 집계 안되는 연습 경기
   - 개인 통계 기록

### Phase 3: 선수 육성 & 구단 관리
9. ✅ **전력 보강(합성) 시스템** (`card_fusion_system.sql`)
   - 7개 합성 레시피
   - 1~8 코스트 카드 희생
   - 작전/서포트 카드 또는 돈 획득
   - 성공률 시스템 (30%~100%)

10. ✅ **교정/멘토링/특성 훈련** (`player_training_system.sql`)
    - 교정: 부정 특성 제거, 능력치 상승
    - 멘토링: 1대1 능력치 전수 (5%~15%)
    - 특성 훈련: 새로운 특성 획득

### 기존 완료 시스템
11. ✅ **선수/감독/작전/서포트 카드** (초기 데이터 완료)
    - 66명 선수 (LCK 10개 팀)
    - 17명 감독
    - 9개 작전 카드
    - 15개 서포트 카드

12. ✅ **리그 시스템** (`league_system.sql`)
    - 4개 리그 (코카콜라 제로 챌린지, 레전드, 라이너, 비기너)
    - 플레이오프, 승강전 시스템

13. ✅ **Admin 이미지 업로드** (완료)
    - 모든 카드 타입 이미지 업로드 가능
    - 카드 목록 조회/관리

---

## 데이터베이스 스키마 파일 목록

```
server/src/database/
├── schema_mariadb.sql              # 기본 스키마 (users, teams, cards 등)
├── league_system.sql               # 리그 시스템
├── traits_system.sql               # 특성 시스템
├── initial_traits.sql              # 특성 초기 데이터 (32개)
├── sponsor_system.sql              # 스폰서 시스템
├── initial_sponsors.sql            # 스폰서 초기 데이터 (17개)
├── player_condition_level_system.sql # 컨디션/레벨/경험치
├── facility_system.sql             # 시설 시스템 (3종)
├── ranked_system.sql               # 랭크 리그
├── solo_rank_system.sql            # 솔랭 시스템
├── posting_auction_system.sql      # 경매장
├── friendly_match_system.sql       # 친선경기
├── card_fusion_system.sql          # 카드 합성
├── player_training_system.sql      # 선수 육성
├── initial_coaches.sql             # 감독 초기 데이터 (17명)
├── initial_tactics.sql             # 작전 초기 데이터 (9개)
├── initial_supports.sql            # 서포트 초기 데이터 (15개)
└── initial_players_2026.sql        # 선수 초기 데이터 (66명)
```

---

## 코어 게임 시스템

### 코스트 시스템
- 선수 1~10 코스트
- 팀 최대 48 코스트 (초과 시 자동 기권)
- 로스터: 10, 10, 10, 9, 9 가능

### 컨디션 시스템
| 등급 | 색상 | 범위 | 파워 보정 |
|------|------|------|-----------|
| RED | 빨강 | 80~100 | +15% |
| ORANGE | 주황 | 60~79 | +8% |
| YELLOW | 노랑 | 40~59 | 0% |
| BLUE | 파랑 | 20~39 | -8% |
| PURPLE | 보라 | 0~19 | -15% |

### 능력치 시스템
**선수 능력치 (1~99):**
- 멘탈 (MET)
- 한타력 (TF)
- CS수급 (CS)
- 시야 (VIS)
- 판단력 (JUD)
- 라인전 (RIN)

**감독 능력치 (1~99):**
- 지휘 (ORD)
- 밴픽 (B&P)
- 메타력 (META)
- 냉정함 (COLD)
- 따뜻함 (HOT)

### 팀 파워 계산 공식
```
팀 파워 = (선수 능력치 합계 × 컨디션 보정) × 팀 케미스트리 + 작전 카드 % + 서포트 카드 %
```

### 특성 시스템
**포지션별 특성:**
- **TOP**: 정신병자, 솔로킬 머신, 한타의 지배자, 언더독, 갑작스런 쓰로잉
- **JUNGLE**: 카정충, 갱크충, 미드만 봐줘, 바텀만 봐줘, 탑은 버려
- **MID**: 기선 제압, 공포심 자극, 정글 도와줄게, SHOW MAKER, 고전파
- **ADC**: 알파카임미다, 땅땅땅 빵, F점멸 뒷 비전
- **SUPPORT**: 추격의 시작, 자석, 골든 루키, 영웅 놀이, 철인
- **ALL**: 한타 던질게, 한타 잡을게, 한타 지배해주지

**특성 획득 확률 (코스트별):**
| 코스트 | 확률 |
|--------|------|
| 1 | 0.9% |
| 2 | 1.0% |
| 3 | 1.1% |
| 4 | 2.0% |
| 5 | 2.1% |
| 6 | 2.7% |
| 7 | 4.2% |
| 8 | 6.0% |
| 9 | 8.0% |
| 10 | 10.0% |

---

## 경기 시스템 (3페이즈)

### Phase 1: 라인전 🎯
- 각 라인별 1vs1 대결
- 라인전 능력치, 판단력, 멘탈 중요
- CS 수급으로 성장

### Phase 2: 오브젝트 한타 ⚔️
- 드래곤, 전령, 타워 싸움
- 한타력, 시야, 팀워크 중요
- 역전의 기회 존재

### Phase 3: 마지막 한타 🏆
- 최종 승부 결정
- 모든 능력치 종합
- 나레이션 시스템
- 스포 절대 금지

---

## 경제 시스템

### 스폰서 (월 수입)
| 티어 | 금액 | 보너스 |
|------|------|--------|
| MEGA | 7~8.5억/월 | 파워+8%, 컨디션+10% 등 |
| BIG | 4.5~6억/월 | 경험치+15%, 파워+5% 등 |
| NORMAL | 2.8~3.5억/월 | 가챠+10%, 컨디션+5% 등 |
| SMALL | 1.2~1.5억/월 | 파워+2%, 컨디션+3% |

### 시설 투자
**작전 연구소 (총 11.5억):**
1. Lv1: 5000만 → 카드 획득 +5%
2. Lv2: 1억 → RARE 카드 가능
3. Lv3: 2억 → EPIC 카드 가능
4. Lv4: 3억 → LEGEND 확률 증가
5. Lv5: 5억 → 전설 카드 높은 확률

**멘탈리스트 룸 (총 195억):**
- Lv1~10: 교정, 멘토링, 특성 훈련 단계적 해금
- 최고 레벨: 특성 2개 동시 훈련, 동시 훈련 5명

**기록 예측 센터 (총 135억):**
- 예측 정확도 60% → 97%
- 상대 전력 분석, 매치업 분석
- AI 기반 최적 로스터 추천

### 시즌 보상 (랭크 리그)
| 티어 | 보상 |
|------|------|
| 챌린저 | 1억 + 작전 카드 3개 |
| 마스터 | 1억 + 작전 카드 1개 |
| 다이아 | 5000만 + 작전 카드 1개 |
| 플래티넘 | 5000만 |
| 골드 | 3500만 |
| 실버 | 2000만 |
| 브론즈 | 1000만 |

---

## 다음 구현 단계 (Phase 4)

### 1. 백엔드 API 구현
- [ ] 특성 시스템 API
- [ ] 스폰서 시스템 API
- [ ] 시설 관리 API
- [ ] 랭크 매칭 API
- [ ] 솔랭 매칭 API (Socket.IO)
- [ ] 경매장 API
- [ ] 친선경기 API
- [ ] 카드 합성 API
- [ ] 선수 육성 API

### 2. 3페이즈 경기 엔진
- [ ] 라인전 시뮬레이션 로직
- [ ] 한타 시뮬레이션 로직
- [ ] 특성 발동 시스템
- [ ] 나레이션 시스템
- [ ] 경기 결과 저장

### 3. 프론트엔드 UI
- [ ] 로스터 관리 페이지
- [ ] 경기 화면 (3페이즈 표시)
- [ ] 랭크 리그 페이지
- [ ] 솔랭 페이지
- [ ] 경매장 페이지
- [ ] 시설 관리 페이지
- [ ] 선수 육성 페이지
- [ ] 스폰서 계약 페이지

### 4. 실시간 기능 (Socket.IO)
- [ ] 실시간 솔랭 순위
- [ ] 실시간 경매 입찰
- [ ] 실시간 경기 관전
- [ ] 실시간 알림

---

## 데이터베이스 설정 방법

```bash
# MariaDB 접속
mysql -u root -p lpm

# 모든 스키마 실행 (순서대로)
source src/database/schema_mariadb.sql
source src/database/league_system.sql
source src/database/traits_system.sql
source src/database/initial_traits.sql
source src/database/sponsor_system.sql
source src/database/initial_sponsors.sql
source src/database/player_condition_level_system.sql
source src/database/facility_system.sql
source src/database/ranked_system.sql
source src/database/solo_rank_system.sql
source src/database/posting_auction_system.sql
source src/database/friendly_match_system.sql
source src/database/card_fusion_system.sql
source src/database/player_training_system.sql
source src/database/initial_coaches.sql
source src/database/initial_tactics.sql
source src/database/initial_supports.sql
source src/database/initial_players_2026.sql
```

---

생성일: 2025-11-26
작성자: Claude Code
상태: 데이터베이스 스키마 100% 완료 ✅
다음 단계: 백엔드 API 구현
