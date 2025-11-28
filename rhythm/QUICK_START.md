# 🎵 Rhythm Game - 빠른 시작 가이드

## 1분 만에 시작하기

### 필요한 것
- Node.js 18+
- MariaDB 10.6+
- npm

### 1단계: 데이터베이스 생성

```bash
# MariaDB 접속
mysql -u root -p

# 데이터베이스 생성
CREATE DATABASE rhythm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# 스키마 적용
mysql -u root -p rhythm_db < rhythm/server/src/database/schema.sql
```

### 2단계: 서버 설정

```bash
cd rhythm/server

# 패키지 설치
npm install

# 환경 변수 설정
cp .env.example .env

# .env 파일 편집 (DB 비밀번호 등)
# DB_PASSWORD=your_password 를 실제 비밀번호로 변경

# 업로드 폴더 생성
mkdir -p uploads/audio uploads/covers uploads/bga

# 서버 실행
npm run dev
```

서버가 http://localhost:5003 에서 실행됩니다.

### 3단계: 클라이언트 설정

```bash
cd rhythm/client

# 패키지 설치
npm install

# 클라이언트 실행
npm run dev
```

클라이언트가 http://localhost:3003 에서 실행됩니다.

### 4단계: 관리자 계정 생성

```bash
# 프로젝트 루트에서
node create_admin.js <DB비밀번호> admin admin123
```

이제 admin/admin123 으로 관리자 로그인할 수 있습니다.

### 5단계: 첫 곡 업로드

1. http://localhost:3003 접속
2. Admin 로그인
3. 노래 업로드
   - 오디오 파일 (mp3, wav)
   - 커버 이미지 (선택)
   - BGA 비디오 (선택)
   - BPM, 길이 등 정보 입력
4. 비트맵 생성
   - 난이도 선택
   - 키 수 선택 (4K, 5K, 6K, 8K)
   - 노트 데이터 JSON 입력

### 노트 데이터 예시

간단한 4K 비트맵 예시:

```json
[
  {"time": 1000, "lane": 0, "type": "normal"},
  {"time": 1500, "lane": 1, "type": "normal"},
  {"time": 2000, "lane": 2, "type": "normal"},
  {"time": 2500, "lane": 3, "type": "normal"},
  {"time": 3000, "lane": 0, "type": "long", "duration": 500},
  {"time": 4000, "lane": 1, "type": "normal"},
  {"time": 4500, "lane": 2, "type": "normal"}
]
```

### 키 설정

게임 플레이 시 기본 키:
- **4K**: D, F, J, K
- **5K**: D, F, Space, J, K
- **6K**: S, D, F, J, K, L
- **8K**: A, S, D, F, J, K, L, ;

## 프로덕션 배포

### Ubuntu/Debian 서버에 배포

```bash
# 1. 프로젝트 clone
git clone <repository-url>
cd lpm

# 2. 배포 스크립트 실행 (root 권한 필요)
sudo ./rhythm/deploy.sh
```

배포 스크립트가 자동으로:
- Node.js 패키지 설치
- 데이터베이스 생성 및 스키마 적용
- .env 파일 생성
- 프로젝트 빌드
- PM2로 서버 실행
- nginx 설정
- SSL 인증서 설정 (Let's Encrypt)

### 도메인 설정

1. DNS에서 A 레코드 추가: `rhythm.berrple.com` → 서버 IP
2. 배포 스크립트 실행
3. SSL 인증서 자동 설정됨

### PM2 명령어

```bash
# 로그 확인
pm2 logs rhythm-server

# 서버 재시작
pm2 restart rhythm-server

# 서버 중지
pm2 stop rhythm-server

# 서버 상태
pm2 status
```

## 문제 해결

### 데이터베이스 연결 오류
- .env 파일의 DB 정보가 정확한지 확인
- MariaDB 서비스가 실행 중인지 확인: `systemctl status mariadb`

### 포트 충돌
- 5003 포트가 이미 사용 중이면 .env에서 PORT 변경
- 3003 포트가 사용 중이면 vite.config.ts에서 변경

### 업로드 파일 403 에러
- uploads 폴더 권한 확인: `chmod -R 755 rhythm/server/uploads`

### nginx 502 Bad Gateway
- 백엔드 서버가 실행 중인지 확인: `pm2 status`
- nginx 로그 확인: `tail -f /var/log/nginx/error.log`

## 개발 모드 vs 프로덕션

### 개발 모드
```bash
# 서버
cd rhythm/server && npm run dev

# 클라이언트
cd rhythm/client && npm run dev
```

### 프로덕션
```bash
# 서버 빌드 및 실행
cd rhythm/server
npm run build
npm start

# 클라이언트 빌드
cd rhythm/client
npm run build
# dist 폴더를 nginx로 서빙
```

## 다음 단계

1. **곡 추가**: Admin 대시보드에서 더 많은 곡 업로드
2. **비트맵 편집기**: JSON 수동 작성 대신 비주얼 에디터 개발
3. **사용자 등록**: 회원가입 페이지 구현
4. **랭킹 시스템**: 글로벌/곡별 랭킹 페이지 구현
5. **업적 시스템**: 업적 달성 및 보상

## 지원

문제가 발생하면 GitHub Issues에 제보해주세요.

즐거운 게임 되세요! 🎮
