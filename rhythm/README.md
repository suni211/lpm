# 리듬 게임 (DJMAX-Inspired Rhythm Game)

**DJMAX에서 영감받은 비영리 교육용 웹 리듬 게임 프로젝트**

> ⚠️ **법적 고지 / Legal Notice**
> 이 프로젝트는 **DJMAX에서 영감을 받은 비영리 팬 프로젝트**입니다.
> **DJMAX™는 NEOWIZ Corporation의 등록 상표**이며, 본 프로젝트는 NEOWIZ와 무관합니다.
> **상업적 용도 없음 • 교육 목적 • 수익 창출 없음 • No Monetization**
>
> This is a **non-commercial fan project** inspired by DJMAX.
> **DJMAX™ is a trademark of NEOWIZ Corporation**.
> This project is **NOT affiliated with NEOWIZ**.
> **Educational Purpose Only • No Commercial Use • No Monetization**

React, Express, TypeScript, MariaDB로 구축되었습니다.

## 주요 기능

### 게임 플레이
- **4K, 5K, 6K, 8K 모드**: 다양한 버튼 수 지원
- **정확한 판정 시스템**: PERFECT, GREAT, GOOD, BAD, MISS 판정
- **콤보 시스템**: 연속 판정으로 점수 보너스
- **BGA 배경**: 노래에 맞는 배경 비디오 재생
- **얇은 기어 디자인**: DJMAX 스타일의 슬림한 노트 레인
- **납작하고 두꺼운 노트**: 시인성이 좋은 노트 디자인
- **노트 속도 조절**: 플레이어 설정에 따라 노트 속도 변경 가능

### 기록 관리
- **플레이 기록**: 모든 플레이가 데이터베이스에 저장됨
- **최고 기록**: 사용자별/비트맵별 최고 점수 관리
- **등급 시스템**: SSS ~ F 등급
- **풀 콤보 & 올 퍼펙트**: 특별 달성 기록

### 랭킹 시스템
- **글로벌 랭킹**: 전체 사용자 순위
- **곡별 랭킹**: 각 비트맵의 리더보드
- **사용자 통계**: 총 플레이 수, 평균 정확도 등

### 관리자 기능
- **노래 업로드**: 오디오 파일, 커버 이미지, BGA 비디오 업로드
- **비트맵 생성/수정**: 노트 데이터 JSON 형태로 관리
- **난이도 관리**: 4가지 모드별 여러 난이도 설정 가능
- **통계 대시보드**: 사용자 수, 노래 수, 플레이 수 등

## 기술 스택

### 백엔드
- **Express.js**: REST API 서버
- **TypeScript**: 타입 안정성
- **MariaDB**: 데이터베이스
- **mysql2/promise**: 비동기 DB 쿼리
- **bcrypt**: 비밀번호 해싱
- **express-session**: 세션 관리
- **multer**: 파일 업로드

### 프론트엔드
- **React**: UI 프레임워크
- **TypeScript**: 타입 안정성
- **Vite**: 빌드 도구
- **Canvas API**: 게임 렌더링
- **axios**: HTTP 클라이언트
- **React Router**: 라우팅

## 설치 및 실행

### 1. 사전 요구사항
- Node.js 18 이상
- MariaDB 10.6 이상
- npm 또는 yarn

### 2. 데이터베이스 설정

MariaDB에 접속하여 데이터베이스를 생성하고 스키마를 적용합니다:

```bash
mysql -u root -p
```

```sql
CREATE DATABASE rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

스키마 적용:

```bash
mysql -u root -p rhythm_db < rhythm/server/src/database/schema.sql
```

### 3. 백엔드 설정

```bash
cd rhythm/server

# 패키지 설치
npm install

# 환경 변수 설정
cp .env.example .env

# .env 파일을 편집하여 데이터베이스 정보 입력
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=rhythm_db
# PORT=5003
# SESSION_SECRET=your_secret_key

# 업로드 폴더 생성
mkdir -p uploads/audio uploads/covers uploads/bga

# 개발 서버 실행
npm run dev

# 또는 빌드 후 실행
npm run build
npm start
```

### 4. 프론트엔드 설정

```bash
cd rhythm/client

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 또는 빌드
npm run build
```

### 5. 접속

- **프론트엔드**: http://localhost:3003
- **백엔드 API**: http://localhost:5003
- **도메인 설정 시**: https://rhythm.berrple.com

## 관리자 계정 생성

초기 관리자 계정을 생성하려면 다음 SQL을 실행하세요:

```sql
-- 비밀번호: admin123
INSERT INTO admins (id, username, password, role) VALUES
(UUID(), 'admin', '$2b$10$8K1p/a0dL6F7C2J8X9Z.7OQN4xKPYxV1R2b3n4m5l6k7j8h9g0f1a2', 'SUPER_ADMIN');
```

또는 bcrypt로 직접 비밀번호를 해싱하여 설정하세요.

## 비트맵 생성 가이드

### 노트 데이터 JSON 형식

```json
[
  {
    "time": 1000,
    "lane": 0,
    "type": "normal"
  },
  {
    "time": 2000,
    "lane": 2,
    "type": "long",
    "duration": 500
  }
]
```

- **time**: 노래 시작부터 노트가 쳐야 하는 시간 (밀리초)
- **lane**: 노트가 떨어지는 레인 (0부터 시작)
- **type**: 'normal' (일반 노트) 또는 'long' (롱 노트)
- **duration**: 롱 노트의 경우 지속 시간 (밀리초)

### 비트맵 생성 순서

1. Admin 로그인
2. 노래 업로드 (오디오 파일 필수, 커버/BGA 선택)
3. BPM, 길이, 장르 등 정보 입력
4. 비트맵 생성 (난이도, 키 수, 노트 데이터 입력)

## 게임 키 바인딩

### 기본 키 설정
- **4K**: D, F, J, K
- **5K**: D, F, Space, J, K
- **6K**: S, D, F, J, K, L
- **8K**: A, S, D, F, J, K, L, ;

## 프로젝트 구조

```
rhythm/
├── server/                 # 백엔드
│   ├── src/
│   │   ├── database/       # DB 연결 및 스키마
│   │   ├── routes/         # API 라우터
│   │   ├── middleware/     # 인증 등 미들웨어
│   │   └── types/          # TypeScript 타입
│   └── uploads/            # 업로드 파일
│       ├── audio/
│       ├── covers/
│       └── bga/
├── client/                 # 프론트엔드
│   ├── src/
│   │   ├── api/            # API 클라이언트
│   │   ├── game/           # 게임 엔진
│   │   ├── components/     # React 컴포넌트
│   │   ├── pages/          # 페이지
│   │   ├── types/          # TypeScript 타입
│   │   └── utils/          # 유틸리티
│   └── public/             # 정적 파일
└── README.md
```

## API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### 노래
- `GET /api/songs` - 모든 노래 목록
- `GET /api/songs/:id` - 노래 상세 정보
- `GET /api/songs/search/:term` - 노래 검색

### 비트맵
- `GET /api/beatmaps/:id` - 비트맵 정보 (노트 데이터 포함)
- `GET /api/beatmaps/song/:songId` - 특정 노래의 모든 비트맵

### 게임
- `POST /api/game/submit` - 플레이 결과 제출
- `GET /api/game/records/:beatmapId` - 플레이 기록 조회

### 랭킹
- `GET /api/rankings/global` - 글로벌 랭킹
- `GET /api/rankings/beatmap/:beatmapId` - 곡별 랭킹
- `GET /api/rankings/user/:userId/position` - 사용자 순위

### 사용자
- `GET /api/user/profile/:userId` - 프로필 조회
- `GET /api/user/best-scores/:userId` - 최고 기록
- `GET /api/user/recent-plays/:userId` - 최근 플레이
- `GET /api/user/settings` - 설정 조회
- `PUT /api/user/settings` - 설정 업데이트

### 관리자
- `POST /api/admin/login` - 관리자 로그인
- `POST /api/admin/songs` - 노래 생성
- `POST /api/admin/beatmaps` - 비트맵 생성
- `PUT /api/admin/beatmaps/:id` - 비트맵 수정
- `DELETE /api/admin/songs/:id` - 노래 삭제
- `DELETE /api/admin/beatmaps/:id` - 비트맵 삭제
- `GET /api/admin/stats` - 통계

## nginx 설정 (프로덕션)

rhythm.berrple.com 도메인으로 서비스하려면:

```nginx
server {
    listen 80;
    server_name rhythm.berrple.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rhythm.berrple.com;

    ssl_certificate /etc/letsencrypt/live/rhythm.berrple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rhythm.berrple.com/privkey.pem;

    # Frontend
    location / {
        root /var/www/rhythm/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads
    location /uploads {
        proxy_pass http://localhost:5003;
    }
}
```

## 라이선스 및 법적 고지

자세한 내용은 [LICENSE.md](./LICENSE.md)를 참조하세요.

### 요약
- **비영리 교육 프로젝트**: 학습 및 포트폴리오 목적
- **DJMAX™**: NEOWIZ Corporation의 등록 상표
- **무관계**: NEOWIZ와 공식적인 관계 없음
- **수익 창출 없음**: 어떠한 형태의 수익화도 없음
- **영감 출처**: DJMAX에서 영감을 받았으나 독립적인 프로젝트

## 개발자

Berrple Development Team

## 문의

프로젝트 관련 문의는 이슈를 생성해주세요.

---

**© 2024 - Fan Project Inspired by DJMAX™ (NEOWIZ Corporation)**
**Non-Commercial • Educational Purpose • No Monetization**
