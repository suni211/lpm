# 🎮 Minecraft Server Economy System

마인크래프트 서버를 위한 통합 경제 시스템

## 📁 프로젝트 구조

```
.
├── bank/          # 🏦 Bank 시스템 (bank.berrple.com)
│   ├── server/    # Node.js + Express + MariaDB
│   └── client/    # React + TypeScript
│
└── lico/          # 🪙 Lico 암호화폐 거래소 (lico.berrple.com)
    ├── server/    # Node.js + Express + MariaDB
    └── client/    # React + TypeScript + Charts
```

## 🏦 Bank 시스템

고대 시대 은행원 스타일의 마인크래프트 서버 은행

### 주요 기능
- ⬇️ 입금 신청 (날짜/시간 지정, 상품 선택)
- ⬆️ 출금 처리 (관리자 승인)
- 💸 이체 시스템 (수수료 0%)
- 📊 거래 장부 (마인크래프트 닉네임 표시)
- 🔢 계좌번호 시스템 (XXXX-XXXX-XXXX-XXXX)

### 상품 유형
- **거래용** - 즉시 입출금 가능
- **예치용** - 계약 기간 설정, 만료 시 관리자가 거래 파기 가능

[상세 문서 →](./bank/README.md)

## 🪙 Lico 암호화폐 거래소

Bank 시스템과 연동된 암호화폐 거래소

### 주요 기능
- 💰 매수/매도 (시장가/지정가)
- 📊 캔들스틱 차트 (1분/1시간/1일봉)
- 🤖 AI 자동 거래 및 가격 조정
- 💧 유동성 공급 시스템
- 🔗 Bank 연동 입출금
- 💳 지갑 주소 시스템 (0x...)

### 관리자 기능
- 코인 생성 (로고, 이름, 약자)
- 초기 유동성 설정
- 가격 수동 조정
- 직접 매수/매도

[상세 문서 →](./lico/README.md)

## 🔗 시스템 연동

```
Bank (계좌번호)  ↔  Lico (지갑 주소)
    Gold 입출금 자유롭게 이동
```

[계좌번호 시스템 가이드 →](./ACCOUNT_SYSTEM.md)

## 💰 화폐 시스템

- 🪙 **Gold (G)** - 게임 내 화폐 (단일 시스템)
- Bank와 Lico에서 공통 사용
- 자유로운 입출금

## 🔧 기술 스택

### Backend
- Node.js + Express
- TypeScript
- MariaDB (mysql2)
- Socket.IO (실시간)
- node-cron (스케줄러)

### Frontend
- React 18
- TypeScript
- Vite
- Axios
- lightweight-charts (TradingView 스타일)

## 🚀 빠른 시작

### Bank 시스템
```bash
# 서버
cd bank/server
npm install
cp .env.example .env
npm run dev

# 클라이언트
cd bank/client
npm install
npm run dev
```

### Lico 거래소
```bash
# 서버
cd lico/server
npm install
cp .env.example .env
npm run dev

# 클라이언트
cd lico/client
npm install
npm run dev
```

### 데이터베이스 설정
```bash
# Bank
mysql -u root -p < bank/server/src/database/schema.sql

# Lico
mysql -u root -p < lico/server/src/database/schema.sql
```

## 🌐 배포 주소

- **Bank**: https://bank.berrple.com
- **Lico**: https://lico.berrple.com

## 📝 라이선스

ISC
