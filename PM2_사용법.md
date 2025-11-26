# PM2 사용법 - CRYPBANK & CRYP-UP

## PM2란?
PM2는 Node.js 애플리케이션을 백그라운드에서 실행하고 관리하는 프로세스 매니저입니다.

## 설치

```bash
# PM2 전역 설치
sudo npm install -g pm2
```

## 로그 디렉토리 생성

```bash
# 서버 로그 디렉토리 생성
mkdir -p ~/lpm/bank/server/logs
mkdir -p ~/lpm/lico/server/logs
```

## PM2로 서버 시작

### 방법 1: ecosystem.config.js 사용 (권장)

```bash
# 프로젝트 루트로 이동
cd ~/lpm

# PM2로 모든 앱 시작
pm2 start ecosystem.config.js

# 또는 특정 앱만 시작
pm2 start ecosystem.config.js --only crypbank-server
pm2 start ecosystem.config.js --only crypup-server
```

### 방법 2: 개별 실행

```bash
# CRYPBANK 서버 시작
cd ~/lpm/bank/server
pm2 start dist/index.js --name crypbank-server

# CRYP-UP 서버 시작
cd ~/lpm/lico/server
pm2 start dist/index.js --name crypup-server
```

## PM2 명령어

### 앱 상태 확인
```bash
# 실행 중인 모든 앱 상태 확인
pm2 status

# 또는
pm2 list

# 특정 앱 상세 정보
pm2 show crypbank-server
pm2 show crypup-server
```

### 로그 확인
```bash
# 모든 앱의 로그 실시간 확인
pm2 logs

# 특정 앱의 로그만 확인
pm2 logs crypbank-server
pm2 logs crypup-server

# 에러 로그만 확인
pm2 logs --err

# 로그 지우기
pm2 flush
```

### 앱 재시작
```bash
# 모든 앱 재시작
pm2 restart all

# 특정 앱만 재시작
pm2 restart crypbank-server
pm2 restart crypup-server

# 0-second downtime 재시작 (reload)
pm2 reload all
```

### 앱 중지
```bash
# 모든 앱 중지
pm2 stop all

# 특정 앱만 중지
pm2 stop crypbank-server
pm2 stop crypup-server
```

### 앱 삭제
```bash
# 모든 앱 삭제 (PM2 목록에서 제거)
pm2 delete all

# 특정 앱만 삭제
pm2 delete crypbank-server
pm2 delete crypup-server
```

### 모니터링
```bash
# 실시간 모니터링 (CPU, 메모리 사용량)
pm2 monit

# 웹 대시보드 (선택사항)
pm2 plus
```

## 부팅 시 자동 시작 설정

```bash
# 현재 PM2 프로세스를 시작 스크립트로 저장
pm2 save

# 부팅 시 자동 시작 설정 생성
pm2 startup

# 위 명령어가 출력하는 명령어를 복사해서 실행
# 예시: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
```

## 코드 업데이트 후 배포

```bash
# 1. 최신 코드 받기
cd ~/lpm
git pull

# 2. CRYPBANK 서버 재빌드
cd ~/lpm/bank/server
npm install
npm run build

# 3. CRYP-UP 서버 재빌드
cd ~/lpm/lico/server
npm install
npm run build

# 4. PM2 재시작
cd ~/lpm
pm2 restart all

# 또는 0-second downtime 재시작
pm2 reload all
```

## 문제 해결

### 앱이 시작되지 않을 때
```bash
# 로그 확인
pm2 logs crypbank-server --lines 100
pm2 logs crypup-server --lines 100

# 상세 정보 확인
pm2 show crypbank-server
pm2 show crypup-server

# 환경 변수 확인
pm2 env 0  # 첫 번째 앱
pm2 env 1  # 두 번째 앱
```

### 메모리 누수 의심 시
```bash
# 메모리 사용량 확인
pm2 monit

# 메모리 제한 설정 (ecosystem.config.js에 이미 설정됨: 1GB)
pm2 restart crypbank-server --max-memory-restart 1G
```

### PM2 완전히 초기화
```bash
# 모든 프로세스 삭제
pm2 delete all

# PM2 데몬 종료
pm2 kill

# 다시 시작
pm2 start ecosystem.config.js
```

## ecosystem.config.js 설정 설명

```javascript
{
  name: 'crypbank-server',        // PM2에서 표시될 이름
  cwd: './bank/server',           // 작업 디렉토리
  script: 'dist/index.js',        // 실행할 스크립트
  instances: 1,                   // 인스턴스 개수
  exec_mode: 'fork',              // 실행 모드 (fork/cluster)
  env: {                          // 환경 변수
    NODE_ENV: 'production',
    PORT: 5001
  },
  error_file: './logs/err.log',   // 에러 로그 파일
  out_file: './logs/out.log',     // 출력 로그 파일
  autorestart: true,              // 크래시 시 자동 재시작
  watch: false,                   // 파일 변경 감지 (프로덕션에서는 false)
  max_memory_restart: '1G'        // 메모리 1GB 초과 시 재시작
}
```

## 유용한 팁

### 1. 로그 파일 크기 관리
```bash
# PM2 로그 로테이션 모듈 설치
pm2 install pm2-logrotate

# 설정 확인
pm2 conf pm2-logrotate
```

### 2. 프로세스 우선순위 설정
```bash
# nice 값 설정 (낮을수록 높은 우선순위)
pm2 start ecosystem.config.js --nice 10
```

### 3. 환경별 설정
```bash
# 개발 환경
pm2 start ecosystem.config.js --env development

# 프로덕션 환경 (기본값)
pm2 start ecosystem.config.js --env production
```

## 포트 확인

```bash
# 포트 사용 확인
sudo netstat -tulpn | grep :5001  # CRYPBANK
sudo netstat -tulpn | grep :5002  # CRYP-UP

# 또는
sudo lsof -i :5001
sudo lsof -i :5002
```

## 요약: 자주 사용하는 명령어

```bash
# 시작
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs

# 재시작
pm2 restart all

# 중지
pm2 stop all

# 삭제
pm2 delete all

# 저장 (부팅 시 자동 시작용)
pm2 save

# 모니터링
pm2 monit
```

## 주의사항

1. **프로덕션에서는 `watch: false`로 설정** - 파일 변경 감지는 개발 환경에서만 사용
2. **로그 파일 주기적으로 정리** - `pm2 flush` 또는 logrotate 사용
3. **메모리 제한 설정** - 메모리 누수 방지
4. **`pm2 save` 잊지 말기** - 부팅 시 자동 시작을 위해 필수
5. **.env 파일 확인** - PM2는 .env 파일을 자동으로 로드하지 않으므로 ecosystem.config.js에 환경 변수 설정 필요

## CRYPBANK & CRYP-UP 특화 명령어

```bash
# 두 서버 모두 재시작
pm2 restart all

# CRYPBANK만 재시작
pm2 restart crypbank-server

# CRYP-UP만 재시작
pm2 restart crypup-server

# 두 서버 로그 동시 확인
pm2 logs

# 두 서버 상태 확인
pm2 status
```
