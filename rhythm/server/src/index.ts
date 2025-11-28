import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

// Routes
import authRoutes from './routes/auth';
import songRoutes from './routes/songs';
import beatmapRoutes from './routes/beatmaps';
import gameRoutes from './routes/game';
import rankingRoutes from './routes/rankings';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import pvpRoutes from './routes/pvp';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://rhythm.berrple.com', 'https://rhythm.berrple.com', 'http://localhost:5173', 'http://localhost:3003'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // 허용할 origin 목록
    const allowedOrigins = [
      'http://rhythm.berrple.com',
      'https://rhythm.berrple.com',
      'http://localhost:5173',
      'http://localhost:3003'
    ];

    // Origin이 없거나 (같은 도메인) 허용 목록에 있으면 OK
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'rhythm-game-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // HTTP에서도 작동하도록 임시 변경 (HTTPS 적용 후 true로)
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Static files (audio, images, videos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/beatmaps', beatmapRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pvp', pvpRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rhythm Game Server is running' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// WebSocket 연결 처리
io.on('connection', (socket) => {
  console.log('🔌 WebSocket client connected:', socket.id);

  // 매치 룸 참가
  socket.on('join-match', (matchId: string) => {
    socket.join(`match-${matchId}`);
    console.log(`✅ Socket ${socket.id} joined match-${matchId}`);
  });

  // 실시간 게임 진행 상황
  socket.on('game-progress', (data: { matchId: string; score: number; combo: number; judgments: any }) => {
    socket.to(`match-${data.matchId}`).emit('opponent-progress', data);
  });

  // 라운드 완료
  socket.on('round-complete', (data: { matchId: string; score: number; judgments: any; maxCombo: number }) => {
    socket.to(`match-${data.matchId}`).emit('opponent-round-complete', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket client disconnected:', socket.id);
  });
});

// HTTP 서버 시작 (app.listen 대신 server.listen)
server.listen(PORT, () => {
  console.log(`🎵 Rhythm Game Server running on port ${PORT}`);
  console.log(`🔌 WebSocket Server ready`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});
