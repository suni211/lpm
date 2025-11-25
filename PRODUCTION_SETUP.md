# LPM 프로덕션 배포 가이드 (GCP VM + PM2)

## 📋 사전 준비

### 1. GCP VM 인스턴스 생성
```bash
# GCP Console에서 VM 생성
# - 머신 유형: e2-medium (2 vCPU, 4GB RAM)
# - OS: Ubuntu 22.04 LTS
# - 디스크: 20GB SSD
# - 방화벽: HTTP, HTTPS 트래픽 허용
```

### 2. 도메인 DNS 설정
```
berrple.com 도메인을 GCP VM의 외부 IP로 연결
A 레코드: berrple.com -> [VM 외부 IP]
A 레코드: www.berrple.com -> [VM 외부 IP]
```

## 🚀 서버 초기 설정

### 1. SSH 접속 및 기본 패키지 설치
```bash
# SSH 접속
ssh user@berrple.com

# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 20.x 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2 전역 설치
sudo npm install -g pm2

# MariaDB 설치
sudo apt install -y mariadb-server mariadb-client

# Nginx 설치
sudo apt install -y nginx

# Certbot (Let's Encrypt SSL) 설치
sudo apt install -y certbot python3-certbot-nginx

# Git 설치
sudo apt install -y git
```

### 2. MariaDB 설정
```bash
# MariaDB 서비스 시작
sudo systemctl start mariadb
sudo systemctl enable mariadb

# MariaDB 보안 설정
sudo mysql_secure_installation
# - Set root password? Y (LPM 입력)
# - Remove anonymous users? Y
# - Disallow root login remotely? N (원격 필요시)
# - Remove test database? Y
# - Reload privilege tables? Y

# MariaDB 접속
sudo mysql -u root -p
# 비밀번호: LPM

# 데이터베이스 생성
CREATE DATABASE lpm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# root 사용자 권한 설정
GRANT ALL PRIVILEGES ON lpm.* TO 'root'@'localhost' IDENTIFIED BY 'LPM';
GRANT ALL PRIVILEGES ON lpm.* TO 'root'@'%' IDENTIFIED BY 'LPM';
FLUSH PRIVILEGES;
EXIT;

# 외부 접속 허용 (필요시)
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
# bind-address = 127.0.0.1 -> bind-address = 0.0.0.0

sudo systemctl restart mariadb
```

## 📦 프로젝트 배포

### 1. Git Clone
```bash
# 홈 디렉토리로 이동
cd ~

# 프로젝트 클론
git clone https://github.com/suni211/lpm.git
cd lpm
```

### 2. 환경 변수 설정
```bash
# server/.env 파일 생성
nano server/.env
```

**server/.env 내용:**
```env
NODE_ENV=production
PORT=5000

# Database (MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lpm
DB_USER=root
DB_PASSWORD=LPM

# Session
SESSION_SECRET=your-super-secret-session-key-change-this

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://berrple.com/api/auth/google/callback

# Client URL
CLIENT_URL=https://berrple.com
```

### 3. 데이터베이스 초기화
```bash
# SQL 파일 실행
mysql -h localhost -u root -pLPM lpm < server/src/database/schema.sql
mysql -h localhost -u root -pLPM lpm < server/src/database/initial_players.sql
mysql -h localhost -u root -pLPM lpm < server/src/database/update_power_formula.sql

# 또는 비밀번호 프롬프트로 입력
# mysql -h localhost -u root -p lpm < server/src/database/schema.sql
```

### 4. 서버 빌드
```bash
# 서버 의존성 설치 및 빌드
cd server
npm install
npm run build
cd ..
```

### 5. 클라이언트 빌드
```bash
# 클라이언트 의존성 설치 및 빌드
cd client
npm install
npm run build
cd ..
```

### 6. PM2로 서버 실행
```bash
# PM2로 서버 시작
pm2 start ecosystem.config.js

# PM2 상태 확인
pm2 status

# PM2 로그 확인
pm2 logs lpm-server

# PM2 자동 시작 설정 (부팅 시)
pm2 startup
pm2 save
```

## 🌐 Nginx 설정

### 1. Nginx 설정 파일 생성
```bash
sudo nano /etc/nginx/sites-available/lpm
```

**Nginx 설정 내용:**
```nginx
server {
    listen 80;
    server_name berrple.com www.berrple.com;

    # 클라이언트 빌드 파일
    root /home/user/lpm/client/dist;
    index index.html;

    # 업로드 파일
    location /uploads {
        alias /home/user/lpm/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 프록시
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # SPA 라우팅
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip 압축
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

### 2. Nginx 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/lpm /etc/nginx/sites-enabled/

# 기본 사이트 비활성화 (선택)
sudo rm /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 SSL 인증서 설정 (Let's Encrypt)

### 1. Certbot으로 SSL 인증서 발급
```bash
# SSL 인증서 자동 발급 및 Nginx 설정
sudo certbot --nginx -d berrple.com -d www.berrple.com

# 이메일 입력, 약관 동의, 리다이렉션 설정 (2번 선택 권장)
```

### 2. SSL 자동 갱신 테스트
```bash
# 자동 갱신 테스트
sudo certbot renew --dry-run

# Certbot은 자동으로 cron job을 설정합니다
```

### 3. SSL 적용 후 Nginx 설정 (자동 생성됨)
Certbot이 자동으로 다음과 같은 설정을 추가합니다:
```nginx
server {
    listen 443 ssl;
    server_name berrple.com www.berrple.com;

    ssl_certificate /etc/letsencrypt/live/berrple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/berrple.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 나머지 설정은 동일
    ...
}

server {
    listen 80;
    server_name berrple.com www.berrple.com;
    return 301 https://$server_name$request_uri;
}
```

## 🔄 업데이트 배포

### 1. 코드 업데이트
```bash
cd ~/lpm

# Git Pull
git pull origin main

# 서버 재빌드
cd server
npm install
npm run build
cd ..

# 클라이언트 재빌드
cd client
npm install
npm run build
cd ..

# PM2 재시작
pm2 restart lpm-server

# Nginx 리로드
sudo systemctl reload nginx
```

### 2. 배포 스크립트 생성
```bash
nano deploy.sh
```

**deploy.sh 내용:**
```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Git Pull
git pull origin main

# Server Build
echo "📦 Building server..."
cd server
npm install
npm run build
cd ..

# Client Build
echo "🎨 Building client..."
cd client
npm install
npm run build
cd ..

# Restart PM2
echo "🔄 Restarting server..."
pm2 restart lpm-server

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment completed!"
```

```bash
# 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

## 📊 모니터링 및 관리

### 1. PM2 명령어
```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs lpm-server

# 로그 실시간 보기
pm2 logs lpm-server --lines 100

# 재시작
pm2 restart lpm-server

# 중지
pm2 stop lpm-server

# 삭제
pm2 delete lpm-server

# 모니터링 대시보드
pm2 monit
```

### 2. Nginx 명령어
```bash
# 상태 확인
sudo systemctl status nginx

# 설정 테스트
sudo nginx -t

# 재시작
sudo systemctl restart nginx

# 리로드 (다운타임 없음)
sudo systemctl reload nginx

# 로그 확인
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 3. MariaDB 명령어
```bash
# 데이터베이스 접속
mysql -h localhost -u root -p lpm

# 데이터베이스 백업
mysqldump -h localhost -u root -p lpm > backup.sql

# 데이터베이스 복원
mysql -h localhost -u root -p lpm < backup.sql

# 데이터베이스 상태 확인
sudo systemctl status mariadb
```

## 🔥 방화벽 설정

```bash
# UFW 방화벽 활성화
sudo ufw enable

# SSH 허용
sudo ufw allow ssh
sudo ufw allow 22/tcp

# HTTP/HTTPS 허용
sudo ufw allow 'Nginx Full'
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# MariaDB (외부 접속 필요시)
# sudo ufw allow 3306/tcp

# 방화벽 상태 확인
sudo ufw status
```

## 🛡️ 보안 강화

### 1. MariaDB 보안
```bash
# root 사용자 비밀번호 변경
sudo mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new-strong-password';
FLUSH PRIVILEGES;
EXIT;
```

### 2. 파일 권한 설정
```bash
# .env 파일 권한 제한
chmod 600 server/.env

# uploads 디렉토리 권한
chmod 755 server/uploads
```

### 3. 자동 백업 설정
```bash
# 백업 스크립트 생성
nano ~/backup.sh
```

**backup.sh 내용:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ~/backups
mysqldump -h localhost -u root -pLPM lpm > ~/backups/lpm_$DATE.sql
find ~/backups -name "lpm_*.sql" -mtime +7 -delete
```

```bash
# 실행 권한 부여
chmod +x ~/backup.sh

# Cron 작업 추가 (매일 새벽 3시)
crontab -e
# 추가: 0 3 * * * ~/backup.sh
```

## 📝 체크리스트

배포 전:
- [ ] GCP VM 인스턴스 생성
- [ ] 도메인 DNS 설정 (A 레코드)
- [ ] MariaDB 설치 및 설정
- [ ] Node.js, PM2, Nginx 설치
- [ ] 환경 변수 설정 (.env)
- [ ] Google OAuth 콜백 URL 업데이트

배포 후:
- [ ] 데이터베이스 초기화 확인
- [ ] 서버 정상 실행 확인 (PM2)
- [ ] Nginx 설정 확인
- [ ] SSL 인증서 발급
- [ ] 방화벽 설정
- [ ] 자동 백업 설정
- [ ] PM2 자동 시작 설정

## 🆘 트러블슈팅

### 1. 502 Bad Gateway
```bash
# PM2 상태 확인
pm2 status

# 서버 재시작
pm2 restart lpm-server

# 로그 확인
pm2 logs lpm-server
```

### 2. SSL 인증서 오류
```bash
# Certbot 갱신
sudo certbot renew

# Nginx 재시작
sudo systemctl restart nginx
```

### 3. 데이터베이스 연결 오류
```bash
# MariaDB 상태 확인
sudo systemctl status mariadb

# 연결 테스트
mysql -h localhost -u root -p lpm

# 환경 변수 확인
cat server/.env
```

## 📚 참고 문서

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [MariaDB Documentation](https://mariadb.com/kb/en/documentation/)
