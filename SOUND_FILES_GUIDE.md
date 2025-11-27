# 🔊 사운드 파일 다운로드 가이드

## 필요한 파일

주문 체결/취소 알림을 위해 다음 사운드 파일이 필요합니다:

1. **order-filled.mp3** - 주문 체결 사운드
2. **order-cancelled.mp3** - 주문 취소 사운드

---

## 📥 옵션 1: 무료 사운드 사이트에서 다운로드

### 추천 사이트

#### 1. Freesound.org (무료, 로그인 필요)
- https://freesound.org/

**주문 체결 사운드 추천:**
- "coin drop" 검색
- "success notification" 검색
- "positive beep" 검색

**주문 취소 사운드 추천:**
- "notification click" 검색
- "soft beep" 검색
- "cancel sound" 검색

#### 2. Mixkit (무료, 로그인 불필요)
- https://mixkit.co/free-sound-effects/

**카테고리:**
- Alert & Notification 섹션
- Interface & Gaming 섹션

#### 3. Zapsplat (무료, 로그인 필요)
- https://www.zapsplat.com/

**검색어:**
- "notification"
- "coin"
- "success"

---

## 🎵 옵션 2: 간단한 샘플 사운드 (테스트용)

임시로 테스트하려면 아래 온라인 도구로 간단한 사운드 생성:

### SFXR (무료 온라인 사운드 생성기)
- https://sfxr.me/

1. 웹사이트 접속
2. "Pickup/Coin" 버튼 클릭 → order-filled용
3. "Blip/Select" 버튼 클릭 → order-cancelled용
4. "Export WAV" 클릭 후 MP3로 변환

### WAV → MP3 변환
- https://cloudconvert.com/wav-to-mp3

---

## 📂 파일 위치

다운로드한 파일을 다음 위치에 저장:

```
lico/client/public/sounds/
├── order-filled.mp3      ← 주문 체결 사운드
├── order-cancelled.mp3   ← 주문 취소 사운드
├── .gitkeep
└── README.md
```

---

## 🎬 빠른 시작 (Windows)

### 1. sounds 폴더로 이동
```bash
cd C:\Users\hisam\OneDrive\바탕 화면\lol\lpm\lico\client\public\sounds
```

### 2. 사운드 파일 다운로드 및 이름 변경

아래 명령어로 샘플 파일 생성 (임시):
```powershell
# PowerShell에서 실행
# 빈 파일 생성 (나중에 실제 사운드로 교체)
New-Item -Path "order-filled.mp3" -ItemType File -Force
New-Item -Path "order-cancelled.mp3" -ItemType File -Force
```

**또는** 웹사이트에서 다운로드한 파일을 다음 이름으로 변경:
- `downloaded-sound-1.mp3` → `order-filled.mp3`
- `downloaded-sound-2.mp3` → `order-cancelled.mp3`

---

## ✅ 설치 확인

### 1. 파일 확인
```bash
ls lico/client/public/sounds/
```

**예상 출력:**
```
order-filled.mp3
order-cancelled.mp3
README.md
.gitkeep
```

### 2. 브라우저 테스트

1. 프론트엔드 실행:
   ```bash
   cd lico/client
   npm run dev
   ```

2. 브라우저 개발자 도구 (F12) 열기

3. Console 탭에서 테스트:
   ```javascript
   // 주문 체결 사운드 테스트
   const audio1 = new Audio('/sounds/order-filled.mp3');
   audio1.play();

   // 주문 취소 사운드 테스트
   const audio2 = new Audio('/sounds/order-cancelled.mp3');
   audio2.play();
   ```

4. 소리가 들리면 성공! 🎉

---

## 🛠️ 문제 해결

### 사운드가 재생되지 않을 때

#### 1. 파일 경로 확인
```javascript
// 브라우저 Console에서 확인
fetch('/sounds/order-filled.mp3')
  .then(r => console.log('✅ 파일 존재:', r.status))
  .catch(e => console.error('❌ 파일 없음:', e));
```

#### 2. 파일 형식 확인
- **권장**: MP3 (가장 널리 지원됨)
- **대체**: WAV, OGG, M4A

#### 3. 브라우저 자동 재생 정책
- Chrome, Firefox 등은 사용자 인터랙션 없이는 사운드 재생 차단
- **해결**: 페이지를 한 번 클릭한 후에는 자동 재생 가능

#### 4. 볼륨 확인
```javascript
// 볼륨을 높여서 테스트
const audio = new Audio('/sounds/order-filled.mp3');
audio.volume = 1.0; // 최대 볼륨
audio.play();
```

---

## 🎨 추천 사운드 특성

### 주문 체결 (order-filled.mp3)
- **길이**: 0.5 ~ 2초
- **음색**: 밝고 긍정적인 소리
- **예시**: 동전 떨어지는 소리, "띵!" 소리, 성공 효과음

### 주문 취소 (order-cancelled.mp3)
- **길이**: 0.3 ~ 1초
- **음색**: 중립적이거나 부드러운 소리
- **예시**: "톡" 소리, 클릭음, 부드러운 알림음

---

## 🔧 사운드 설정 변경

### 볼륨 조절

`lico/client/src/pages/TradingPage.tsx`에서:

```typescript
// 주문 체결
soundPlayer.play('order-filled', 0.6); // 60% 볼륨

// 주문 취소
soundPlayer.play('order-cancelled', 0.5); // 50% 볼륨
```

### 사운드 켜기/끄기

```typescript
// 로컬 스토리지에 저장됨
soundPlayer.setEnabled(false); // 사운드 끄기
soundPlayer.setEnabled(true);  // 사운드 켜기
```

---

## 📦 프로덕션 배포 시

```bash
# 사운드 파일이 빌드에 포함되는지 확인
cd lico/client
npm run build

# dist/sounds/ 폴더 확인
ls dist/sounds/
```

---

**최종 수정:** 2025-11-27
**커밋:** 84f781c "feat: 주문 체결/취소 시 팝업 알림 및 사운드 추가"
