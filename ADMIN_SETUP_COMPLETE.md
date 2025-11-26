# Admin 페이지 이미지 업로드 시스템 완료

## 완료된 작업 ✅

### 1. 초기 데이터 SQL 파일 생성
- ✅ **server/src/database/initial_coaches.sql** - 17명의 감독 카드 데이터
- ✅ **server/src/database/initial_tactics.sql** - 9개의 작전 카드 데이터
- ✅ **server/src/database/initial_supports.sql** - 15개의 서포트 카드 데이터
- ✅ **server/src/database/initial_players_2026.sql** - 66명의 선수 카드 데이터 (LCK 10개 팀)

### 2. 백엔드 API 수정
**파일: server/src/routes/admin.ts**
- ✅ 선수 카드 생성 API: `card_image` 필드 추가
- ✅ 감독 카드 생성 API: `coach_image` 필드 추가, `command`, `ban_pick`, `meta`, `cold`, `warm` 스탯 사용
- ✅ 작전 카드 생성 API: `tactic_image` 필드 추가, `position`, `effect_type`, `effect_value` 사용
- ✅ 서포트 카드 생성 API: `support_image` 필드 추가, `effect_type`, `effect_value` 사용
- ✅ 카드 목록 조회 API: `/admin/cards?type=player|coach|tactic|support`
- ✅ 이미지 업로드 API: `/admin/cards/{type}/{cardId}/image`

### 3. 프론트엔드 Admin 페이지 수정
**파일: client/src/pages/Admin.tsx**
- ✅ 감독 카드 폼: 5개 능력치 (지휘, 밴픽, 메타력, 냉정함, 따뜻함)
- ✅ 작전 카드 폼: 포지션 선택, 효과 타입, 효과 값
- ✅ 서포트 카드 폼: 효과 타입, 효과 값
- ✅ 카드 목록 조회 버튼: "📋 기존 카드 목록 보기/이미지 업로드"
- ✅ 카드 그리드 UI: 이미지 미리보기, 카드 정보, 이미지 업로드 버튼
- ✅ 개별 카드 이미지 업로드 기능

### 4. CSS 스타일 추가
**파일: client/src/pages/Admin.css**
- ✅ `.card-list-section` - 카드 목록 섹션 스타일
- ✅ `.btn-load-cards` - 카드 목록 불러오기 버튼
- ✅ `.card-grid` - 그리드 레이아웃 (반응형)
- ✅ `.card-item` - 개별 카드 아이템
- ✅ `.card-image-preview` - 이미지 미리보기
- ✅ `.btn-upload-image` - 이미지 업로드 버튼

### 5. 업로드 디렉토리 생성
- ✅ `server/uploads/cards/players/`
- ✅ `server/uploads/cards/coaches/`
- ✅ `server/uploads/cards/tactics/`
- ✅ `server/uploads/cards/supports/`

## 사용 방법

### 1. 초기 데이터 DB에 삽입하기
```bash
cd server
# MariaDB에 접속
mysql -u root -p lpm

# SQL 파일 실행
source src/database/initial_coaches.sql
source src/database/initial_tactics.sql
source src/database/initial_supports.sql
source src/database/initial_players_2026.sql
```

### 2. Admin 페이지에서 이미지 업로드
1. Admin 페이지 접속: `/admin`
2. 카드 타입 선택 (선수/감독/작전/서포트)
3. "📋 기존 카드 목록 보기/이미지 업로드" 버튼 클릭
4. 각 카드의 "📷 이미지 업로드" 버튼을 클릭하여 이미지 선택
5. 이미지가 자동으로 업로드되고 카드에 반영됨

### 3. 새 카드 생성하기
1. Admin 페이지에서 카드 타입 선택
2. 카드 정보 입력
   - **선수**: 이름, 포지션, 코스트, 능력치 6개, 레어도
   - **감독**: 이름, 지휘, 밴픽, 메타, 냉정함, 따뜻함, 레어도
   - **작전**: 이름, 포지션(선택), 효과 타입, 효과 값, 효과 설명, 레어도
   - **서포트**: 이름, 효과 타입, 효과 값, 효과 설명, 레어도
3. 이미지 선택 (선택사항)
4. "🎴 카드 생성" 버튼 클릭

## 데이터베이스 스키마

### player_cards
```sql
- card_name VARCHAR(100)
- card_image VARCHAR(255)
- position ENUM('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT')
- cost INT (1-10)
- mental INT (1-99)
- team_fight INT (1-99)
- cs_ability INT (1-99)
- vision INT (1-99)
- judgment INT (1-99)
- laning INT (1-99)
- rarity ENUM('NORMAL', 'RARE', 'EPIC', 'LEGEND')
- power INT (자동 계산)
```

### coach_cards
```sql
- coach_name VARCHAR(100)
- coach_image VARCHAR(255)
- command INT (1-99) -- 지휘
- ban_pick INT (1-99) -- 밴픽
- meta INT (1-99) -- 메타력
- cold INT (1-99) -- 냉정함
- warm INT (1-99) -- 따뜻함
- rarity ENUM('NORMAL', 'RARE', 'EPIC', 'LEGEND')
- power INT (자동 계산)
```

### tactic_cards
```sql
- tactic_name VARCHAR(100)
- tactic_image VARCHAR(255)
- position VARCHAR(20) NULL -- TOP, JUNGLE, MID, ADC, SUPPORT 또는 NULL (전체)
- effect_description TEXT
- effect_type VARCHAR(100) -- 예: POWER_BOOST_VS_STRONGER
- effect_value INT -- 효과 값 (%)
- rarity ENUM('NORMAL', 'RARE', 'EPIC', 'LEGEND')
```

### support_cards
```sql
- support_name VARCHAR(100)
- support_image VARCHAR(255)
- effect_description TEXT
- effect_type VARCHAR(100) -- 예: TEAM_CONDITION_UP_1
- effect_value INT -- 효과 값
- rarity ENUM('NORMAL', 'RARE', 'EPIC', 'LEGEND')
```

## 초기 데이터 현황

### 선수 카드 (66명)
- **T1** (5명): Doran, Oner, Faker (LEGEND), Peyz, Keria (LEGEND)
- **GEN** (5명): Kiin (LEGEND), Canyon (LEGEND), Chovy (LEGEND), Ruler (LEGEND), Duro
- **HLE** (5명): Zeus (LEGEND), Kanavi, Zeka, Gumayusi (LEGEND), Delight
- **KT** (6명): PerfecT, Cuzz, Bdd, Aiming, Ghost, Pollu
- **DK** (5명): Siwoo, Lucid, ShowMaker (LEGEND), Smash, Career
- **BFX** (6명): Clear, Raptor, VicLa, Daystar, Diable, Kellin
- **NS** (6명): Kingen, Sponge, Calix, Scout, Taeyoon, Lehends
- **BRO** (5명): Casting, GIDEON, Fisher, Teddy, Namgung
- **DRX** (5명): Rich, Vincenzo, Willer, Jiwoo, Andil
- **DNF** (6명): DuDu, Pyosik, Clozer, deokdam, Life, Peter

### 감독 카드 (17명)
강도경, 강동훈, 강병률, 고동빈 (LEGEND), 구본택, 권영재, 김가람, 김대호 (LEGEND), 김정수, 배성웅, 복한규, 이지훈, 이창석, 이호성, 양대인, 정노철, 최인규 (LEGEND)

### 작전 카드 (9개)
고춧가루 작전, 물귀신 작전, 선두를 잡아라, 비밀병기, 용사, 연패탈출, 헝그리 정신, ㄷㄷㄷㅈ, 특급 소방수

### 서포트 카드 (15개)
해외여행, 홈 파티, 월급날, 단체 휴양, 라인 휴식, 엔터기 뽑음, 희생 정신, 배터리 재정비, 팬미팅, 보약, CF 출연, 장인의 마우스, 장인의 키보드, 장인의 헤드셋, 시장평가좀 받으실까 (LEGEND)

## 다음 단계

1. ✅ SQL 파일 DB에 실행
2. ✅ 서버 빌드 및 재시작
3. ✅ Admin 페이지에서 각 카드에 이미지 업로드
4. ⏳ 리그 시스템 API 구현
5. ⏳ 3페이즈 매치 시스템 구현
6. ⏳ 특성 시스템 구현
7. ⏳ 시설 관리 시스템 구현
8. ⏳ 포스팅 시스템 (경매) 구현

## 파일 구조
```
server/
├── src/
│   ├── database/
│   │   ├── initial_coaches.sql
│   │   ├── initial_tactics.sql
│   │   ├── initial_supports.sql
│   │   └── initial_players_2026.sql
│   └── routes/
│       └── admin.ts (수정됨)
├── uploads/
│   └── cards/
│       ├── players/
│       ├── coaches/
│       ├── tactics/
│       └── supports/

client/
└── src/
    └── pages/
        ├── Admin.tsx (수정됨)
        └── Admin.css (수정됨)
```

---
생성일: 2025-11-26
작성자: Claude Code
