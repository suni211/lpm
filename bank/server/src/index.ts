import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './database/db';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://bank.berrple.com',
      'https://bank.berrple.com',
    ],
    credentials: true,
  },
});
const PORT = process.env.PORT || 5001;

// WebSocket 연결 관리
const userSockets = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', (userId: string) => {
    userSockets.set(userId, socket.id);
    socket.join(`user:${userId}`);
    console.log(`User ${userId} authenticated`);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// 알림 전송 함수 (다른 모듈에서 사용)
export const sendNotification = (userId: string, notification: any) => {
  io.to(`user:${userId}`).emit('notification', notification);
};

export { io };

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://bank.berrple.com',
    'https://bank.berrple.com',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'minecraft-bank-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // HTTPS 사용 시 true로 변경
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
    },
  })
);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🏦 Minecraft Bank API Server',
    version: '1.0.0',
    status: 'running',
  });
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Routes
import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import depositsRoutes from './routes/deposits';
import withdrawalsRoutes from './routes/withdrawals';
import transfersRoutes from './routes/transfers';
import transactionsRoutes from './routes/transactions';

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // 클라이언트 호환성을 위해 /auth도 추가
app.use('/api/accounts', accountsRoutes);
app.use('/api/deposits', depositsRoutes);
app.use('/api/withdrawals', withdrawalsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/transactions', transactionsRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Routes
import notificationsRoutes from './routes/notifications';
import autoTransfersRoutes from './routes/autoTransfers';
import scheduledTransfersRoutes from './routes/scheduledTransfers';
import budgetsRoutes from './routes/budgets';
import savingsGoalsRoutes from './routes/savingsGoals';
import licoRoutes from './routes/lico';
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';

app.use('/api/notifications', notificationsRoutes);
app.use('/api/auto-transfers', autoTransfersRoutes);
app.use('/api/scheduled-transfers', scheduledTransfersRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/savings-goals', savingsGoalsRoutes);
app.use('/api/lico', licoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// Auto Transfer Scheduler
import autoTransferScheduler from './services/autoTransferScheduler';

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🏦 Minecraft Bank Server Running    ║
║  📡 Port: ${PORT}                        ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}      ║
║  🗄️  Database: MariaDB                ║
║  🔌 WebSocket: Active                 ║
╚═══════════════════════════════════════╝
  `);

  // 자동 이체 스케줄러 시작
  autoTransferScheduler.start();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing server');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});
