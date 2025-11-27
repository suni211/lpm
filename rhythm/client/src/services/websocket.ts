import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private userId: number | null = null;

  connect(userId: number) {
    this.userId = userId;
    // 프로덕션에서는 상대 경로 사용, 개발 환경에서는 환경 변수 사용
    const env = import.meta.env as { PROD?: boolean; VITE_SOCKET_URL?: string };
    const socketUrl = env.PROD
      ? window.location.origin 
      : (env.VITE_SOCKET_URL || 'http://localhost:5003');
    this.socket = io(socketUrl, {
      withCredentials: true
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.socket?.emit('authenticate', { userId });
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinQueue(tier: string, rating: number) {
    this.socket?.emit('join_queue', { userId: this.userId, tier, rating });
  }

  leaveQueue() {
    this.socket?.emit('leave_queue', { userId: this.userId });
  }

  joinMatch(matchId: number) {
    this.socket?.emit('join_match', { matchId });
  }

  leaveMatch(matchId: number) {
    this.socket?.emit('leave_match', { matchId });
  }

  sendEmoticon(matchId: number, emoticonId: number) {
    this.socket?.emit('send_emoticon', { matchId, emoticonId, userId: this.userId });
  }

  sendGameAction(matchId: number, action: any) {
    this.socket?.emit('game_action', { matchId, action });
  }

  onMatchFound(callback: (data: any) => void) {
    this.socket?.on('match_found', callback);
  }

  onEmoticon(callback: (data: any) => void) {
    this.socket?.on('match_emoticon', callback);
  }

  getSocket() {
    return this.socket;
  }
}

export default new WebSocketService();
