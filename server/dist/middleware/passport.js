"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const db_1 = require("../database/db");
const db_2 = __importDefault(require("../database/db"));
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const result = await (0, db_1.query)('SELECT * FROM users WHERE id = ?', [id]);
        done(null, result[0] || null);
    }
    catch (error) {
        done(error, null);
    }
});
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    passReqToCallback: true, // req 객체를 콜백에 전달
}, async (req, accessToken, refreshToken, profile, done) => {
    try {
        // IP 주소 추출
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
            req.headers['x-real-ip'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            '';
        // Check if user exists
        const existingUser = await (0, db_1.query)('SELECT * FROM users WHERE google_id = ?', [profile.id]);
        if (existingUser.length > 0) {
            // Update last login
            await (0, db_1.query)('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [existingUser[0].id]);
            return done(null, existingUser[0]);
        }
        // ⛔ IP 기반 계정 생성 제한 - 같은 IP로 이미 계정이 있는지 확인
        const existingIpUser = await (0, db_1.query)('SELECT u.* FROM users u INNER JOIN user_ip_tracking ipt ON u.id = ipt.user_id WHERE ipt.ip_address = ?', [ipAddress]);
        if (existingIpUser.length > 0) {
            // 같은 IP로 이미 계정이 존재함
            return done(new Error('DUPLICATE_IP_ERROR: 이 IP 주소로 이미 계정이 생성되었습니다. 같은 IP로는 여러 계정을 만들 수 없습니다.'), undefined);
        }
        // Create new user
        await db_2.default.query(`INSERT INTO users (google_id, email, display_name, profile_picture)
           VALUES (?, ?, ?, ?)`, [
            profile.id,
            profile.emails?.[0]?.value || '',
            profile.displayName || '',
            profile.photos?.[0]?.value || '',
        ]);
        // Get the newly created user (UUID는 자동 생성되므로 google_id로 조회)
        const newUser = await (0, db_1.query)('SELECT * FROM users WHERE google_id = ?', [profile.id]);
        const newUserId = newUser[0].id;
        // IP 주소 기록
        await (0, db_1.query)(`INSERT INTO user_ip_tracking (user_id, ip_address) VALUES (?, ?)`, [newUserId, ipAddress]);
        // 팀은 프론트엔드에서 별도 생성하도록 변경
        done(null, newUser[0]);
    }
    catch (error) {
        console.error('❌ Passport Google Strategy Error:', error);
        done(error, undefined);
    }
}));
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map