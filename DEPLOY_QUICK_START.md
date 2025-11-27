# 빠른 배포 가이드 (SSH 접속 완료 상태)

이미 GCP Compute Engine VM에 SSH로 접속되어 있다는 가정하에 진행합니다.

## 1단계: 시스템 업데이트 및 기본 패키지 설치

```bash
# 시스템 업데이트
sudo apt-get update
sudo apt-get upgrade -y

# 필수 패키지 설치
sudo apt-get install -y curl wget git build-essential
```

## 2단계: Node.js 20.x 설치

```bash
# NodeSource 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version
npm --version
```

## 3단계: MariaDB 설치 (로컬 DB 사용 시)

```bash
# MariaDB 설치
sudo apt-get install -y mariadb-server mariadb-client

# MariaDB 시작
sudo systemctl start mariadb
sudo systemctl enable mariadb

# MariaDB 보안 설정
sudo mysql_secure_installation
# - Root 비밀번호 설정
# - Anonymous users 제거: Y
# - Root 원격 접속 불가: Y
# - Test 데이터베이스 제거: Y
# - Privilege tables 재로드: Y
```

## 4단계: 데이터베이스 생성

```bash
# MariaDB 접속
sudo mysql -u root -p

# 데이터베이스 및 사용자 생성 (MariaDB 쉘에서 실행)
CREATE DATABASE bank_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE lico_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'bank_user'@'localhost' IDENTIFIED BY 'ss092888?';
CREATE USER 'lico_user'@'localhost' IDENTIFIED BY 'ss092888?';

GRANT ALL PRIVILEGES ON bank_db.* TO 'bank_user'@'localhost';
GRANT ALL PRIVILEGES ON lico_db.* TO 'lico_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

## 5단계: 프로젝트 클론

```bash
# 홈 디렉토리로 이동
cd ~

# GitHub에서 프로젝트 클론
git clone https://github.com/suni211/lpm.git

# 프로젝트 디렉토리로 이동
cd lpm
```

## 6단계: Bank Server 설정

```bash
cd ~/lpm/bank/server

# 의존성 설치
npm install

# .env 파일 생성
cat > .env <<'EOF'
PORT=5001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ss092888?
DB_NAME=bank_db

# Session - 강력한 시크릿으로 교체 필요
SESSION_SECRET=grejipgjgiwgneipel23

# URLs
CLIENT_URL=https://bank.berrple.com
LICO_URL=https://lico.berrple.com
EOF

# 데이터베이스 스키마 초기화
mysql -u bank_user -pss092888? bank_db < src/database/schema_mariadb.sql

# TypeScript 빌드
npm run build
```

## 7단계: Lico Server 설정

```bash
cd ~/lpm/lico/server

# 의존성 설치
npm install

# .env 파일 생성
cat > .env <<'EOF'
PORT=5002
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ss092888?
DB_NAME=lico_db

# Session - 강력한 시크릿으로 교체 필요
SESSION_SECRET=weffioefoieufjneiofen

# URLs
CLIENT_URL=https://lico.berrple.com
BANK_URL=https://bank.berrple.com

# Blockchain
MINING_DIFFICULTY=4
MINING_REWARD=50
BLOCK_TIME=60000
EOF

# 데이터베이스 스키마 초기화
mysql -u lico_user -plico_password_strong_123 lico_db < src/database/schema_mariadb.sql

# TypeScript 빌드
npm run build
```

## 8단계: Bank Client 설정

```bash
cd ~/lpm/bank/client

# 의존성 설치
npm install

# .env 파일 생성 (API URL 설정)
cat > .env <<'EOF'
VITE_API_BASE_URL=https://bank.berrple.com
EOF

# 프로덕션 빌드
npm run build
```

**중요**: Bank Client는 이제 `https://bank.berrple.com`을 기본 API URL로 사용합니다. 환경 변수 `VITE_API_BASE_URL`이 설정되지 않으면 자동으로 `https://bank.berrple.com`을 사용합니다.

## 9단계: Lico Client 설정

```bash
cd ~/lpm/lico/client

# 의존성 설치
npm install

# .env 파일 생성
cat > .env <<'EOF'
VITE_API_BASE_URL=https://lico.berrple.com
EOF

# 프로덕션 빌드
npm run build
```

## 10단계: PM2 설치 및 애플리케이션 실행

```bash
# PM2 전역 설치
sudo npm install -g pm2

# 로그 디렉토리 생성
mkdir -p ~/lpm/bank/server/logs
mkdir -p ~/lpm/lico/server/logs

# ecosystem.config.js 파일 생성
cd ~/lpm
cat > ecosystem.config.js <<'EOF'
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
EOF

# PM2로 앱 시작
pm2 start ecosystem.config.js

# 앱 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 부팅 시 자동 시작 설정
pm2 startup
# 위 명령어가 출력한 명령어를 복사해서 실행 (sudo env PATH=... 로 시작하는 명령어)
pm2 save
```

## 11단계: Nginx 설치 및 설정

```bash
# Nginx 설치
sudo apt-get install -y nginx

# Bank Server & Client용 Nginx 설정
sudo tee /etc/nginx/sites-available/bank > /dev/null <<'EOF'
server {
    listen 80;
    server_name bank.berrple.com;

    # Client (정적 파일)
    location / {
        root /var/www/bank;
        try_files $uri $uri/ /index.html;

        # 캐싱 설정
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API (Bank Server)
    location /api {
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

    # Auth (Bank Server)
    location /auth {
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
EOF

# Lico Server & Client용 Nginx 설정
sudo tee /etc/nginx/sites-available/lico > /dev/null <<'EOF'
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
EOF

# Bank Client 빌드 파일 복사 (디렉토리 먼저 생성)
sudo mkdir -p /var/www/bank
sudo rm -rf /var/www/bank/*  # 기존 파일 삭제 (있는 경우)
sudo cp -r ~/lpm/bank/client/dist/* /var/www/bank/
sudo chown -R www-data:www-data /var/www/bank

# Lico Client 빌드 파일 복사
sudo mkdir -p /var/www/lico
sudo cp -r ~/lpm/lico/client/dist/* /var/www/lico/
sudo chown -R www-data:www-data /var/www/lico

# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/bank /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/lico /etc/nginx/sites-enabled/

# 기본 설정 제거
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 12단계: 방화벽 설정

```bash
# UFW 방화벽 설치 (없는 경우)
sudo apt-get install -y ufw

# 방화벽 규칙 설정
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 방화벽 활성화
sudo ufw enable

# 방화벽 상태 확인
sudo ufw status
```

## 12단계: SSL 인증서 설치 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (Bank)
sudo certbot --nginx -d bank.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com

# SSL 인증서 발급 (Lico)
sudo certbot --nginx -d lico.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 배포 완료 확인

```bash
# PM2 앱 상태 확인
pm2 status

# 로그 확인
pm2 logs

# Bank Server 포트 확인
curl http://localhost:5001

# Lico Server 포트 확인
curl http://localhost:5002

# Nginx 상태 확인
sudo systemctl status nginx
```

## 유용한 명령어

```bash
# PM2 재시작
pm2 restart all

# PM2 중지
pm2 stop all

# PM2 로그 실시간 확인
pm2 logs

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 로그 확인
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 데이터베이스 접속
mysql -u bank_user -p bank_db
mysql -u lico_user -p lico_db
```

## 업데이트 배포

코드 변경 후 업데이트 시:

```bash
cd ~/lpm
git pull

# Bank Server 재빌드
cd ~/lpm/bank/server
npm install
npm run build

# Bank Client 재빌드
cd ~/lpm/bank/client
npm install
npm run build
sudo mkdir -p /var/www/bank  # 디렉토리가 없으면 생성
sudo rm -rf /var/www/bank/*
sudo cp -r dist/* /var/www/bank/
sudo chown -R www-data:www-data /var/www/bank

# Lico Server 재빌드
cd ~/lpm/lico/server
npm install
npm run build
pm2 restart all

# Lico Client 재빌드
cd ~/lpm/lico/client
npm install
npm run build
sudo rm -rf /var/www/lico/*
sudo cp -r dist/* /var/www/lico/
sudo chown -R www-data:www-data /var/www/lico

# PM2 재시작
pm2 restart all
```

## 트러블슈팅

### 앱이 시작되지 않을 때
```bash
pm2 logs
pm2 status
```

### 포트 확인
```bash
sudo netstat -tulpn | grep :5001
sudo netstat -tulpn | grep :5002
```

### 데이터베이스 연결 확인
```bash
mysql -u bank_user -pbank_password_strong_123 bank_db
mysql -u lico_user -plico_password_strong_123 lico_db
```

### Nginx 502 에러
```bash
sudo tail -f /var/log/nginx/error.log
pm2 status
```

## 중요 사항

1. **.env 파일의 비밀번호와 시크릿 값들을 반드시 강력한 값으로 변경하세요**
2. **OAuth 클라이언트 ID와 시크릿을 실제 값으로 교체하세요**
3. **도메인 DNS 설정이 완료되어야 SSL 인증서 발급이 가능합니다**
4. **GCP 방화벽 규칙에서 80, 443 포트가 열려 있어야 합니다**

## SSL 인증서 설치 (HTTPS 설정)

### 1단계: Nginx 설정 오류 수정 (필수)

Nginx 설정에 존재하지 않는 SSL 인증서 경로가 있는 경우 먼저 수정해야 합니다:

```bash
# Nginx 설정 파일에서 SSL 관련 라인 제거
sudo sed -i '/ssl_certificate/d' /etc/nginx/sites-available/bank
sudo sed -i '/ssl_certificate_key/d' /etc/nginx/sites-available/bank
sudo sed -i 's/listen 443 ssl;/listen 80;/g' /etc/nginx/sites-available/bank

sudo sed -i '/ssl_certificate/d' /etc/nginx/sites-available/lico
sudo sed -i '/ssl_certificate_key/d' /etc/nginx/sites-available/lico
sudo sed -i 's/listen 443 ssl;/listen 80;/g' /etc/nginx/sites-available/lico

# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 2단계: SSL 인증서 발급

```bash
# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (bank.berrple.com)
sudo certbot --nginx -d bank.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com --redirect

# SSL 인증서 발급 (lico.berrple.com)
sudo certbot --nginx -d lico.berrple.com --non-interactive --agree-tos --email ine158lovely@gmail.com --redirect

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

**주의사항:**
- `your-email@example.com`을 실제 이메일 주소로 변경하세요
- 도메인 DNS 설정이 완료되어야 SSL 인증서 발급이 가능합니다
- 인증서는 90일마다 자동으로 갱신됩니다

배포 완료!
