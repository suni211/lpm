# 🔧 Nginx WebSocket 설정 가이드 (Ubuntu/Linux)

## 1. 서버 SSH 접속

```bash
# 서버에 SSH로 접속
ssh username@lico.berrple.com
# 또는
ssh username@서버IP주소
```

---

## 2. Nginx 설정 파일 찾기

### **2-1. 기존 설정 파일 확인**

```bash
# lico.berrple.com 설정 파일 찾기
ls -la /etc/nginx/sites-available/ | grep lico

# 또는 모든 설정 파일 보기
ls -la /etc/nginx/sites-available/
```

**예상 출력**:
```
lico.berrple.com
# 또는
lico
# 또는
default
```

### **2-2. 현재 활성화된 설정 확인**

```bash
# 심볼릭 링크 확인
ls -la /etc/nginx/sites-enabled/
```

---

## 3. Nginx 설정 파일 수정

### **방법 1: nano 에디터 사용 (추천)**

```bash
# 설정 파일 열기 (파일명은 실제 파일명으로 변경)
sudo nano /etc/nginx/sites-available/lico.berrple.com
```

**또는**:
```bash
sudo nano /etc/nginx/sites-available/default
```

### **방법 2: vim 에디터 사용**

```bash
sudo vim /etc/nginx/sites-available/lico.berrple.com
```

---

## 4. 설정 내용 추가/수정

### **기존 설정 예시** (현재 상태)

```nginx
server {
    listen 443 ssl http2;
    server_name lico.berrple.com;

    ssl_certificate /etc/letsencrypt/live/lico.berrple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lico.berrple.com/privkey.pem;

    location /api/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/lico/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### **수정 후 설정** (WebSocket 추가)

```nginx
server {
    listen 443 ssl http2;
    server_name lico.berrple.com;

    # SSL 인증서 (Let's Encrypt 기본 경로)
    ssl_certificate /etc/letsencrypt/live/lico.berrple.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lico.berrple.com/privkey.pem;

    # SSL 설정 최적화 (선택사항)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

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

    # ⭐ WebSocket 프록시 (새로 추가!)
    location /socket.io/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 타임아웃 설정 (24시간)
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 86400;
    }

    # 이미지 파일 프록시 (서버에서 업로드된 이미지)
    location /images/ {
        proxy_pass http://localhost:5002/images/;
        proxy_set_header Host $host;
    }

    # 정적 파일 (프론트엔드)
    location / {
        root /var/www/lico/client/dist;
        try_files $uri $uri/ /index.html;
    }
}

# HTTP to HTTPS 리다이렉트 (선택사항)
server {
    listen 80;
    server_name lico.berrple.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 5. nano 에디터 사용법

### **파일 열기**
```bash
sudo nano /etc/nginx/sites-available/lico.berrple.com
```

### **편집하기**
1. 화살표 키로 이동
2. `/socket.io/` location 블록을 **`location /api/ { ... }` 아래에** 추가

### **저장하기**
1. `Ctrl + O` (저장)
2. `Enter` (파일명 확인)
3. `Ctrl + X` (종료)

---

## 6. 설정 테스트 및 적용

### **6-1. 문법 검사**

```bash
sudo nginx -t
```

**성공 시**:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**실패 시**:
```
nginx: [emerg] unexpected "}" in /etc/nginx/sites-available/lico.berrple.com:42
nginx: configuration file /etc/nginx/nginx.conf test failed
```
→ 오타나 괄호 확인 후 다시 수정

### **6-2. Nginx 재시작**

```bash
# 방법 1: restart (완전 재시작)
sudo systemctl restart nginx

# 방법 2: reload (다운타임 없이 재시작, 추천)
sudo systemctl reload nginx
```

### **6-3. Nginx 상태 확인**

```bash
sudo systemctl status nginx
```

**정상 작동 시**:
```
● nginx.service - A high performance web server
   Loaded: loaded (/lib/systemd/system/nginx.service; enabled)
   Active: active (running) since ...
```

---

## 7. 빠른 명령어 요약

```bash
# 1. 서버 접속
ssh username@lico.berrple.com

# 2. Nginx 설정 파일 편집
sudo nano /etc/nginx/sites-available/lico.berrple.com

# 3. 위의 설정 내용 중 /socket.io/ location 블록 추가

# 4. 저장: Ctrl+O, Enter, Ctrl+X

# 5. 문법 검사
sudo nginx -t

# 6. Nginx 재시작
sudo systemctl reload nginx

# 7. 상태 확인
sudo systemctl status nginx
```

---

## 8. 문제 해결

### **문제 1: 설정 파일을 찾을 수 없음**

```bash
# 모든 Nginx 설정 파일 검색
sudo find /etc/nginx -name "*.conf" -o -name "*lico*"

# 기본 설정 파일 사용
sudo nano /etc/nginx/sites-available/default
```

### **문제 2: Permission denied**

```bash
# sudo 사용 필수
sudo nano /etc/nginx/sites-available/lico.berrple.com
```

### **문제 3: Nginx 재시작 실패**

```bash
# 에러 로그 확인
sudo tail -n 50 /var/log/nginx/error.log

# Nginx 프로세스 확인
ps aux | grep nginx

# 강제 재시작
sudo systemctl stop nginx
sudo systemctl start nginx
```

### **문제 4: Let's Encrypt 인증서 경로가 다름**

```bash
# 인증서 찾기
sudo ls -la /etc/letsencrypt/live/

# 인증서 확인
sudo certbot certificates
```

인증서 경로를 실제 경로로 변경:
```nginx
ssl_certificate /etc/letsencrypt/live/실제도메인/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/실제도메인/privkey.pem;
```

---

## 9. 설정 완료 후 테스트

### **9-1. 서버에서 테스트**

```bash
# WebSocket 엔드포인트 확인
curl -I https://lico.berrple.com/socket.io/

# 예상 출력:
# HTTP/1.1 400 Bad Request (정상, WebSocket 핸드셰이크 필요)
```

### **9-2. 브라우저에서 테스트**

1. https://lico.berrple.com 접속
2. F12 (개발자 도구) 열기
3. **Network 탭** > **WS 필터** 선택
4. 페이지 새로고침
5. `socket.io` 항목 클릭

**성공 시**:
```
Status: 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
```

**실패 시**:
```
Status: Failed
```
→ Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`

---

## 10. 최종 체크리스트

- [ ] SSH로 서버 접속
- [ ] Nginx 설정 파일 위치 확인
- [ ] `/socket.io/` location 블록 추가
- [ ] `sudo nginx -t` 문법 검사 통과
- [ ] `sudo systemctl reload nginx` 재시작
- [ ] `sudo systemctl status nginx` 정상 작동 확인
- [ ] 브라우저에서 WebSocket 연결 확인 (Network > WS > 101)
- [ ] 주문 체결/취소 시 팝업 + 사운드 작동 확인

---

## 11. 설정 파일 백업 (추천)

수정 전에 백업:

```bash
# 백업 생성
sudo cp /etc/nginx/sites-available/lico.berrple.com /etc/nginx/sites-available/lico.berrple.com.backup

# 복구가 필요한 경우
sudo cp /etc/nginx/sites-available/lico.berrple.com.backup /etc/nginx/sites-available/lico.berrple.com
sudo systemctl reload nginx
```

---

**작성일**: 2025-11-27
**목적**: lico.berrple.com WebSocket 연결 설정
**포트**: 5002 (LICO 서버)
