// 사운드 재생 유틸리티

class SoundPlayer {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;

  constructor() {
    // 로컬 스토리지에서 사운드 설정 불러오기
    const savedSetting = localStorage.getItem('sound_enabled');
    this.enabled = savedSetting !== 'false';
  }

  // 사운드 미리 로드
  preload(name: string, url: string) {
    if (!this.sounds.has(name)) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.sounds.set(name, audio);
    }
  }

  // 사운드 재생
  play(name: string, volume: number = 0.5) {
    if (!this.enabled) return;

    const audio = this.sounds.get(name);
    if (audio) {
      // 이미 재생 중이면 처음부터 다시 재생
      audio.currentTime = 0;
      audio.volume = Math.min(1, Math.max(0, volume));

      audio.play().catch(error => {
        console.warn('사운드 재생 실패:', error);
        // 자동 재생이 차단된 경우 사용자 인터랙션 후 재시도
      });
    } else {
      console.warn(`사운드 '${name}'를 찾을 수 없습니다`);
    }
  }

  // 사운드 즉시 재생 (URL로)
  playDirect(url: string, volume: number = 0.5) {
    if (!this.enabled) return;

    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play().catch(error => {
      console.warn('사운드 재생 실패:', error);
    });
  }

  // 사운드 켜기/끄기
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sound_enabled', this.enabled.toString());
    return this.enabled;
  }

  // 사운드 설정 확인
  isEnabled() {
    return this.enabled;
  }

  // 사운드 설정
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('sound_enabled', enabled.toString());
  }
}

// 싱글톤 인스턴스
const soundPlayer = new SoundPlayer();

// 기본 사운드 미리 로드 (파일이 있는 경우)
// 사용자는 public/sounds 폴더에 다음 파일들을 추가해야 합니다:
// - order-filled.mp3 (주문 체결 사운드)
// - order-cancelled.mp3 (주문 취소 사운드)
soundPlayer.preload('order-filled', '/sounds/order-filled.mp3');
soundPlayer.preload('order-cancelled', '/sounds/order-cancelled.mp3');

export default soundPlayer;
