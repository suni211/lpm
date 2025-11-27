# 🔧 WebSocket 연결 실패 수정 가이드

## 문제 진단

### 1. **WebSocket 연결 실패**
```
WebSocket connection to 'wss://lico.berrple.com/socket.io/?EIO=4&transport=websocket' failed
```

### 2. **사운드가 재생되지 않음**
- WebSocket 연결이 안 되어서 `order:filled`, `order:cancelled` 이벤트를 받지 못함
- 이벤트를 받지 못하므로 사운드가 재생되지 않음

### 3. **차트 데이터 오류**
```
Invalid or out-of-range timestamp: "+057875-11-23T17:00:00.000Z"
```

---

## 해결 방법

### **1단계: 프로덕션 환경 변수 추가**

`.env.production` 파일이 생성되었습니다:

```bash
# lico/client/.env.production
VITE_API_BASE_URL=https://lico.berrple.com
```

**이유**: 빌드 시 `localhost:5002` 대신 프로덕션 도메인 사용

---

### **2단계: Nginx WebSocket 프록시 설정 확인**

Nginx 설정 파일 (`/etc/nginx/sites-available/lico.berrple.com`)에 다음이 포함되어 있는지 확인:

```nginx
server {
    listen 443 ssl http2;
    server_name lico.berrple.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # 일반 API 프록시
    location /api/ {
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

    # WebSocket 프록시 (매우 중요!)
    location /socket.io/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 타임아웃 설정
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 86400;
    }

    # 정적 파일 (프론트엔드)
    location / {
        root /var/www/lico/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**핵심 포인트**:
- `/socket.io/` 경로에 대한 별도 프록시 설정 필요
- `Upgrade $http_upgrade`와 `Connection "upgrade"` 헤더 필수
- 타임아웃 설정으로 장시간 연결 유지

---

### **3단계: Nginx 설정 적용**

```bash
# Nginx 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

---

### **4단계: 클라이언트 재빌드 및 배포**

```bash
cd /path/to/lpm/lico/client

# 최신 코드 받기
git pull origin main

# 의존성 설치
npm install

# 프로덕션 빌드 (.env.production 사용됨)
npm run build

# 빌드된 파일 확인
ls -la dist/
ls -la dist/sounds/

# 빌드 파일 배포 (예시)
sudo rm -rf /var/www/lico/client/dist/*
sudo cp -r dist/* /var/www/lico/client/dist/
```

---

### **5단계: 서버 상태 확인**

```bash
# LICO 서버가 실행 중인지 확인
pm2 status lico-server

# 로그 확인
pm2 logs lico-server

# 예상 출력:
# ✅ WebSocket server initialized
# 🔌 WebSocket server initialized
```

---

### **6단계: 테스트**

#### **6-1. WebSocket 연결 테스트**

브라우저 개발자 도구 (F12) > Network 탭 > WS 필터:

✅ **성공 시**:
```
Status: 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
```

❌ **실패 시**:
```
Status: Failed
Error: WebSocket is closed before the connection is established
```

#### **6-2. 사운드 테스트**

Console 탭에서:

```javascript
// 사운드 파일 존재 확인
fetch('/sounds/order-filled.mp3')
  .then(r => console.log('✅ order-filled.mp3 존재:', r.status))
  .catch(e => console.error('❌ 파일 없음:', e));

fetch('/sounds/order-cancelled.mp3')
  .then(r => console.log('✅ order-cancelled.mp3 존재:', r.status))
  .catch(e => console.error('❌ 파일 없음:', e));

// 수동 재생 테스트
const audio1 = new Audio('/sounds/order-filled.mp3');
audio1.volume = 0.6;
audio1.play().then(() => console.log('✅ 재생 성공')).catch(e => console.error('❌ 재생 실패:', e));

const audio2 = new Audio('/sounds/order-cancelled.mp3');
audio2.volume = 0.5;
audio2.play().then(() => console.log('✅ 재생 성공')).catch(e => console.error('❌ 재생 실패:', e));
```

#### **6-3. 실제 주문 테스트**

1. 거래 페이지에서 지정가 주문 생성
2. 주문이 체결되면:
   - ✅ 녹색 Toast 팝업 표시
   - 🔊 주문 체결 사운드 재생
3. 주문을 취소하면:
   - ℹ️ 파란색 Toast 팝업 표시
   - 🔊 주문 취소 사운드 재생

---

## 추가 문제 해결

### **문제: 브라우저 자동 재생 차단**

**증상**: Console에 다음 에러 표시
```
Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first
```

**해결**:
1. 페이지를 한 번 클릭한 후 주문 생성
2. 또는 브라우저 설정에서 사이트별 자동 재생 허용:
   - Chrome: `chrome://settings/content/sound`
   - Firefox: 사이트 정보 > 권한 > 자동 재생

---

### **문제: 사운드가 여전히 안 남**

**확인 사항**:

1. **로컬 스토리지 확인**:
   ```javascript
   // Console에서 확인
   localStorage.getItem('sound_enabled')
   // 'false'면 사운드가 꺼진 상태

   // 사운드 활성화
   localStorage.setItem('sound_enabled', 'true')
   // 페이지 새로고침
   ```

2. **볼륨 확인**:
   - 시스템 볼륨이 0이 아닌지 확인
   - 브라우저 탭이 음소거되지 않았는지 확인

---

### **문제: 차트 타임스탬프 오류**

**증상**:
```
Invalid or out-of-range timestamp: "+057875-11-23T17:00:00.000Z"
```

**원인**: DB에 잘못된 타임스탬프 데이터가 들어감

**해결**:
```sql
-- MariaDB/MySQL에서 실행
-- 잘못된 캔들 데이터 삭제
DELETE FROM candles_1m WHERE open_time > '2100-01-01';
DELETE FROM candles_1h WHERE open_time > '2100-01-01';
DELETE FROM candles_1d WHERE open_time > '2100-01-01';

-- 데이터 확인
SELECT coin_id, open_time, open_price FROM candles_1h
WHERE coin_id = 1
ORDER BY open_time DESC
LIMIT 10;
```

---

## 최종 체크리스트

- [ ] `.env.production` 파일 생성 및 푸시
- [ ] Nginx WebSocket 프록시 설정 (`/socket.io/` 경로)
- [ ] Nginx 재시작
- [ ] 클라이언트 재빌드 (`npm run build`)
- [ ] 빌드 파일 배포 (dist/ 폴더)
- [ ] 사운드 파일 확인 (`dist/sounds/*.mp3`)
- [ ] LICO 서버 실행 중 확인
- [ ] WebSocket 연결 테스트 (개발자 도구)
- [ ] 사운드 재생 테스트 (Console)
- [ ] 실제 주문 체결/취소 테스트

---

**작성일**: 2025-11-27
**관련 커밋**:
- 51556fb "fix: WebSocket 타입 에러 수정"
- cd1acae "feat: 주문 알림 사운드 파일 추가"
