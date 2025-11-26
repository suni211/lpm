import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import pool from './database/db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

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

// TODO: Add routes
// app.use('/api/auth', authRoutes);
// app.use('/api/accounts', accountRoutes);
// app.use('/api/deposits', depositRoutes);
// app.use('/api/withdrawals', withdrawalRoutes);
// app.use('/api/transfers', transferRoutes);
// app.use('/api/transactions', transactionRoutes);
// app.use('/api/admin', adminRoutes);
// app.use('/api/stats', statsRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🏦 Minecraft Bank Server Running    ║
║  📡 Port: ${PORT}                        ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}      ║
║  🗄️  Database: MariaDB                ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing server');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});
