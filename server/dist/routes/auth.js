"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("../middleware/passport"));
const db_1 = require("../database/db");
const router = express_1.default.Router();
// Google OAuth login
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
}));
// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
    passport_1.default.authenticate('google', (err, user, info) => {
        if (err) {
            // IP 중복 에러 처리
            if (err.message && err.message.includes('DUPLICATE_IP_ERROR')) {
                return res.redirect(`${process.env.CLIENT_URL}/?error=duplicate_ip`);
            }
            // 기타 인증 에러
            return res.redirect(`${process.env.CLIENT_URL}/?error=auth_failed`);
        }
        if (!user) {
            return res.redirect(`${process.env.CLIENT_URL}/?error=auth_failed`);
        }
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                return res.redirect(`${process.env.CLIENT_URL}/?error=login_failed`);
            }
            // Successful authentication - 홈으로 리다이렉트 (팀 체크는 프론트에서)
            return res.redirect(`${process.env.CLIENT_URL}/`);
        });
    })(req, res, next);
});
// Get current user
router.get('/me', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    try {
        // Get user info
        const userResult = await (0, db_1.query)('SELECT * FROM users WHERE id = ?', [req.user.id]);
        // Get team info
        const teamResult = await (0, db_1.query)('SELECT * FROM teams WHERE user_id = ?', [req.user.id]);
        res.json({
            user: userResult[0],
            team: teamResult[0] || null,
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// Logout
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: 'Logged out successfully' });
    });
});
// Check authentication status
router.get('/status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.user || null,
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map