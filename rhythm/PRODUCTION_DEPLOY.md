# Production 배포 가이드

## 🚀 GCP SSH 전체 배포 명령어

### 1단계: Git 업데이트 및 충돌 해결

```bash
cd ~/lpm
git fetch origin
git reset --hard origin/main
```

---

### 2단계: Production 환경 변수 설정

```bash
cd ~/lpm/rhythm/server
nano .env
```

**`.env` 파일 내용 (복사해서 붙여넣기):**

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=rhythm_user
DB_PASSWORD=YOUR_DB_PASSWORD_HERE
DB_NAME=rhythm_db

# Server Configuration
PORT=3003
NODE_ENV=production
CLIENT_URL=https://rhythm.berrple.com

# Session Secret (반드시 변경!)
SESSION_SECRET=CHANGE_THIS_TO_RANDOM_STRING_MIN_32_CHARS

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
```

**⚠️ 반드시 변경해야 할 값:**
- `DB_PASSWORD`: MariaDB 비밀번호
- `SESSION_SECRET`: 랜덤한 긴 문자열 (최소 32자)

**저장:** `Ctrl + X` → `Y` → `Enter`

---

### 3단계: 서버 빌드

```bash
cd ~/lpm/rhythm/server
npm install
npm run build
```

---

### 4단계: 클라이언트 빌드

```bash
cd ~/lpm/rhythm/client
npm install
npm run build
```

---

### 5단계: PM2로 서버 시작/재시작

```bash
cd ~/lpm/rhythm/server

# 처음 시작하는 경우
NODE_ENV=production pm2 start dist/index.js --name rhythm-server

# 이미 실행 중이라면 재시작
pm2 restart rhythm-server

# 로그 확인
pm2 logs rhythm-server
```

---

### 6단계: Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/rhythm
```

**Nginx 설정 파일 내용:**

```nginx
server {
    listen 80;
    server_name rhythm.berrple.com;

    # 클라이언트 정적 파일
    root /home/YOUR_USERNAME/lpm/rhythm/client/dist;
    index index.html;

    # Gzip 압축
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 클라이언트 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 프록시
    location /api/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 업로드 파일 (오디오, 이미지, BGA)
    location /uploads/ {
        alias /home/YOUR_USERNAME/lpm/rhythm/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 100M;
}
```

**⚠️ `YOUR_USERNAME` 을 실제 사용자명으로 변경!**

저장: `Ctrl + X` → `Y` → `Enter`

```bash
# 심볼릭 링크 생성 (처음만)
sudo ln -s /etc/nginx/sites-available/rhythm /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

---

### 7단계: SSL 인증서 설치 (HTTPS)

```bash
# Certbot 설치 (처음만)
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급
sudo certbot --nginx -d rhythm.berrple.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 🔄 이후 코드 업데이트 시 (간단 버전)

```bash
cd ~/lpm
git pull origin main
cd rhythm/server && npm install && npm run build
cd ../client && npm install && npm run build
pm2 restart rhythm-server
```

---

## ✅ 확인 사항

1. **서버 상태 확인**
   ```bash
   pm2 status
   pm2 logs rhythm-server
   ```

2. **Nginx 상태 확인**
   ```bash
   sudo systemctl status nginx
   sudo tail -f /var/log/nginx/error.log
   ```

3. **데이터베이스 연결 확인**
   ```bash
   mysql -u rhythm_user -p rhythm_db -e "SHOW TABLES;"
   ```

4. **웹사이트 접속**
   - HTTP: `http://rhythm.berrple.com`
   - HTTPS: `https://rhythm.berrple.com` (SSL 설치 후)

---

## 🔧 트러블슈팅

### PM2 서버가 계속 재시작되는 경우
```bash
pm2 logs rhythm-server --lines 100
# .env 파일 확인
cat ~/lpm/rhythm/server/.env
```

### Nginx 502 Bad Gateway
```bash
# PM2가 실행 중인지 확인
pm2 status

# 포트 3003이 열려있는지 확인
netstat -tulpn | grep 3003
```

### 업로드 파일이 안 보이는 경우
```bash
# 업로드 디렉토리 권한 확인
ls -la ~/lpm/rhythm/server/uploads/
chmod -R 755 ~/lpm/rhythm/server/uploads/
```

---

## 📊 Production 환경 특징

### ✅ 수정된 사항
1. **오디오 경로**: `http://localhost:3003/uploads/...` → `/uploads/...` (상대 경로)
2. **CORS 설정**: Development/Production 환경 분리
3. **세션 쿠키**: Production에서 `secure: true` (HTTPS 전용)
4. **환경 변수**: `NODE_ENV=production`
5. **빌드 최적화**: 프로덕션 빌드로 최적화됨

### 🔒 보안 강화
- HTTPS 필수 (Certbot으로 SSL 설치)
- 세션 시크릿 강력한 랜덤 문자열 사용
- CORS 도메인 제한
- Secure 쿠키 설정

---

## 🎮 완료!

이제 `https://rhythm.berrple.com` 에서 완전한 Production 환경으로 접속 가능합니다!
