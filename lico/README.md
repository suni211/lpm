# 🪙 Lico Cryptocurrency Exchange

Bank 시스템과 연동된 마인크래프트 암호화폐 거래소

## 🎯 주요 기능

### 거래 기능
- 💰 **매수/매도** - 시장가/지정가 주문
- 📊 **실시간 차트** - 캔들스틱 차트 (1분/1시간/1일봉)
- 💸 **Bank 연동** - Gold 입출금
- 📈 **실시간 호가창** - 매수/매도 주문 현황
- 💹 **포트폴리오** - 보유 코인 및 수익률

### AI 시스템
- 🤖 **자동 가격 조정** - 거래량 기반 변동성
- 💧 **유동성 공급** - AI 자동 매수/매도 주문
- 📊 **시장 안정화** - 가격 급등락 방지

### 관리자 기능
- ➕ **코인 생성** - 로고, 이름, 약자 설정
- 💰 **초기 유동성** - 발행량 및 초기가 설정
- 📈 **가격 조정** - 수동 가격 변경
- 🏪 **ADMIN 거래** - 관리자 직접 매수/매도
- 📊 **거래 통계** - 전체 거래량, 시가총액 등

## 💰 화폐 시스템

- 🪙 **Gold (G)** - Bank 시스템과 동일
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

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `coins` - 코인 정보 (로고, 이름, 약자, 가격)
- `user_wallets` - 사용자 지갑 (Gold 잔액)
- `user_coin_balances` - 코인 보유 현황
- `orders` - 매수/매도 주문
- `trades` - 체결된 거래
- `candles_1m/1h/1d` - 캔들스틱 데이터
- `bank_transactions` - Bank 입출금 내역
- `ai_trade_logs` - AI 거래 로그

## 🔄 거래 흐름

### 매수 주문
1. 사용자 매수 주문 생성
2. 지갑에서 Gold 차감 (잠금)
3. 매칭 가능한 매도 주문 검색
4. 거래 체결 (Trade 생성)
5. 코인 지급, Gold 차감 완료
6. 캔들스틱 데이터 업데이트

### 매도 주문
1. 사용자 매도 주문 생성
2. 코인 잠금
3. 매칭 가능한 매수 주문 검색
4. 거래 체결
5. Gold 지급, 코인 차감 완료
6. 캔들스틱 데이터 업데이트

## 🤖 AI 거래 봇

### 자동 가격 조정
- **주기**: 5분마다
- **로직**: 거래량 기반 변동성 계산
- **범위**: ±5% (설정 가능)

### 유동성 공급
- **주기**: 1시간마다
- **방식**: 현재가 ±2% 지정가 주문 생성
- **수량**: 500~1500 랜덤

## 🌐 API 엔드포인트

### 코인
- `GET /api/coins` - 전체 코인 목록
- `GET /api/coins/:id` - 코인 상세 정보
- `POST /api/coins/create` - 코인 생성 (관리자)

### 거래
- `POST /api/orders/buy` - 매수 주문
- `POST /api/orders/sell` - 매도 주문
- `GET /api/orders/my` - 내 주문 목록
- `DELETE /api/orders/:id` - 주문 취소

### 차트
- `GET /api/chart/:coinId/1m` - 1분봉 데이터
- `GET /api/chart/:coinId/1h` - 1시간봉 데이터
- `GET /api/chart/:coinId/1d` - 1일봉 데이터

### Bank 연동
- `POST /api/bank/deposit` - Lico로 입금
- `POST /api/bank/withdrawal` - Lico에서 출금

### 관리자
- `POST /api/admin/coins/create` - 코인 생성
- `POST /api/admin/coins/:id/adjust-price` - 가격 조정
- `POST /api/admin/orders/create` - ADMIN 주문
- `POST /api/admin/liquidity/set` - 초기 유동성 설정

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
