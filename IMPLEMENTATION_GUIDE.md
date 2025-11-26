# LPM 구현 가이드

## 현재 상태

### ✅ 완료된 것
1. 데이터베이스 스키마 (18개 SQL 파일)
2. 초기 데이터 (선수 66명, 감독 17명, 작전 9개, 서포트 15개, 특성 32개, 스폰서 17개)
3. Admin 페이지 (이미지 업로드 기능)
4. 로스터 관리 API (이미 존재)

### 🚧 구현 필요한 것

## 1. 백엔드 API 구현 우선순위

### Priority 1: 핵심 경기 시스템
```typescript
// server/src/services/matchEngine.ts
// 3페이즈 경기 시뮬레이션 엔진

export async function simulateMatch(team1Id: string, team2Id: string): Promise<MatchResult> {
  // Phase 1: 라인전 (각 라인 1vs1)
  // Phase 2: 오브젝트 한타 (드래곤, 전령, 바론)
  // Phase 3: 최종 한타 (모든 능력치 종합)

  // 컨디션 적용 (빨강 +15% ~ 보라 -15%)
  // 특성 발동 시스템
  // 나레이션 생성

  return matchResult;
}
```

**파워 계산 공식:**
```typescript
// 포지션별 가중치
TOP: { laning: 30%, team_fight: 20%, judgment: 15%, mental: 15%, cs: 15%, vision: 5% }
JUNGLE: { team_fight: 25%, vision: 25%, judgment: 20%, mental: 15%, cs: 10%, laning: 5% }
MID: { team_fight: 25%, judgment: 20%, cs: 15%, mental: 15%, laning: 15%, vision: 10% }
ADC: { team_fight: 30%, cs: 20%, laning: 20%, judgment: 15%, mental: 10%, vision: 5% }
SUPPORT: { vision: 30%, team_fight: 25%, judgment: 20%, mental: 15%, laning: 5%, cs: 5% }

// 최종 파워 = 기본파워 × 컨디션보정 × (1 + 케미스트리/100)
```

### Priority 2: 랭크 매칭 시스템
```typescript
// server/src/services/rankMatchmaking.ts

export async function findMatch(teamId: string): Promise<string | null> {
  // 비슷한 LP의 팀 매칭
  // ±200 LP 범위 내에서 검색
  // 매칭 대기 큐 관리
}

export async function startRankedMatch(team1Id: string, team2Id: string) {
  // 경기 시뮬레이션
  const result = await simulateMatch(team1Id, team2Id);

  // LP 변화 계산 (+20~30 / -15~25)
  // 승패 기록 저장
  // 티어 변동 체크

  return result;
}
```

### Priority 3: 특성 시스템
```typescript
// server/src/services/traitService.ts

export async function acquireTrait(playerCardId: number): Promise<boolean> {
  // 코스트별 획득 확률 체크
  // 포지션에 맞는 특성 랜덤 선택
  // 중복 체크
  // 특성 부여
}

export async function applyTraitsInMatch(playerData: any, matchContext: any) {
  // 특성 발동 조건 체크
  // 효과 적용 (파워 보너스, 특수 효과 등)
}
```

### Priority 4: 솔랭 시스템 (Socket.IO)
```typescript
// server/src/services/soloRankService.ts

export async function joinSoloQueue(playerCardId: number) {
  // 매칭 큐에 추가
  // Socket.IO로 실시간 알림
}

export async function matchSoloPlayers() {
  // 비슷한 MMR 선수 매칭
  // 1vs1 경기 시뮬레이션
  // 경험치 + 케미스트리 획득
  // 실시간 순위 업데이트
}
```

### Priority 5: 경매장 시스템
```typescript
// server/src/routes/auction.ts

router.post('/create', async (req, res) => {
  // 경매 등록 (24시간)
  // 시작가, 즉구가 설정
});

router.post('/bid', async (req, res) => {
  // 입찰
  // 최고가 갱신
  // 알림 발송
});

router.get('/active', async (req, res) => {
  // 진행 중인 경매 목록
});
```

## 2. 프론트엔드 UI 구현

### Priority 1: 경기 화면
```typescript
// client/src/pages/Match.tsx

// 3페이즈 표시
// - Phase 1: 라인별 대결 결과
// - Phase 2: 오브젝트 한타 (3번)
// - Phase 3: 최종 한타

// 실시간 나레이션
// 선수별 파워 표시
// 특성 발동 이펙트
```

### Priority 2: 로스터 관리
```typescript
// client/src/pages/Roster.tsx

// 5포지션 선수 배치
// 드래그앤드롭
// 총 코스트 표시 (48 제한)
// 포지션별 사용 가능 선수 목록
```

### Priority 3: 랭크 리그
```typescript
// client/src/pages/Ranked.tsx

// 현재 티어, LP 표시
// 매칭 찾기 버튼
// 전적 기록
// 시즌 보상 정보
```

### Priority 4: 솔랭
```typescript
// client/src/pages/SoloRank.tsx

// 선수별 순위 표시
// 매칭 큐 (Socket.IO)
// 경기 시작/결과
// 실시간 순위 변동
```

### Priority 5: 경매장
```typescript
// client/src/pages/Auction.tsx

// 진행 중인 경매 목록
// 입찰 기능
// 남은 시간 카운트다운
// 내 입찰 내역
```

## 3. 구현 순서

### Week 1: 핵심 경기 시스템
- [ ] 3페이즈 경기 엔진 완성
- [ ] 경기 화면 UI
- [ ] 경기 API 엔드포인트

### Week 2: 랭크 시스템
- [ ] 랭크 매칭 로직
- [ ] LP 계산 시스템
- [ ] 랭크 UI

### Week 3: 특성 & 선수 육성
- [ ] 특성 획득/적용 시스템
- [ ] 교정/멘토링/특성 훈련 API
- [ ] 시설 관리 API

### Week 4: 솔랭 & 경매장
- [ ] Socket.IO 실시간 솔랭
- [ ] 경매장 시스템
- [ ] 전체 UI 통합

## 4. 빠른 시작 (최소 기능)

### 단계 1: DB 설정
```bash
mysql -u root -p lpm

# 모든 SQL 파일 실행
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

### 단계 2: 경기 엔진 테스트
```typescript
// 간단한 경기 테스트
import { simulateMatch } from './services/matchEngine';

const result = await simulateMatch(team1Id, team2Id);
console.log(result);
// {
//   winner: 'team1_id',
//   phases: [...],
//   mvp: 'Faker',
//   duration: 1823
// }
```

### 단계 3: 프론트엔드 연결
```typescript
// 경기 시작 버튼
async function startMatch() {
  const response = await api.post('/match/start', { opponentId });
  setMatchResult(response.data);
}
```

## 5. 핵심 API 엔드포인트

```
POST /api/match/start          # 경기 시작
GET  /api/match/:id            # 경기 결과 조회

POST /api/ranked/find-match    # 랭크 매칭
GET  /api/ranked/my-rank       # 내 랭크 정보

POST /api/solo/join-queue      # 솔랭 큐 참가
GET  /api/solo/rankings        # 솔랭 순위

POST /api/auction/create       # 경매 등록
POST /api/auction/bid          # 입찰
GET  /api/auction/active       # 진행 중 경매

POST /api/training/start       # 훈련 시작
GET  /api/training/active      # 진행 중 훈련

POST /api/fusion/fuse          # 카드 합성
GET  /api/fusion/recipes       # 합성 레시피

GET  /api/traits/available     # 획득 가능 특성
POST /api/traits/acquire       # 특성 획득

POST /api/facility/upgrade     # 시설 업그레이드
GET  /api/facility/my          # 내 시설 현황

POST /api/sponsor/contract     # 스폰서 계약
GET  /api/sponsor/available    # 계약 가능 스폰서
```

---

생성일: 2025-11-26
다음 단계: 경기 엔진 구현부터 시작
