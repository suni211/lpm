"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: '인증이 필요합니다' });
    }
    if (!req.user.is_admin) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=adminAuth.js.map