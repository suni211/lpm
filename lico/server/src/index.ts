import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import { createServer } from 'http';
import pool from './database/db';
import blockchainService from './services/blockchainService';
import initializeWebSocket from './websocket';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5002;

// Middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://lico.berrple.com',
      'https://lico.berrple.com',
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'lico-exchange-secret',
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
    message: '🪙 Lico Cryptocurrency Exchange API Server',
    version: '1.0.0',
    status: 'running',
    blockchain: 'active',
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

// API Routes
import authRoutes from './routes/auth';
import questionnaireRoutes from './routes/questionnaire';
import walletsRoutes from './routes/wallets';
import coinsRoutes from './routes/coins';
import tradingRoutes from './routes/trading';
import blockchainRoutes from './routes/blockchain';

app.use('/api/auth', authRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/wallets', walletsRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize blockchain
async function initializeBlockchain() {
  try {
    await blockchainService.createGenesisBlock();
    console.log('✅ Blockchain initialized');
  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error);
  }
}

// Initialize WebSocket
const websocket = initializeWebSocket(httpServer);

// Export websocket for use in other modules
export { websocket };

// Start server
httpServer.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🪙 Lico Exchange Server Running     ║
║  📡 Port: ${PORT}                        ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}      ║
║  🗄️  Database: MariaDB                ║
║  ⛓️  Blockchain: Active               ║
║  🔌 WebSocket: Active                 ║
╚═══════════════════════════════════════╝
  `);

  // Initialize blockchain on startup
  await initializeBlockchain();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM signal received: closing server');
  await pool.end();
  console.log('✅ Database pool closed');
  process.exit(0);
});
