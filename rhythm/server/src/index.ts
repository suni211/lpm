import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import authRoutes from './routes/auth';
import songRoutes from './routes/songs';
import beatmapRoutes from './routes/beatmaps';
import gameRoutes from './routes/game';
import rankingRoutes from './routes/rankings';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3003',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'rhythm-game-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Rhythm Game Server is running' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🎵 Rhythm Game Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
});
