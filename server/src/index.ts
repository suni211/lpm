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

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
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

// Other routes (will be created later)
// import cardRoutes from './routes/cards';
// import matchRoutes from './routes/match';
// import postingRoutes from './routes/posting';
// import guildRoutes from './routes/guild';
// app.use('/api/cards', cardRoutes);
// app.use('/api/match', matchRoutes);
// app.use('/api/posting', postingRoutes);
// app.use('/api/guild', guildRoutes);

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
║  🗄️  Database: PostgreSQL              ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    pool.end(() => {
      console.log('✅ Database pool closed');
      process.exit(0);
    });
  });
});
