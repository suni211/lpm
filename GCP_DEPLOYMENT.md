# GCP 배포 가이드

이 가이드는 Bank와 Lico 시스템을 Google Cloud Platform(GCP)에 배포하는 방법을 설명합니다.

## 시스템 구성

- **Bank Server**: Node.js + Express (포트 5001)
- **Lico Server**: Node.js + Express + WebSocket (포트 5002)
- **Lico Client**: React + Vite (정적 호스팅)
- **Database**: MariaDB (Cloud SQL)

## 1. GCP 프로젝트 설정

### 1.1 GCP 프로젝트 생성

```bash
# GCP Console에서 새 프로젝트 생성
# 프로젝트 ID: berrple-bank-lico (예시)

# gcloud CLI 설치 후 로그인
gcloud auth login
gcloud config set project berrple-bank-lico
```

### 1.2 필요한 API 활성화

```bash
gcloud services enable compute.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable servicenetworking.googleapis.com
```

## 2. Cloud SQL (MariaDB) 설정

### 2.1 Cloud SQL 인스턴스 생성

```bash
# MariaDB 10.6 인스턴스 생성
gcloud sql instances create berrple-db \
  --database-version=MARIADB_10_6 \
  --tier=db-n1-standard-1 \
  --region=asia-northeast3 \
  --root-password="YOUR_STRONG_PASSWORD" \
  --backup \
  --backup-start-time=03:00

# 인스턴스 IP 확인
gcloud sql instances describe berrple-db --format="value(ipAddresses.ipAddress)"
```

### 2.2 데이터베이스 생성

```bash
# Cloud SQL 인스턴스에 연결
gcloud sql connect berrple-db --user=root

# MariaDB 쉘에서 실행
CREATE DATABASE bank_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lico_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 사용자 생성
CREATE USER 'bank_user'@'%' IDENTIFIED BY 'bank_password_here';
CREATE USER 'lico_user'@'%' IDENTIFIED BY 'lico_password_here';

# 권한 부여
GRANT ALL PRIVILEGES ON bank_db.* TO 'bank_user'@'%';
GRANT ALL PRIVILEGES ON lico_db.* TO 'lico_user'@'%';
FLUSH PRIVILEGES;

EXIT;
```

### 2.3 데이터베이스 스키마 초기화

```bash
# Bank 데이터베이스 스키마
gcloud sql connect berrple-db --user=bank_user --database=bank_db < bank/server/src/database/schema_mariadb.sql

# Lico 데이터베이스 스키마
gcloud sql connect berrple-db --user=lico_user --database=lico_db < lico/server/src/database/schema_mariadb.sql
```

## 3. Compute Engine VM 인스턴스 생성

### 3.1 VM 인스턴스 생성

```bash
# VM 인스턴스 생성 (Ubuntu 22.04)
gcloud compute instances create berrple-app-server \
  --zone=asia-northeast3-a \
  --machine-type=e2-standard-2 \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-ssd \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=http-server,https-server

# 방화벽 규칙 생성
gcloud compute firewall-rules create allow-bank-lico \
  --allow=tcp:5001,tcp:5002,tcp:80,tcp:443 \
  --target-tags=http-server,https-server
```

### 3.2 VM에 접속

```bash
gcloud compute ssh berrple-app-server --zone=asia-northeast3-a
```

## 4. VM 환경 설정

### 4.1 Node.js 설치

```bash
# NodeSource 저장소 추가 (Node.js 20.x)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 4.2 Nginx 설치 (리버스 프록시)

```bash
sudo apt-get update
sudo apt-get install -y nginx

# Nginx 시작
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4.3 PM2 설치 (프로세스 관리)

```bash
sudo npm install -g pm2
```

## 5. 애플리케이션 배포

### 5.1 코드 다운로드

```bash
# Git 설치
sudo apt-get install -y git

# 저장소 클론
cd ~
git clone https://github.com/suni211/lpm.git
cd lpm
```

### 5.2 Bank Server 설정

```bash
cd ~/lpm/bank/server

# 의존성 설치
npm install

# 환경 변수 설정
cat > .env <<EOF
PORT=5001
NODE_ENV=production

# Database
DB_HOST=CLOUD_SQL_IP_ADDRESS
DB_PORT=3306
DB_USER=bank_user
DB_PASSWORD=bank_password_here
DB_NAME=bank_db

# OAuth (Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://bank.berrple.com/auth/google/callback

# OAuth (Kakao)
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_CALLBACK_URL=https://bank.berrple.com/auth/kakao/callback

# Session
SESSION_SECRET=your_session_secret_here_min_32_chars

# URLs
CLIENT_URL=https://bank.berrple.com
LICO_URL=https://lico.berrple.com
EOF

# TypeScript 빌드
npm run build
```

### 5.3 Lico Server 설정

```bash
cd ~/lpm/lico/server

# 의존성 설치
npm install

# 환경 변수 설정
cat > .env <<EOF
PORT=5002
NODE_ENV=production

# Database
DB_HOST=CLOUD_SQL_IP_ADDRESS
DB_PORT=3306
DB_USER=lico_user
DB_PASSWORD=lico_password_here
DB_NAME=lico_db

# Session
SESSION_SECRET=your_lico_session_secret_here_min_32_chars

# URLs
CLIENT_URL=https://lico.berrple.com
BANK_URL=https://bank.berrple.com

# Blockchain
MINING_DIFFICULTY=4
MINING_REWARD=50
BLOCK_TIME=60000
EOF

# TypeScript 빌드
npm run build
```

### 5.4 Lico Client 빌드

```bash
cd ~/lpm/lico/client

# 의존성 설치
npm install

# 환경 변수 설정
cat > .env <<EOF
VITE_API_BASE_URL=https://lico.berrple.com
EOF

# 프로덕션 빌드
npm run build

# 빌드 파일을 Nginx 디렉토리로 복사
sudo mkdir -p /var/www/lico
sudo cp -r dist/* /var/www/lico/
sudo chown -R www-data:www-data /var/www/lico
```

## 6. Nginx 설정

### 6.1 Bank Server Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/bank
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name bank.berrple.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.2 Lico Server & Client Nginx 설정

```bash
sudo nano /etc/nginx/sites-available/lico
```

다음 내용 입력:

```nginx
server {
    listen 80;
    server_name lico.berrple.com;

    # Client (정적 파일)
    location / {
        root /var/www/lico;
        try_files $uri $uri/ /index.html;

        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API (Lico Server)
    location /api {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.3 Nginx 설정 활성화

```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/bank /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/lico /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm /etc/nginx/sites-enabled/default

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 7. PM2로 애플리케이션 실행

### 7.1 PM2 Ecosystem 파일 생성

```bash
cd ~/lpm
nano ecosystem.config.js
```

다음 내용 입력:

```javascript
module.exports = {
  apps: [
    {
      name: 'bank-server',
      cwd: './bank/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'lico-server',
      cwd: './lico/server',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

### 7.2 PM2로 앱 시작

```bash
# 로그 디렉토리 생성
mkdir -p ~/lpm/bank/server/logs
mkdir -p ~/lpm/lico/server/logs

# PM2로 앱 시작
pm2 start ecosystem.config.js

# 앱 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 부팅 시 자동 시작 설정
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

## 8. 도메인 및 SSL 설정

### 8.1 도메인 DNS 설정

GCP VM의 외부 IP를 확인:

```bash
gcloud compute instances describe berrple-app-server --zone=asia-northeast3-a --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

도메인 등록 업체에서 A 레코드 추가:
- `bank.berrple.com` → VM 외부 IP
- `lico.berrple.com` → VM 외부 IP

### 8.2 Let's Encrypt SSL 인증서 설치

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (Bank)
sudo certbot --nginx -d bank.berrple.com

# SSL 인증서 발급 (Lico)
sudo certbot --nginx -d lico.berrple.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 9. 모니터링 및 유지보수

### 9.1 PM2 모니터링

```bash
# 실시간 모니터링
pm2 monit

# 로그 확인
pm2 logs

# 앱 재시작
pm2 restart all

# 앱 중지
pm2 stop all

# 앱 삭제
pm2 delete all
```

### 9.2 데이터베이스 백업

```bash
# 자동 백업은 Cloud SQL 설정에서 활성화됨
# 수동 백업 생성
gcloud sql backups create --instance=berrple-db

# 백업 목록 확인
gcloud sql backups list --instance=berrple-db
```

### 9.3 로그 관리

```bash
# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PM2 로그
pm2 logs

# 로그 파일 정리 (주기적으로 실행)
pm2 flush
```

## 10. 배포 업데이트

코드 변경 시 배포 업데이트:

```bash
# VM에 접속
gcloud compute ssh berrple-app-server --zone=asia-northeast3-a

# 코드 업데이트
cd ~/lpm
git pull

# Bank Server 재빌드
cd ~/lpm/bank/server
npm install
npm run build

# Lico Server 재빌드
cd ~/lpm/lico/server
npm install
npm run build

# Lico Client 재빌드
cd ~/lpm/lico/client
npm install
npm run build
sudo rm -rf /var/www/lico/*
sudo cp -r dist/* /var/www/lico/
sudo chown -R www-data:www-data /var/www/lico

# 앱 재시작
cd ~/lpm
pm2 restart all
```

## 11. 트러블슈팅

### 11.1 앱이 시작되지 않을 때

```bash
# PM2 로그 확인
pm2 logs

# 포트 사용 확인
sudo netstat -tulpn | grep :5001
sudo netstat -tulpn | grep :5002

# .env 파일 확인
cat ~/lpm/bank/server/.env
cat ~/lpm/lico/server/.env
```

### 11.2 데이터베이스 연결 실패

```bash
# Cloud SQL 인스턴스 상태 확인
gcloud sql instances describe berrple-db

# 연결 테스트
mysql -h CLOUD_SQL_IP -u bank_user -p bank_db
mysql -h CLOUD_SQL_IP -u lico_user -p lico_db
```

### 11.3 Nginx 502 Bad Gateway

```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 에러 로그 확인
sudo tail -f /var/log/nginx/error.log

# PM2 앱 상태 확인
pm2 status
```

## 12. 보안 권장사항

1. **방화벽 규칙 최소화**: 필요한 포트만 개방
2. **SSH 키 인증 사용**: 비밀번호 인증 비활성화
3. **정기적인 업데이트**: OS 및 패키지 업데이트
4. **환경 변수 보호**: .env 파일 권한 설정 (`chmod 600`)
5. **데이터베이스 백업**: 자동 백업 활성화 및 정기 테스트
6. **로그 모니터링**: 이상 활동 감지

```bash
# SSH 비밀번호 인증 비활성화
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
sudo systemctl restart sshd

# .env 파일 권한 설정
chmod 600 ~/lpm/bank/server/.env
chmod 600 ~/lpm/lico/server/.env
chmod 600 ~/lpm/lico/client/.env
```

## 13. 비용 최적화

1. **VM 크기 조정**: 트래픽에 맞게 인스턴스 타입 조정
2. **Cloud SQL 최적화**: 사용량에 맞게 티어 조정
3. **예약 인스턴스**: 장기 사용 시 약정 할인 활용
4. **모니터링**: GCP 비용 알림 설정

```bash
# 현재 비용 확인
gcloud billing accounts list
gcloud alpha billing budgets list
```

## 완료!

이제 Bank와 Lico 시스템이 GCP에 배포되었습니다.

- Bank: https://bank.berrple.com
- Lico: https://lico.berrple.com

추가 지원이 필요하면 GitHub Issues를 통해 문의하세요.
