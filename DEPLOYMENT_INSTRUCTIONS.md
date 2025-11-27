# 🚨 긴급 배포 가이드 - 돈 복사 버그 수정

## 문제 상황
현재 프로덕션 환경 (https://lico.berrple.com/deposit-withdraw)에서 입금 시 돈이 무한정 증식하는 버그 발생

## 원인
1. 클라이언트가 `transaction_id`를 전송하지 않음
2. 프로덕션 DB에 `deposit_logs`, `withdrawal_logs` 테이블 미생성
3. 프로덕션 서버가 구버전 코드 실행 중 (보안 체크 없음)

## 해결 사항
### ✅ 클라이언트 수정 완료
- `transaction_id` 자동 생성 (타임스탬프 + 랜덤)
- 정수만 입력 가능하도록 검증 추가
- 중복 클릭 방지 (loading 상태 체크)
- 입력 필드에 `step="1"` 추가

### ✅ 서버 보안 시스템 (이미 커밋됨)
- Transaction ID 중복 검사
- DB 트랜잭션 락 (FOR UPDATE)
- Rate Limiting (1분에 5회)
- 정수만 허용, 소수점 차단

---

## 🔴 필수 배포 단계

### 1️⃣ 데이터베이스 마이그레이션 (최우선!)
```bash
# 프로덕션 서버 SSH 접속 후
cd /path/to/lpm/lico/server

# MariaDB 접속
mysql -u [username] -p [database_name]

# SQL 파일 실행
source src/database/create_deposit_logs.sql;

# 또는 직접 실행:
mysql -u [username] -p [database_name] < src/database/create_deposit_logs.sql

# 테이블 생성 확인
SHOW TABLES LIKE '%_logs';
# deposit_logs, withdrawal_logs 테이블 확인
```

### 2️⃣ 서버 재시작 (필수!)
```bash
# 프로덕션 서버에서
cd /path/to/lpm/lico/server

# Git pull로 최신 코드 받기
git pull origin main

# 의존성 설치 (rateLimiter.ts 등)
npm install

# TypeScript 빌드
npm run build

# 서버 재시작 (PM2 사용 시)
pm2 restart lico-server

# 또는 일반 재시작
pkill -f "node.*server"
npm start

# 서버 로그 확인 (보안 시스템 작동 확인)
pm2 logs lico-server --lines 50
```

### 3️⃣ 클라이언트 재배포
```bash
cd /path/to/lpm/lico/client

# Git pull
git pull origin main

# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 파일 배포 (Nginx 등)
# dist 폴더를 프로덕션 서버로 복사
```

---

## 🧪 배포 후 테스트

### 1. 서버 로그 확인
```bash
pm2 logs lico-server --lines 100
# 또는
tail -f /path/to/server/logs/app.log
```

### 2. 입금 테스트 (브라우저 개발자 도구에서)
```javascript
// 개발자 도구 Console에서 실행
// 1. 첫 번째 입금 (성공해야 함)
await fetch('https://lico.berrple.com/api/wallets/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: '[테스트_지갑_주소]',
    amount: 100,
    transaction_id: 'TEST-' + Date.now()
  })
});

// 2. 동일한 transaction_id로 재시도 (실패해야 함!)
await fetch('https://lico.berrple.com/api/wallets/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: '[테스트_지갑_주소]',
    amount: 100,
    transaction_id: 'TEST-12345678' // 동일한 ID
  })
});
// 예상 응답: {"error": "이미 처리된 입금 거래입니다"}
```

### 3. Rate Limiting 테스트
```bash
# 1분 내 6회 이상 요청 시도 (6번째는 실패해야 함)
for i in {1..7}; do
  curl -X POST https://lico.berrple.com/api/wallets/deposit \
    -H "Content-Type: application/json" \
    -d "{\"wallet_address\":\"test\",\"amount\":100,\"transaction_id\":\"TEST-$i\"}"
  echo "\nRequest $i done"
  sleep 1
done
# 6번째 요청에서 HTTP 429 에러 예상
```

---

## 🔍 문제 해결

### 문제: "deposit_logs 테이블이 없습니다" 에러
**해결:** SQL 마이그레이션 다시 실행
```sql
SOURCE src/database/create_deposit_logs.sql;
```

### 문제: 여전히 돈이 증식됨
**원인:** 서버가 재시작되지 않아 구버전 코드 실행 중
**해결:**
```bash
pm2 restart lico-server --update-env
# 또는 완전 재시작
pm2 delete lico-server
pm2 start ecosystem.config.js
```

### 문제: "유효하지 않은 Transaction ID" 에러
**원인:** 클라이언트 재배포 안됨
**해결:** 클라이언트 다시 빌드 및 배포

---

## 📊 배포 완료 체크리스트

- [ ] deposit_logs, withdrawal_logs 테이블 생성 확인
  ```sql
  SELECT COUNT(*) FROM deposit_logs;  -- 오류 없이 실행되어야 함
  ```
- [ ] 서버 재시작 완료 (PM2 status 또는 프로세스 확인)
- [ ] 서버 로그에서 "✅ 입금 완료" 메시지 확인
- [ ] 클라이언트 재배포 완료 (빌드 타임스탬프 확인)
- [ ] 브라우저에서 입금 1회 테스트 (성공)
- [ ] 동일한 transaction_id로 재시도 (실패 확인)
- [ ] 1분에 6회 이상 요청 시 Rate Limit 에러 확인

---

## 🛡️ 보안 검증

### 올바른 동작:
✅ 입금 1회 → 금액 증가
✅ 동일 transaction_id 재시도 → **거부**
✅ 1분에 6회 이상 요청 → **HTTP 429 에러**
✅ 소수점 금액 입력 → **거부**
✅ 음수 금액 입력 → **거부**

### 잘못된 동작 (발생 시 즉시 확인 필요):
❌ 입금 1회인데 금액이 2배 증가
❌ 연속 클릭 시 금액이 여러 번 증가
❌ 새로고침 후 다시 입금되어 있음

---

## 📞 긴급 연락

문제 발생 시:
1. 서버 로그 확인: `pm2 logs lico-server`
2. DB 로그 확인: `SELECT * FROM deposit_logs ORDER BY created_at DESC LIMIT 10;`
3. 필요 시 서버 중단: `pm2 stop lico-server`

---

**최종 수정:** 2025-11-27
**커밋:** 7873dc0 "security: 절대 돈 복사 불가 - 최강 보안 시스템 구축"
