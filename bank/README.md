# 🏦 Minecraft Bank System

고대 시대 스타일의 마인크래프트 서버 은행 시스템

## 🎯 주요 기능

### 고객 기능
- ⬇️ **입금 신청** - 날짜/시간 지정, 상품 선택 (거래용/예치용)
- ⬆️ **출금 신청** - 잔액 확인 후 출금 요청
- 💸 **이체 신청** - 수수료 0%로 다른 고객에게 이체
- 📊 **거래 내역 조회** - 본인의 모든 거래 기록 확인
- 💰 **잔액 조회** - 실시간 잔액 확인

### 관리자 기능
- ✅ **입금 승인/거절** - 계약 만료 시 거래 파기 가능
- ✅ **출금 승인/거절** - 잔액 확인 후 처리
- ✅ **이체 승인/거절** - 양쪽 계좌 확인 후 처리
- 👥 **계좌 관리** - 계좌 생성, 정지, 폐쇄
- 📈 **통계 대시보드** - 총 예치금, 거래량 등

### 공개 기능
- 📋 **실시간 거래 장부** - 마인크래프트 닉네임으로 표시
- 📊 **통계 대시보드** - 전체 통계 공개

## 💰 화폐 시스템

- 🪙 **Gold (G)** - 단일 화폐 시스템
- 게임 내 골드와 동일한 단위 사용

## 🎨 디자인 컨셉

고대/중세 은행원 스타일의 UI
- 동전 화폐 시스템
- 수기 장부 느낌
- 도장/인장 승인 시스템

## 📁 프로젝트 구조

```
bank/
├── server/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── database/    # DB 연결 및 스키마
│   │   ├── routes/      # API 라우트
│   │   ├── services/    # 비즈니스 로직
│   │   ├── middleware/  # 인증 등
│   │   └── types/       # TypeScript 타입
│   └── package.json
│
└── client/          # React + TypeScript + Vite
    ├── src/
    │   ├── components/  # 재사용 컴포넌트
    │   ├── pages/       # 페이지
    │   ├── services/    # API 호출
    │   └── types/       # TypeScript 타입
    └── package.json
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블
- `admins` - 관리자 계정
- `accounts` - 고객 계좌 (마인크래프트 닉네임)
- `deposit_requests` - 입금 신청
- `withdrawal_requests` - 출금 신청
- `transfer_requests` - 이체 신청
- `transactions` - 거래 장부 (완료된 거래)
- `system_logs` - 시스템 로그

## 🚀 설치 및 실행

### 서버
```bash
cd bank/server
npm install
cp .env.example .env
# .env 파일 수정 (DB 정보 입력)
npm run dev
```

### 클라이언트
```bash
cd bank/client
npm install
npm run dev
```

### 데이터베이스
```bash
mysql -u root -p < server/src/database/schema.sql
```

## 🌐 배포

- **프론트엔드**: bank.berrple.com
- **백엔드**: API 서버 (포트 5001)
- **데이터베이스**: MariaDB

## 🔧 기술 스택

### Backend
- Node.js + Express
- TypeScript
- MariaDB (mysql2)
- express-session
- bcrypt

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- Axios

## 📝 API 엔드포인트

### 인증
- `POST /api/auth/login` - 관리자 로그인
- `POST /api/auth/logout` - 로그아웃

### 계좌
- `POST /api/accounts/create` - 계좌 생성
- `GET /api/accounts/:username` - 계좌 조회
- `GET /api/accounts/:username/balance` - 잔액 조회

### 입금
- `POST /api/deposits/request` - 입금 신청
- `GET /api/deposits/my-requests` - 내 입금 신청 목록
- `POST /api/deposits/:id/approve` - 입금 승인 (관리자)
- `POST /api/deposits/:id/reject` - 입금 거절 (관리자)

### 출금
- `POST /api/withdrawals/request` - 출금 신청
- `GET /api/withdrawals/my-requests` - 내 출금 신청 목록
- `POST /api/withdrawals/:id/approve` - 출금 승인 (관리자)
- `POST /api/withdrawals/:id/reject` - 출금 거절 (관리자)

### 이체
- `POST /api/transfers/request` - 이체 신청
- `GET /api/transfers/my-requests` - 내 이체 신청 목록
- `POST /api/transfers/:id/approve` - 이체 승인 (관리자)
- `POST /api/transfers/:id/reject` - 이체 거절 (관리자)

### 거래 내역
- `GET /api/transactions/my` - 내 거래 내역
- `GET /api/transactions/recent` - 최근 거래 (공개)

### 통계
- `GET /api/stats/public` - 공개 통계
- `GET /api/stats/admin` - 관리자 통계

## 👥 역할

### SUPER_ADMIN
- 모든 권한
- 관리자 계정 생성/삭제
- 시스템 설정

### ADMIN
- 모든 거래 승인/거절
- 계좌 관리
- 통계 조회

### TELLER (은행원)
- 거래 승인/거절
- 기본적인 계좌 조회
