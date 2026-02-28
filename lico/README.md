# 📈 Lico Stock Exchange

Bank 시스템과 연동된 마인크래프트 주식 거래소

## 🎯 주요 기능

### 거래 기능
- 💰 **매수/매도** - 시장가/지정가 주문
- 📊 **실시간 차트** - 캔들스틱 차트 (1분/1시간/1일봉)
- 💸 **Bank 연동** - 원화(₩) 입출금
- 📈 **실시간 호가창** - 매수/매도 주문 현황
- 💹 **포트폴리오** - 보유 주식 및 수익률

### AI 시스템
- 🤖 **자동 가격 조정** - 거래량 기반 변동성
- 💧 **유동성 공급** - AI 자동 매수/매도 주문
- 📊 **시장 안정화** - 가격 급등락 방지

### 관리자 기능
- ➕ **주식 생성** - 로고, 이름, 약자 설정
- 💰 **초기 유동성** - 발행량 및 초기가 설정
- 📈 **가격 조정** - 수동 가격 변경
- 🏪 **ADMIN 거래** - 관리자 직접 매수/매도
- 📊 **거래 통계** - 전체 거래량, 시가총액 등

## 💰 화폐 시스템

- 💵 **원화 (₩)** - Bank 시스템과 동일
- Bank에서 Lico로 입금/출금 가능
- 수수료 없는 내부 거래

## 📊 캔들스틱 차트

### 지원 시간대
- **1분봉** - 실시간 거래 모니터링
- **1시간봉** - 단기 트렌드 분석
- **1일봉** - 장기 트렌드 분석

### 차트 데이터
- Open, High, Low, Close (OHLC)
- 거래량 (Volume)
- 거래 건수

## 📈 CK 지수 (시케이 지수)

### 지수 개요
- **기준값**: 1000.00
- **계산 방식**: 시가총액 가중 평균
- **업데이트**: 1분마다 자동 갱신

### 지수 구성
- 모든 상장 주식의 시가총액을 반영
- CK 지수 = (현재 총 시가총액 / 기준 총 시가총액) × 1000

## 🏢 그룹 시스템

### 그룹(계열사) 구조
하나의 대기업 그룹 아래 여러 계열사 주식 존재:
- **CK그룹** - CK Bank (금융), CK Construction (건설) 등
- **리코그룹** - Lico Stock Exchange (IT), Lico Technology (IT) 등
- **플래닛그룹** - Planet 계열 기업들

### 그룹 영향
- 같은 그룹 내 주식들은 연관성 있음
- 그룹 전체에 영향을 주는 뉴스 가능
- 그룹 단위 시가총액 집계

## 🏭 산업 분류 시스템

### 지원 산업
- **IT/기술** - IT 및 기술 관련 기업
- **금융** - 은행, 증권, 보험 등
- **제조** - 제조업 전반
- **유통/소비재** - 유통 및 소비재 산업
- **헬스케어** - 의료, 제약, 바이오
- **에너지** - 에너지 및 자원
- **건설/부동산** - 건설 및 부동산 개발
- **엔터테인먼트** - 게임, 미디어, 콘텐츠

## 📰 뉴스 영향력 시스템

### 뉴스 작성 (관리자)
운영자가 뉴스 작성 시 다음을 설정:
- **제목/내용** - 자유롭게 작성
- **영향 방향** - POSITIVE (긍정) / NEGATIVE (부정) / NEUTRAL (중립)
- **영향 강도** - 0~100% (영향력 크기)
- **영향 대상** - 특정 주식 / 특정 산업 / 전체 시장
- **지속 시간** - AI 자동 매매 지속 시간 (분)

### AI 자동 매매
뉴스 발행 시 자동으로:
- **긍정 뉴스** → AI가 해당 주식 매수 → 가격 상승
- **부정 뉴스** → AI가 해당 주식 매도 → 가격 하락
- **영향력 강도**에 비례하여 주문량 결정
- 설정한 **지속 시간** 동안 AI 매매 지속

### 예시
```
제목: "LSE, 신기술 특허 획득"
내용: "Lico Stock Exchange가 혁신적인 거래 기술 특허를 획득했습니다..."
영향 방향: POSITIVE (긍정)
영향 강도: 80%
영향 대상: LSE 주식
지속 시간: 60분

→ AI가 60분간 LSE 주식을 집중 매수
→ LSE 주가 상승 압력 발생
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `stocks` - 주식 정보 (로고, 이름, 약자, 가격, 산업)
- `industries` - 산업 분류
- `ck_index` - CK 지수 데이터
- `user_wallets` - 사용자 계좌 (원화 잔액)
- `user_stock_balances` - 주식 보유 현황
- `orders` - 매수/매도 주문
- `trades` - 체결된 거래
- `candles_1m/1h/1d` - 캔들스틱 데이터
- `bank_transactions` - Bank 입출금 내역
- `news` - 뉴스 (영향력 설정 포함)
- `ai_trade_logs` - AI 거래 로그

## 🔄 거래 흐름

### 매수 주문
1. 사용자 매수 주문 생성
2. 계좌에서 원화 차감 (잠금)
3. 매칭 가능한 매도 주문 검색
4. 거래 체결 (Trade 생성)
5. 주식 지급, 원화 차감 완료
6. 캔들스틱 데이터 업데이트
7. CK 지수 업데이트

### 매도 주문
1. 사용자 매도 주문 생성
2. 주식 잠금
3. 매칭 가능한 매수 주문 검색
4. 거래 체결
5. 원화 지급, 주식 차감 완료
6. 캔들스틱 데이터 업데이트
7. CK 지수 업데이트

## 🤖 AI 시스템

### 1. 뉴스 기반 AI 매매
- **트리거**: 관리자가 뉴스 발행 시
- **동작**: 영향력 설정에 따라 자동 매수/매도
- **주기**: 30초마다 주문 생성
- **지속**: 설정한 시간(분) 동안

### 2. 자동 가격 조정
- **주기**: 5분마다
- **로직**: 거래량 기반 변동성 계산
- **범위**: ±5% (설정 가능)

### 3. 유동성 공급
- **주기**: 1시간마다
- **방식**: 현재가 ±2% 지정가 주문 생성
- **수량**: 500~1500 랜덤

## 🌐 API 엔드포인트

### 주식
- `GET /api/stocks` - 전체 주식 목록
- `GET /api/stocks/:id` - 주식 상세 정보
- `POST /api/stocks/create` - 주식 생성 (관리자)

### 산업
- `GET /api/industries` - 산업 분류 목록
- `GET /api/industries/:id/stocks` - 산업별 주식 목록

### CK 지수
- `GET /api/ck-index/latest` - 최신 CK 지수
- `GET /api/ck-index/history` - CK 지수 히스토리 (차트용)

### 거래
- `POST /api/orders/buy` - 매수 주문
- `POST /api/orders/sell` - 매도 주문
- `GET /api/orders/my` - 내 주문 목록
- `DELETE /api/orders/:id` - 주문 취소

### 차트
- `GET /api/chart/:stockId/1m` - 1분봉 데이터
- `GET /api/chart/:stockId/1h` - 1시간봉 데이터
- `GET /api/chart/:stockId/1d` - 1일봉 데이터

### Bank 연동
- `POST /api/bank/deposit` - Lico로 입금 (원화)
- `POST /api/bank/withdrawal` - Lico에서 출금 (원화)

### 뉴스
- `GET /api/news` - 뉴스 목록
- `GET /api/news/:id` - 뉴스 상세
- `POST /api/admin/news/create` - 뉴스 작성 (관리자, 영향력 설정 포함)

### 관리자
- `POST /api/admin/stocks/create` - 주식 생성
- `POST /api/admin/stocks/:id/adjust-price` - 가격 조정
- `POST /api/admin/orders/create` - ADMIN 주문
- `POST /api/admin/liquidity/set` - 초기 유동성 설정
- `POST /api/admin/news/create` - 뉴스 작성 (영향력 설정)

## 📁 프로젝트 구조

```
lico/
├── server/           # Node.js + Express
│   ├── src/
│   │   ├── database/       # DB 및 스키마
│   │   ├── routes/         # API 라우트
│   │   ├── services/
│   │   │   ├── tradingEngine.ts   # 거래 매칭 엔진
│   │   │   ├── aiTradingBot.ts    # AI 봇
│   │   │   └── bankService.ts     # Bank 연동
│   │   ├── websocket/      # 실시간 통신
│   │   └── index.ts
│   └── package.json
│
└── client/          # React + TypeScript
    ├── src/
    │   ├── components/
    │   │   ├── CandlestickChart.tsx
    │   │   ├── OrderBook.tsx
    │   │   └── TradingForm.tsx
    │   ├── pages/
    │   │   ├── Trading.tsx        # 거래 페이지
    │   │   ├── Portfolio.tsx      # 포트폴리오
    │   │   └── Admin.tsx          # 관리자
    │   └── services/
    └── package.json
```

## 🚀 설치 및 실행

### 서버
```bash
cd lico/server
npm install
cp .env.example .env
# .env 파일 수정
npm run dev
```

### 클라이언트
```bash
cd lico/client
npm install
npm run dev
```

### 데이터베이스
```bash
mysql -u root -p < server/src/database/schema.sql
```

## 🎨 UI/UX 디자인

### 거래 페이지
- 왼쪽: 캔들스틱 차트
- 중앙: 주문 폼 (매수/매도)
- 오른쪽: 호가창

### 차트 라이브러리
- **lightweight-charts** (TradingView 스타일)
- 실시간 업데이트
- 다크 테마

## 🔧 기술 스택

### Backend
- Node.js + Express
- TypeScript
- MariaDB
- Socket.IO (실시간)
- node-cron (스케줄러)

### Frontend
- React 18
- TypeScript
- lightweight-charts
- Socket.IO Client
- Axios

## 📝 개발 로드맵

- [x] 데이터베이스 스키마 설계
- [x] 거래 매칭 엔진
- [x] AI 거래 봇
- [ ] WebSocket 실시간 통신
- [ ] 캔들스틱 차트 UI
- [ ] Bank 시스템 연동
- [ ] 관리자 대시보드
- [ ] 프론트엔드 구현
