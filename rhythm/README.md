# Berrple Rhythm Game

rhythm.berrple.com용 건반형 리듬게임

## 주요 기능

### 게임플레이
- **다중 키 모드**: 4키, 5키, 6키 지원
- **노트 타입**:
  - 일반 노트 (0-200ms 판정)
  - 롱노트 (10ms당 1콤보)
  - 슬라이드 노트
- **판정 시스템**: YAS, OH, AH, FUCK
- **이펙트**: 화면 회전, 노이즈, 줌

### 단축키
- F1/F2: 배속 증가/감소
- F7/F8: 디스플레이 싱크 +1ms/-1ms
- F9/F10: 노트 낙하 속도 ×0.5/×2
- ESC: 일시정지

### ADMIN 기능
- 곡 업로드 (오디오 + 커버 이미지)
- 비트맵 에디터
  - 노트 직접 배치
  - BPM 자동 감지
  - 그리드 스냅
  - 실시간 프리뷰
  - 이펙트 타임라인

### 난이도
- HAMGU (가장 쉬움)
- YETTI
- DAIN
- KBG
- MANGO (가장 어려움)

### 멀티플레이
- **SOLO 모드**: 곡 선택하여 플레이
- **RANK 모드**:
  - 티어 기반 매칭
  - 밴픽 시스템 (5곡당 2밴)
  - 3판 2선
  - 실시간 이모티콘

### 시스템
- 리더보드 (글로벌/곡별)
- 상세 통계
- 레이팅 시스템
- 모바일 최적화
- 오프셋 자동 보정

## 설치 및 실행

### 데이터베이스 설정
```bash
mysql -u root -p < server/schema.sql
```

### 서버 실행
```bash
cd server
npm install
npm run dev
```

### 클라이언트 실행
```bash
cd client
npm install
npm run dev
```

## 접속
- Client: http://localhost:3003
- Server API: http://localhost:5003

## 기술 스택
- **Backend**: Node.js, Express, TypeScript, Socket.IO, MySQL
- **Frontend**: React, TypeScript, Vite, Howler.js, Canvas API
- **실시간 통신**: WebSocket (Socket.IO)

## 개발 상태
✅ 인증 시스템
✅ 게임 엔진
✅ 비트맵 에디터
✅ WebSocket 통신
✅ 랭크 매칭
✅ 리더보드
✅ 통계 시스템
