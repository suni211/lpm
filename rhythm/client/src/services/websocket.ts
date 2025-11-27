import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private userId: number | null = null;

  connect(userId: number) {
    this.userId = userId;
    this.socket = io('http://localhost:5003', {
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
