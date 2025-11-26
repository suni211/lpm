"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
require("./middleware/passport"); // Initialize passport strategies
const passport_1 = __importDefault(require("passport"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = __importDefault(require("./database/db"));
const auth_1 = __importDefault(require("./routes/auth"));
const team_1 = __importDefault(require("./routes/team"));
const gacha_1 = __importDefault(require("./routes/gacha"));
const roster_1 = __importDefault(require("./routes/roster"));
const match_1 = __importDefault(require("./routes/match"));
const admin_1 = __importDefault(require("./routes/admin"));
const posting_1 = __importDefault(require("./routes/posting"));
const achievements_1 = __importDefault(require("./routes/achievements"));
const sponsors_1 = __importDefault(require("./routes/sponsors"));
const fandom_1 = __importDefault(require("./routes/fandom"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [
            process.env.CLIENT_URL || 'http://localhost:5173',
            'http://berrple.com',
            'https://berrple.com',
        ],
        credentials: true,
    },
});
exports.io = io;
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://berrple.com',
        'https://berrple.com',
    ],
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Session configuration
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTP에서도 작동하도록 false로 설정 (HTTPS 사용 시 true로 변경)
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days (로그인 유지)
        sameSite: 'lax',
    },
}));
// Passport initialization
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Static files (uploaded images)
app.use('/uploads', express_1.default.static('uploads'));
// Routes
app.get('/', (req, res) => {
    res.json({
        message: '🎮 LPM - LoL Pro Manager API Server',
        version: '1.0.0',
        status: 'running',
    });
});
// Health check
app.get('/health', async (req, res) => {
    try {
        await db_1.default.query('SELECT 1');
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
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
    socket.on('subscribe-match', (matchId) => {
        socket.join(`match-${matchId}`);
        console.log(`⚔️ Client ${socket.id} subscribed to match ${matchId}`);
    });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/team', team_1.default);
app.use('/api/gacha', gacha_1.default);
app.use('/api/roster', roster_1.default);
app.use('/api/match', match_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/posting', posting_1.default);
app.use('/api/achievements', achievements_1.default);
app.use('/api/sponsors', sponsors_1.default);
app.use('/api/fandom', fandom_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
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
process.on('SIGTERM', async () => {
    console.log('⚠️  SIGTERM signal received: closing HTTP server');
    httpServer.close(async () => {
        console.log('✅ HTTP server closed');
        await db_1.default.end();
        console.log('✅ Database pool closed');
        process.exit(0);
    });
});
//# sourceMappingURL=index.js.map