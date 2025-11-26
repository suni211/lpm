"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.isAuthenticated = void 0;
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};
exports.isAuthenticated = isAuthenticated;
const isAdmin = async (req, res, next) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // users 테이블의 is_admin 컬럼 체크
    if (req.user.is_admin === true || req.user.is_admin === 1) {
        return next();
    }
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
};
exports.isAdmin = isAdmin;
//# sourceMappingURL=auth.js.map