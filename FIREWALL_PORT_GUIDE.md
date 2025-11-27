# 🔥 방화벽 5002 포트 열기 가이드

## 빠른 실행 (서버에서)

```bash
# Ubuntu/Debian (UFW 사용)
sudo ufw allow 5002/tcp
sudo ufw reload
sudo ufw status

# CentOS/RHEL (firewalld 사용)
sudo firewall-cmd --permanent --add-port=5002/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

---

## 방법 1: UFW (Ubuntu/Debian)

### **1-1. UFW 상태 확인**
```bash
sudo ufw status
```

**출력 예시**:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

### **1-2. 5002 포트 열기**
```bash
# TCP 포트 5002 허용
sudo ufw allow 5002/tcp

# 특정 IP에서만 허용 (보안 강화, 선택사항)
# sudo ufw allow from 특정IP to any port 5002
```

### **1-3. 설정 적용**
```bash
sudo ufw reload
```

### **1-4. 확인**
```bash
sudo ufw status numbered
```

**예상 출력**:
```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 5002/tcp                   ALLOW IN    Anywhere  ← 새로 추가됨
```

---

## 방법 2: firewalld (CentOS/RHEL)

### **2-1. firewalld 상태 확인**
```bash
sudo systemctl status firewalld
```

### **2-2. 5002 포트 열기**
```bash
# 포트 추가 (영구 설정)
sudo firewall-cmd --permanent --add-port=5002/tcp

# 설정 적용
sudo firewall-cmd --reload
```

### **2-3. 확인**
```bash
sudo firewall-cmd --list-ports
```

**예상 출력**:
```
80/tcp 443/tcp 5002/tcp
```

---

## 방법 3: iptables (직접 설정)

### **3-1. 5002 포트 허용 규칙 추가**
```bash
sudo iptables -A INPUT -p tcp --dport 5002 -j ACCEPT
```

### **3-2. 규칙 저장**

**Ubuntu/Debian**:
```bash
sudo apt-get install iptables-persistent
sudo netfilter-persistent save
```

**CentOS/RHEL**:
```bash
sudo service iptables save
```

### **3-3. 확인**
```bash
sudo iptables -L -n | grep 5002
```

---

## 포트가 실제로 열려있는지 확인

### **서버에서 확인**
```bash
# 5002 포트가 리스닝 중인지 확인
sudo netstat -tlnp | grep 5002
# 또는
sudo ss -tlnp | grep 5002
```

**예상 출력** (LICO 서버 실행 중):
```
tcp   0   0 0.0.0.0:5002   0.0.0.0:*   LISTEN   12345/node
```

**출력이 없으면**: LICO 서버가 실행되지 않은 것
```bash
pm2 status lico-server
pm2 restart lico-server
```

### **외부에서 확인**

**방법 1: telnet**
```bash
# 로컬 PC에서 실행
telnet lico.berrple.com 5002
```

**성공 시**:
```
Trying lico.berrple.com...
Connected to lico.berrple.com.
```

**실패 시**:
```
telnet: Unable to connect to remote host: Connection refused
```
→ 방화벽이 막혀있거나 서버가 실행되지 않음

**방법 2: nc (netcat)**
```bash
nc -zv lico.berrple.com 5002
```

**성공 시**:
```
Connection to lico.berrple.com 5002 port [tcp/*] succeeded!
```

**방법 3: 온라인 도구**
- https://www.yougetsignal.com/tools/open-ports/
- Port: 5002
- IP: lico.berrple.com

---

## 클라우드 서버 추가 설정

### **AWS EC2**
1. EC2 대시보드 > 인스턴스 선택
2. Security Groups 클릭
3. Inbound Rules 편집
4. Add Rule:
   - Type: Custom TCP
   - Port Range: 5002
   - Source: 0.0.0.0/0 (모든 IP) 또는 특정 IP
5. Save rules

### **Google Cloud Platform (GCP)**
```bash
gcloud compute firewall-rules create allow-lico-5002 \
  --allow tcp:5002 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow LICO server port 5002"
```

### **Azure**
1. Virtual Machines > 네트워킹
2. 인바운드 포트 규칙 추가
3. 포트: 5002
4. 프로토콜: TCP
5. 작업: 허용

### **Oracle Cloud**
1. VNIC > Security Lists
2. Ingress Rules 추가
3. Source CIDR: 0.0.0.0/0
4. Destination Port: 5002
5. IP Protocol: TCP

---

## 문제 해결

### **문제 1: 포트를 열었는데도 연결 안 됨**

**확인 사항**:
```bash
# 1. LICO 서버 실행 확인
pm2 status lico-server

# 2. 포트 리스닝 확인
sudo netstat -tlnp | grep 5002

# 3. 방화벽 규칙 확인
sudo ufw status | grep 5002

# 4. 로그 확인
pm2 logs lico-server --lines 50
```

### **문제 2: UFW가 비활성화됨**

```bash
# UFW 활성화
sudo ufw enable

# 기본 규칙 설정 (주의: SSH 포트 먼저 열어야 함!)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5002/tcp  # LICO
sudo ufw enable
```

### **문제 3: 여러 방화벽이 동시에 실행 중**

```bash
# 어떤 방화벽이 실행 중인지 확인
sudo ufw status
sudo systemctl status firewalld
sudo iptables -L

# UFW와 firewalld 중 하나만 사용
sudo systemctl stop firewalld
sudo systemctl disable firewalld
sudo ufw enable
```

---

## LICO 전체 설정 (포트 정리)

### **필요한 포트**:
```bash
# 기본 포트
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# LICO 서버
sudo ufw allow 5002/tcp   # LICO API & WebSocket

# BANK 서버 (같은 서버에 있는 경우)
sudo ufw allow 5001/tcp   # BANK API

# 재적용
sudo ufw reload
sudo ufw status
```

---

## 보안 권장 사항

### **1. 내부 통신만 허용 (BANK ↔ LICO)**

만약 BANK와 LICO가 같은 서버에 있다면:
```bash
# 5002 포트를 외부에서 접근 불가하게 설정
sudo ufw delete allow 5002/tcp

# localhost에서만 접근 가능하도록 설정
# (이미 localhost는 방화벽을 거치지 않음)
```

**Nginx가 프록시 역할**:
- 외부: https://lico.berrple.com (443) → Nginx → localhost:5002 (LICO)
- WebSocket: wss://lico.berrple.com/socket.io/ → Nginx → localhost:5002

이 경우 5002 포트를 외부에 열 필요가 없습니다!

### **2. 특정 IP만 허용**
```bash
# 관리자 IP에서만 접근
sudo ufw allow from 123.123.123.123 to any port 5002
```

---

## 최종 체크리스트

- [ ] `sudo ufw allow 5002/tcp` 실행
- [ ] `sudo ufw reload` 실행
- [ ] `sudo ufw status` 확인 (5002/tcp ALLOW)
- [ ] `sudo netstat -tlnp | grep 5002` 확인 (LISTEN 상태)
- [ ] `pm2 status lico-server` 확인 (online 상태)
- [ ] `telnet lico.berrple.com 5002` 테스트 (외부에서)
- [ ] 브라우저 WebSocket 연결 확인 (Status: 101)

---

## ⚠️ 중요: Nginx 프록시를 사용하는 경우

**Nginx를 사용한다면 5002 포트를 외부에 열 필요가 없습니다!**

```nginx
# Nginx가 프록시 역할을 하므로
# 외부에서는 443 포트로만 접근
# Nginx가 내부적으로 localhost:5002로 연결

server {
    listen 443 ssl http2;

    location /socket.io/ {
        proxy_pass http://localhost:5002;  ← localhost 사용
        ...
    }
}
```

**이 경우 필요한 포트**:
- ✅ 22 (SSH)
- ✅ 80 (HTTP, HTTPS 리다이렉트용)
- ✅ 443 (HTTPS)
- ❌ 5002 (외부 접근 불필요, localhost만 사용)

---

**작성일**: 2025-11-27
**관련**: LICO WebSocket 연결 설정
