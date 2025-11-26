"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../database/db");
const router = express_1.default.Router();
// 팀 생성
router.post('/create', async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const { teamName, teamTag, teamLogo, color1, color2, color3 } = req.body;
    // 팀 이름 검증
    if (!teamName || teamName.trim().length === 0) {
        return res.status(400).json({ error: '팀 이름을 입력해주세요' });
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(teamName)) {
        return res.status(400).json({ error: '팀 이름은 영어와 숫자만 사용 가능합니다' });
    }
    if (teamName.length > 20) {
        return res.status(400).json({ error: '팀 이름은 20자 이내여야 합니다' });
    }
    // 팀 태그 검증
    if (!teamTag || teamTag.trim().length === 0) {
        return res.status(400).json({ error: '팀 태그를 입력해주세요' });
    }
    if (!/^[a-zA-Z0-9]+$/.test(teamTag)) {
        return res.status(400).json({ error: '팀 태그는 영어와 숫자만 사용 가능합니다' });
    }
    if (teamTag.length < 2 || teamTag.length > 4) {
        return res.status(400).json({ error: '팀 태그는 2~4글자여야 합니다' });
    }
    try {
        const userId = req.user.id;
        // 이미 팀이 있는지 확인
        const existingTeam = await (0, db_1.query)('SELECT * FROM teams WHERE user_id = ?', [userId]);
        if (existingTeam.length > 0) {
            return res.status(400).json({ error: '이미 팀이 존재합니다' });
        }
        // 팀 생성 (team_logo는 이모지, color1/2/3 저장)
        await (0, db_1.query)(`INSERT INTO teams (user_id, team_name, team_logo, slogan)
       VALUES (?, ?, ?, ?)`, [userId, teamName.trim(), teamLogo || '🎮', `${teamTag}|${color1}|${color2}|${color3}`]);
        // 생성된 팀 조회
        const newTeam = await (0, db_1.query)('SELECT * FROM teams WHERE user_id = ?', [userId]);
        const teamId = newTeam[0].id;
        // 기본 시설 생성
        await (0, db_1.query)('INSERT INTO facilities (team_id) VALUES (?)', [teamId]);
        // 기본 로스터 생성
        await (0, db_1.query)('INSERT INTO rosters (team_id) VALUES (?)', [teamId]);
        // 팀 기록 생성
        await (0, db_1.query)('INSERT INTO team_records (team_id) VALUES (?)', [teamId]);
        res.json({
            message: '팀이 생성되었습니다',
            team: newTeam[0],
        });
    }
    catch (error) {
        console.error('팀 생성 에러:', error);
        res.status(500).json({ error: '팀 생성에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=team.js.map