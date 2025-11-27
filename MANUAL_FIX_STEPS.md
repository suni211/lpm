# 🔧 WebSocket 연결 수동 수정 가이드

## ❌ 현재 에러
```
WebSocket connection to 'wss://lico.berrple.com/socket.io/?EIO=4&transport=websocket' failed
```

---

## ✅ 해결 순서 (서버에서 실행)

### **방법 1: 자동 스크립트 (추천)**

```bash
# 1. 서버 접속
ssh username@lico.berrple.com

# 2. 스크립트 다운로드
cd /root/lpm  # 또는 프로젝트 경로
git pull origin main

# 3. 스크립트 실행
bash QUICK_FIX.sh
```

---

### **방법 2: 수동 단계별 실행**

#### **STEP 1: 서버 접속**
```bash
ssh username@lico.berrple.com
```

#### **STEP 2: LICO 서버 상태 확인**
```bash
pm2 status
```

**예상 출력**:
```
┌─────┬────────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ status  │ restart │ uptime   │
├─────┼────────────────┼─────────┼─────────┼──────────┤
│ 0   │ lico-server    │ online  │ 0       │ 2h       │
└─────┴────────────────┴─────────┴─────────┴──────────┘
```

**만약 stopped이면**:
```bash
pm2 restart lico-server
```

#### **STEP 3: 포트 5002 확인**
```bash
sudo netstat -tlnp | grep 5002
```

**예상 출력**:
```
tcp    0    0 0.0.0.0:5002    0.0.0.0:*    LISTEN    12345/node
```

**출력이 없으면**: LICO 서버가 실행되지 않은 것
```bash
# 로그 확인
pm2 logs lico-server --lines 50

# 서버 재시작
cd /root/lpm/lico/server  # 프로젝트 경로에 맞게 수정
pm2 restart lico-server
```

#### **STEP 4: Nginx 설정 확인**
```bash
# WebSocket 설정이 있는지 확인
sudo nginx -T | grep -A 15 "location /socket.io"
```

**출력이 없으면**: Nginx 설정에 WebSocket 프록시가 없음
```bash
# Nginx 설정 파일 열기
sudo nano /etc/nginx/sites-available/lico.berrple.com
# 또는
sudo nano /etc/nginx/sites-available/default
```

**다음 내용 추가** (`location /api/` 블록 아래):
```nginx
    # WebSocket 프록시
    location /socket.io/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 86400;
    }
```

**저장**: Ctrl+O, Enter, Ctrl+X

#### **STEP 5: Nginx 문법 검사**
```bash
sudo nginx -t
```

**성공 시**:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**실패 시**: 오타 확인 후 다시 수정

#### **STEP 6: Nginx 재시작**
```bash
sudo systemctl reload nginx
# 또는
sudo systemctl restart nginx
```

#### **STEP 7: 최신 코드 받기**
```bash
cd /root/lpm  # 프로젝트 경로
git pull origin main
```

#### **STEP 8: 클라이언트 재빌드**
```bash
cd lico/client
npm install
npm run build
```

**중요**: `.env.production` 파일이 자동으로 사용됩니다:
```
VITE_API_BASE_URL=https://lico.berrple.com
```

#### **STEP 9: 빌드 파일 배포**

**프론트엔드 배포 경로 찾기**:
```bash
# 현재 Nginx 설정 확인
sudo nginx -T | grep "root"
```

**일반적인 경로**:
- `/var/www/lico/client/dist`
- `/var/www/html`
- `/usr/share/nginx/html`

**배포**:
```bash
# 예시 1
sudo cp -r dist/* /var/www/lico/client/dist/

# 예시 2
sudo cp -r dist/* /var/www/html/

# 사운드 파일 확인
ls -la /var/www/lico/client/dist/sounds/
# 예상: order-filled.mp3, order-cancelled.mp3
```

#### **STEP 10: LICO 서버 재시작**
```bash
cd ../server
pm2 restart lico-server
```

#### **STEP 11: 로그 확인**
```bash
# LICO 서버 로그
pm2 logs lico-server --lines 20

# 예상 출력:
# ✅ WebSocket server initialized
# 🔌 WebSocket server initialized
```

---

## 🧪 테스트

### **테스트 1: 서버에서 curl 테스트**
```bash
curl -I https://lico.berrple.com/socket.io/
```

**예상 출력**:
```
HTTP/1.1 400 Bad Request  ← 정상 (WebSocket 핸드셰이크 필요)
```

**실패 시**:
```
HTTP/1.1 502 Bad Gateway  ← LICO 서버가 실행되지 않음
HTTP/1.1 404 Not Found    ← Nginx 설정 누락
```

### **테스트 2: 브라우저 테스트**

1. **캐시 완전 삭제**:
   - Chrome: Ctrl+Shift+Delete > 전체 기간 > 캐시 삭제
   - 또는 시크릿 모드 (Ctrl+Shift+N)

2. **https://lico.berrple.com 접속**

3. **F12 > Network 탭 > WS 필터**

4. **페이지 새로고침**

5. **socket.io 항목 클릭**

**성공 시**:
```
Status: 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
```

**실패 시**:
```
Status: Failed
```

### **테스트 3: Console에서 수동 테스트**

브라우저 Console (F12):

```javascript
// WebSocket 연결 테스트
const testSocket = io('https://lico.berrple.com', {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

testSocket.on('connect', () => {
  console.log('✅ WebSocket 연결 성공!', testSocket.id);
});

testSocket.on('connect_error', (error) => {
  console.error('❌ WebSocket 연결 실패:', error);
});
```

---

## 🚨 일반적인 문제

### **문제 1: LICO 서버가 계속 재시작됨**
```bash
pm2 logs lico-server --lines 100
```

**에러 확인**:
- `Error: listen EADDRINUSE: address already in use :::5002`
  → 포트가 이미 사용 중
  ```bash
  sudo lsof -i :5002
  sudo kill -9 <PID>
  pm2 restart lico-server
  ```

- `Cannot find module ...`
  → 의존성 설치
  ```bash
  cd /root/lpm/lico/server
  npm install
  pm2 restart lico-server
  ```

### **문제 2: Nginx 502 Bad Gateway**
```bash
# LICO 서버 확인
pm2 status lico-server

# 포트 확인
sudo netstat -tlnp | grep 5002

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

### **문제 3: 클라이언트가 localhost:5002로 연결 시도**
→ 클라이언트가 재빌드되지 않았거나 캐시 문제

**해결**:
```bash
# 서버에서
cd /root/lpm/lico/client
npm run build
sudo cp -r dist/* /var/www/lico/client/dist/

# 브라우저에서
# Ctrl+Shift+Delete > 캐시 삭제
# 또는 시크릿 모드
```

---

## 📋 최종 체크리스트

- [ ] `pm2 status` - lico-server가 online 상태
- [ ] `sudo netstat -tlnp | grep 5002` - 포트 5002 리스닝 중
- [ ] `sudo nginx -T | grep "location /socket.io"` - Nginx 설정 확인
- [ ] `sudo nginx -t` - 문법 검사 통과
- [ ] `git pull origin main` - 최신 코드
- [ ] `npm run build` - 클라이언트 재빌드
- [ ] `sudo cp -r dist/* /var/www/...` - 배포 완료
- [ ] `curl -I https://lico.berrple.com/socket.io/` - 400 응답 (정상)
- [ ] 브라우저 Network > WS > Status: 101
- [ ] 주문 체결/취소 시 팝업 + 사운드 작동

---

## 🆘 추가 도움이 필요하면

각 단계의 출력을 공유해주세요:

```bash
# 1. 서버 상태
pm2 status

# 2. 포트 상태
sudo netstat -tlnp | grep 5002

# 3. Nginx 설정
sudo nginx -T | grep -A 20 "location /socket.io"

# 4. LICO 서버 로그
pm2 logs lico-server --lines 50

# 5. Nginx 에러 로그
sudo tail -n 50 /var/log/nginx/error.log
```

---

**작성일**: 2025-11-27
**관련 파일**:
- `QUICK_FIX.sh` (자동 스크립트)
- `NGINX_SETUP_GUIDE.md` (Nginx 상세 가이드)
- `WEBSOCKET_FIX.md` (문제 진단)
