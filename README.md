# LPM - LoL Pro Manager

LOL 경영 시뮬레이션 카드 수집 게임

## 기술 스택

### Frontend
- React 18
- Vite
- TypeScript
- Framer Motion (애니메이션)
- Socket.io-client

### Backend
- Node.js + Express
- TypeScript
- Socket.io
- PostgreSQL
- Redis

### Deployment
- Google Cloud Platform (GCP)

## 시작하기

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis

### 설치

```bash
# 의존성 설치
npm install

# 클라이언트 의존성 설치
cd client && npm install

# 서버 의존성 설치
cd server && npm install
```

### 환경 변수 설정

서버 `.env` 파일:
```
DATABASE_URL=postgresql://root:LPM@localhost:5432/lpm
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
REDIS_URL=redis://localhost:6379
```

### 개발 서버 실행

```bash
# 서버 실행
cd server && npm run dev

# 클라이언트 실행
cd client && npm run dev
```

## 게임 특징

- 🎴 카드 수집 시스템 (선수/감독/작전/서포트)
- 🏆 랭크 시스템 (브론즈 → 챌린저)
- 💰 경매장 시스템
- 👥 길드/클랜 시스템
- 📊 경기 시뮬레이션
- 🎯 업적 시스템
- 📈 역사 기록 시스템

## 라이선스

MIT
