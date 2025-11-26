# 🔢 계좌번호 시스템 가이드

## 📋 개요

Bank와 Lico에서 사용되는 계좌/지갑 시스템

## 🏦 Bank - 계좌번호 시스템

### 형식
```
XXXX-XXXX-XXXX-XXXX (16자리)
```

### 구조
- **첫 4자리 (XXXX)**: 은행 코드 `1234` (고정)
- **다음 8자리 (XXXX-XXXX)**: 랜덤 숫자
- **마지막 4자리 (XXXX)**: 체크섬 (Luhn 알고리즘)

### 예시
```
1234-5678-9012-3456
1234-1111-2222-7893
1234-9999-8888-4521
```

### 특징
✅ 자동 생성 (중복 방지)
✅ Luhn 알고리즘 체크섬 검증
✅ 마스킹 기능 (`1234-****-****-3456`)
✅ 유효성 검사

## 🪙 Lico - 지갑 주소 시스템

### 형식
```
0x + 40자리 16진수 (Ethereum 스타일)
```

### 예시
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8
0xA1B2C3D4E5F6789012345678901234567890ABCD
0x1234567890abcdef1234567890abcdef12345678
```

### 특징
✅ SHA-256 해시 기반 생성
✅ 중복 방지
✅ 단축 표시 (`0x742d...bEb8`)
✅ QR 코드 지원 (`lico:0x...`)

## 🔗 Bank ↔ Lico 연동

### 연동 구조
```
Bank Account (계좌번호)
    ↕️
Lico Wallet (지갑 주소)
    ↕️
[bank_account_number 필드로 연결]
```

### 입출금 흐름

**입금 (Bank → Lico)**
1. Bank 계좌에서 출금 신청
2. 관리자 승인
3. Lico 지갑으로 Gold 이동
4. 거래 기록 양쪽 DB에 저장

**출금 (Lico → Bank)**
1. Lico 지갑에서 출금 신청
2. Bank 계좌번호 입력
3. 관리자 승인
4. Bank 계좌로 Gold 이동

## 📊 데이터베이스 구조

### Bank - accounts 테이블
```sql
CREATE TABLE accounts (
    id CHAR(36) PRIMARY KEY,
    account_number VARCHAR(20) UNIQUE NOT NULL,  -- 계좌번호
    minecraft_username VARCHAR(16) UNIQUE,
    minecraft_uuid VARCHAR(36) UNIQUE,
    balance BIGINT DEFAULT 0,
    status ENUM('ACTIVE', 'SUSPENDED', 'CLOSED'),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Lico - user_wallets 테이블
```sql
CREATE TABLE user_wallets (
    id CHAR(36) PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,  -- 지갑 주소
    minecraft_username VARCHAR(16) UNIQUE,
    bank_account_number VARCHAR(20),              -- Bank 연동
    gold_balance BIGINT DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 💻 API 사용 예시

### Bank - 계좌번호 생성
```typescript
import accountNumberService from './services/accountNumberService';

// 새 계좌 생성
const accountNumber = await accountNumberService.generateAccountNumber();
// 결과: "1234-5678-9012-3456"

// 계좌번호 유효성 검사
const isValid = accountNumberService.validateAccountNumber("1234-5678-9012-3456");
// 결과: true

// 계좌 조회
const account = await accountNumberService.getAccountByNumber("1234-5678-9012-3456");

// 계좌번호 마스킹
const masked = accountNumberService.maskAccountNumber("1234-5678-9012-3456");
// 결과: "1234-****-****-3456"
```

### Lico - 지갑 주소 생성
```typescript
import walletAddressService from './services/walletAddressService';

// 새 지갑 생성
const walletAddress = await walletAddressService.generateWalletAddress("PlayerName");
// 결과: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"

// 지갑 주소 유효성 검사
const isValid = walletAddressService.validateWalletAddress("0x742d...");
// 결과: true

// 지갑 조회
const wallet = await walletAddressService.getWalletByAddress("0x742d...");

// 주소 단축 표시
const short = walletAddressService.shortenAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8");
// 결과: "0x742d...bEb8"

// QR 코드 데이터
const qrData = walletAddressService.generateQRData("0x742d...");
// 결과: "lico:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8"
```

## 🔐 보안 기능

### Bank
- ✅ Luhn 알고리즘 체크섬
- ✅ 계좌번호 마스킹
- ✅ 중복 방지 (최대 100회 재시도)
- ✅ 활성 계좌만 조회

### Lico
- ✅ SHA-256 해시 기반
- ✅ 중복 방지
- ✅ 16진수 형식 검증
- ✅ 활성 지갑만 조회

## 📱 UI 표시 예시

### Bank 계좌번호
```
┌─────────────────────────┐
│ 계좌번호                 │
│ 1234-5678-9012-3456     │
│ ✅ 유효한 계좌           │
└─────────────────────────┘
```

### Lico 지갑 주소
```
┌─────────────────────────────────────┐
│ 지갑 주소                            │
│ 0x742d...bEb8                       │
│ [📋 복사] [📱 QR코드]                │
└─────────────────────────────────────┘
```

## 🔄 이체 시나리오

### Bank 내부 이체
```
사용자 A (1234-1111-2222-3333)
    ↓ 1,000 Gold
사용자 B (1234-4444-5555-6666)
```

### Lico 내부 거래
```
지갑 A (0xABCD...1234)
    ↓ 코인 매수/매도
지갑 B (0xEFGH...5678)
```

### Bank → Lico 입금
```
Bank 계좌 (1234-1111-2222-3333)
    ↓ 10,000 Gold 출금
Lico 지갑 (0xABCD...1234)
    ↑ 10,000 Gold 입금
```

## ⚠️ 주의사항

1. **계좌번호/지갑 주소 노출 주의**
   - 공개 화면에서는 마스킹/단축 표시 사용
   - 전체 번호는 본인 확인 후에만 표시

2. **이체 전 검증 필수**
   - 계좌번호/지갑 주소 유효성 검사
   - 수신자 존재 여부 확인
   - 잔액 확인

3. **에러 처리**
   - 생성 실패 시 재시도
   - 중복 발생 시 자동 재생성
   - 유효하지 않은 번호 거부

## 📊 통계

### 계좌번호 가능 조합
- 은행 코드: 1개 (1234 고정)
- 랜덤 부분: 100,000,000개 (10^8)
- 체크섬: 자동 계산
- **총 가능 계좌 수**: 약 1억 개

### 지갑 주소 가능 조합
- 16진수 40자리
- **총 가능 주소 수**: 2^160 = 약 1.46 × 10^48 개
- 실질적으로 무제한

## 🚀 향후 기능

- [ ] 계좌번호/지갑 별칭 설정
- [ ] 즐겨찾기 기능
- [ ] 이체 내역 조회
- [ ] QR 코드 스캔
- [ ] 2단계 인증
- [ ] 거래 알림
