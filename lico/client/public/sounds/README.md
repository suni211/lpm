# 사운드 파일 안내

이 폴더에 다음 사운드 파일을 추가해주세요:

## 필요한 파일

1. **order-filled.mp3** - 주문 체결 사운드
   - 주문이 체결되었을 때 재생됩니다
   - 밝고 긍정적인 사운드 권장 (예: 동전 떨어지는 소리, 성공음)

2. **order-cancelled.mp3** - 주문 취소 사운드
   - 주문이 취소되었을 때 재생됩니다
   - 중립적이거나 부드러운 사운드 권장 (예: 클릭음, 알림음)

## 파일 형식

- **권장 형식**: MP3 (용량이 작고 브라우저 호환성 좋음)
- **대체 형식**: WAV, OGG (더 고품질이지만 용량 큼)
- **MP4**: MP4도 가능하지만 오디오만 추출된 파일 권장

## 파일 준비 방법

### 옵션 1: 무료 사운드 다운로드
- [Freesound](https://freesound.org/)
- [Mixkit](https://mixkit.co/free-sound-effects/)
- [Zapsplat](https://www.zapsplat.com/)

### 옵션 2: 직접 녹음/생성
- 온라인 사운드 생성기 사용
- 스마트폰으로 녹음 후 변환

### 옵션 3: 임시 파일 사용
임시로 테스트하고 싶다면, 아래 명령어로 빈 오디오 파일 생성:

```bash
# Windows (PowerShell)
New-Item -Path "order-filled.mp3" -ItemType File
New-Item -Path "order-cancelled.mp3" -ItemType File

# Mac/Linux
touch order-filled.mp3
touch order-cancelled.mp3
```

## 파일 위치

```
lico/client/public/sounds/
├── order-filled.mp3      ← 주문 체결 사운드
├── order-cancelled.mp3   ← 주문 취소 사운드
└── README.md             ← 이 파일
```

## 사운드 설정

사용자는 브라우저에서 사운드를 켜고 끌 수 있습니다.
- 사운드 설정은 로컬 스토리지에 저장됩니다
- 기본값: 켜짐 (enabled)

## 문제 해결

### 사운드가 재생되지 않을 때

1. **파일이 있는지 확인**
   ```
   lico/client/public/sounds/order-filled.mp3
   lico/client/public/sounds/order-cancelled.mp3
   ```

2. **브라우저 콘솔 확인**
   - F12 → Console 탭
   - "사운드 재생 실패" 에러 확인

3. **자동 재생 차단**
   - 일부 브라우저는 자동 재생을 차단합니다
   - 사용자가 페이지를 클릭한 후에는 정상 작동합니다

4. **파일 형식 확인**
   - MP3가 가장 안전합니다
   - WAV, OGG도 지원됩니다

## 볼륨 조절

코드에서 볼륨 조절 가능:
- 주문 체결: 60% (0.6)
- 주문 취소: 50% (0.5)

필요시 `TradingPage.tsx`에서 수정 가능합니다.
