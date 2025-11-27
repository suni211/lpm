import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { query } from '../utils/database';

let io: SocketIOServer;

// 현재 연결된 사용자들
const connectedUsers = new Map<string, number>(); // socketId -> userId
const userSockets = new Map<number, string>(); // userId -> socketId

export const initializeWebSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 사용자 인증
    socket.on('authenticate', async (data: { userId: number }) => {
      const { userId } = data;
      connectedUsers.set(socket.id, userId);
      userSockets.set(userId, socket.id);

      socket.emit('authenticated', { userId });
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    });

    // 매칭 큐 참가
    socket.on('join_queue', async (data: { userId: number; tier: string; rating: number }) => {
      try {
        const { userId, tier, rating } = data;

        // 큐에 추가
        await query(
          'INSERT INTO match_queue (user_id, tier, rating) VALUES (?, ?, ?)',
          [userId, tier, rating]
        );

        socket.emit('queue_joined', { message: '매칭 큐에 참가했습니다.' });

        // 매칭 시도
        attemptMatching(tier, rating);
      } catch (error) {
        console.error('Join queue error:', error);
        socket.emit('error', { message: '큐 참가 중 오류가 발생했습니다.' });
      }
    });

    // 매칭 큐 취소
    socket.on('leave_queue', async (data: { userId: number }) => {
      try {
        const { userId } = data;

        await query(
          'UPDATE match_queue SET status = ? WHERE user_id = ? AND status = ?',
          ['cancelled', userId, 'waiting']
        );

        socket.emit('queue_left', { message: '매칭 큐에서 나갔습니다.' });
      } catch (error) {
        console.error('Leave queue error:', error);
        socket.emit('error', { message: '큐 나가기 중 오류가 발생했습니다.' });
      }
    });

    // 이모티콘 전송
    socket.on('send_emoticon', (data: { matchId: number; emoticonId: number; userId: number }) => {
      const { matchId, emoticonId, userId } = data;

      // 같은 매치의 다른 플레이어에게 전송
      io.emit(`match_${matchId}_emoticon`, {
        userId,
        emoticonId,
        timestamp: Date.now()
      });
    });

    // 게임 플레이 데이터 전송
    socket.on('game_action', (data: { matchId: number; action: any }) => {
      const { matchId, action } = data;

      // 같은 매치의 다른 플레이어에게 전송
      socket.to(`match_${matchId}`).emit('opponent_action', action);
    });

    // 매치 룸 참가
    socket.on('join_match', (data: { matchId: number }) => {
      const { matchId } = data;
      socket.join(`match_${matchId}`);
      console.log(`Socket ${socket.id} joined match ${matchId}`);
    });

    // 매치 룸 나가기
    socket.on('leave_match', (data: { matchId: number }) => {
      const { matchId } = data;
      socket.leave(`match_${matchId}`);
      console.log(`Socket ${socket.id} left match ${matchId}`);
    });

    // 연결 해제
    socket.on('disconnect', () => {
      const userId = connectedUsers.get(socket.id);
      if (userId) {
        connectedUsers.delete(socket.id);
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  });

  return io;
};

// 매칭 시도 함수
const attemptMatching = async (tier: string, rating: number) => {
  try {
    // 같은 티어에서 레이팅이 비슷한 플레이어 찾기 (±200)
    const waitingPlayers = await query(
      `SELECT * FROM match_queue
       WHERE tier = ?
       AND rating BETWEEN ? AND ?
       AND status = 'waiting'
       ORDER BY joined_at ASC
       LIMIT 2`,
      [tier, rating - 200, rating + 200]
    ) as any[];

    if (waitingPlayers.length >= 2) {
      // 매치 생성
      const matchResult = await query(
        'INSERT INTO matches (match_type, status, max_rounds) VALUES (?, ?, ?)',
        ['RANK', 'pending', 3]
      ) as any;

      const matchId = matchResult.insertId;

      // 매치 참가자 추가
      for (const player of waitingPlayers) {
        await query(
          'INSERT INTO match_participants (match_id, user_id) VALUES (?, ?)',
          [matchId, player.user_id]
        );

        await query(
          'UPDATE match_queue SET status = ? WHERE id = ?',
          ['matched', player.id]
        );

        // 플레이어에게 매치 알림
        const socketId = userSockets.get(player.user_id);
        if (socketId) {
          io.to(socketId).emit('match_found', {
            matchId,
            opponentId: waitingPlayers.find((p: any) => p.user_id !== player.user_id)?.user_id
          });
        }
      }

      console.log(`Match ${matchId} created for players:`, waitingPlayers.map((p: any) => p.user_id));
    }
  } catch (error) {
    console.error('Matching error:', error);
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

export const sendToUser = (userId: number, event: string, data: any) => {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

export const sendToMatch = (matchId: number, event: string, data: any) => {
  if (io) {
    io.to(`match_${matchId}`).emit(event, data);
  }
};
