import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import './middleware/passport'; // Initialize passport strategies
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './database/db';
import authRoutes from './routes/auth';
import teamRoutes from './routes/team';
import gachaRoutes from './routes/gacha';
import rosterRoutes from './routes/roster';
import matchRoutes from './routes/match';
import adminRoutes from './routes/admin';
import postingRoutes from './routes/posting';
import achievementsRoutes from './routes/achievements';
import sponsorsRoutes from './routes/sponsors';
import fandomRoutes from './routes/fandom';
import traitsRoutes from './routes/traits';
import rankedRoutes from './routes/ranked';
import soloRankRoutes from './routes/soloRank';
import auctionRoutes from './routes/auction';
import trainingRoutes from './routes/training';
import facilityRoutes from './routes/facility';
import facilitiesRoutes from './routes/facilities';
import sponsorRoutes from './routes/sponsors';
import fusionRoutes from './routes/fusion';
import leagueRoutes from './routes/league';
import dashboardRoutes from './routes/dashboard';
import { startSoloRankCron } from './services/soloRankCron';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://berrple.com',
      'https://berrple.com',
    ],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://berrple.com',
    'https://berrple.com',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // HTTP에서도 작동하도록 false로 설정 (HTTPS 사용 시 true로 변경)
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days (로그인 유지)
      sameSite: 'lax',
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Static files (uploaded images)
app.use('/uploads', express.static('uploads'));

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🎮 LPM - LoL Pro Manager API Server',
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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  // Real-time ranking updates
  socket.on('subscribe-rankings', () => {
    socket.join('rankings');
    console.log(`📊 Client ${socket.id} subscribed to rankings`);
  });

  // Real-time match updates
  socket.on('subscribe-match', (matchId: string) => {
    socket.join(`match-${matchId}`);
    console.log(`⚔️ Client ${socket.id} subscribed to match ${matchId}`);
  });
});

// Export io for use in other modules
export { io };

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/gacha', gachaRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posting', postingRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/sponsors', sponsorsRoutes);
app.use('/api/fandom', fandomRoutes);
app.use('/api/traits', traitsRoutes);
app.use('/api/ranked', rankedRoutes);
app.use('/api/solo-rank', soloRankRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/facility', facilityRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/sponsor', sponsorRoutes);
app.use('/api/fusion', fusionRoutes);
app.use('/api/league', leagueRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🎮 LPM Server Running                ║
║  📡 Port: ${PORT}                        ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}      ║
║  🗄️  Database: MariaDB                 ║
╚═══════════════════════════════════════╝
  `);

  // 솔로랭크 크론 작업 시작
  startSoloRankCron();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  httpServer.close(async () => {
    console.log('✅ HTTP server closed');
    await pool.end();
    console.log('✅ Database pool closed');
    process.exit(0);
  });
});
