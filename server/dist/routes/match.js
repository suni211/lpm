"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const matchService_1 = require("../services/matchService");
const db_1 = require("../database/db");
const router = express_1.default.Router();
// 랭크 경기 매칭 (AI 상대)
router.post('/ranked/start', auth_1.isAuthenticated, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // 사용자 팀 조회
        const teamResult = await (0, db_1.query)('SELECT * FROM teams WHERE user_id = ?', [req.user.id]);
        if (teamResult.length === 0) {
            return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
        }
        const userTeam = teamResult[0];
        // 로스터 완성 여부 확인
        const rosterResult = await (0, db_1.query)('SELECT * FROM rosters WHERE team_id = ?', [userTeam.id]);
        const roster = rosterResult[0];
        if (!roster.top_player_id ||
            !roster.jungle_player_id ||
            !roster.mid_player_id ||
            !roster.adc_player_id ||
            !roster.support_player_id) {
            return res.status(400).json({ error: '로스터를 완성해주세요 (5명 모두 배치)' });
        }
        // AI 상대팀 찾기 (비슷한 티어의 다른 유저 팀)
        const opponentResult = await (0, db_1.query)(`SELECT t.* FROM teams t
       JOIN rosters r ON t.id = r.team_id
       WHERE t.id != ?
       AND t.current_tier = ?
       AND r.top_player_id IS NOT NULL
       AND r.jungle_player_id IS NOT NULL
       AND r.mid_player_id IS NOT NULL
       AND r.adc_player_id IS NOT NULL
       AND r.support_player_id IS NOT NULL
       ORDER BY RAND()
       LIMIT 1`, [userTeam.id, userTeam.current_tier]);
        let opponentTeam;
        if (opponentResult.length > 0) {
            opponentTeam = opponentResult[0];
        }
        else {
            // 같은 티어에 상대가 없으면 아무 팀이나
            const anyOpponentResult = await (0, db_1.query)(`SELECT t.* FROM teams t
         JOIN rosters r ON t.id = r.team_id
         WHERE t.id != ?
         AND r.top_player_id IS NOT NULL
         AND r.jungle_player_id IS NOT NULL
         AND r.mid_player_id IS NOT NULL
         AND r.adc_player_id IS NOT NULL
         AND r.support_player_id IS NOT NULL
         ORDER BY RAND()
         LIMIT 1`, [userTeam.id]);
            if (anyOpponentResult.length === 0) {
                return res.status(400).json({ error: '매칭할 상대를 찾을 수 없습니다' });
            }
            opponentTeam = anyOpponentResult[0];
        }
        // 경기 시뮬레이션
        const matchResult = await (0, matchService_1.simulateMatch)(userTeam.id, opponentTeam.id);
        // 결과 반환
        res.json({
            match: matchResult,
            userTeam,
            opponentTeam,
            userWon: matchResult.winner_id === userTeam.id,
        });
    }
    catch (error) {
        console.error('경기 시작 오류:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : '경기 시작에 실패했습니다',
        });
    }
});
// 경기 기록 조회
router.get('/history', auth_1.isAuthenticated, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const teamResult = await (0, db_1.query)('SELECT id FROM teams WHERE user_id = ?', [req.user.id]);
        if (teamResult.length === 0) {
            return res.status(404).json({ error: '팀을 찾을 수 없습니다' });
        }
        const teamId = teamResult[0].id;
        // 최근 경기 기록
        const matchesResult = await (0, db_1.query)(`SELECT m.*,
              t1.team_name as team1_name,
              t2.team_name as team2_name
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.team1_id = ? OR m.team2_id = ?
       ORDER BY m.played_at DESC
       LIMIT 20`, [teamId, teamId]);
        res.json({ matches: matchesResult });
    }
    catch (error) {
        console.error('경기 기록 조회 오류:', error);
        res.status(500).json({ error: '경기 기록 조회에 실패했습니다' });
    }
});
// 특정 경기 상세 조회
router.get('/:matchId', auth_1.isAuthenticated, async (req, res) => {
    try {
        const { matchId } = req.params;
        const matchResult = await (0, db_1.query)(`SELECT m.*,
              t1.team_name as team1_name, t1.team_logo as team1_logo,
              t2.team_name as team2_name, t2.team_logo as team2_logo
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.id = ?`, [matchId]);
        if (matchResult.length === 0) {
            return res.status(404).json({ error: '경기를 찾을 수 없습니다' });
        }
        res.json({ match: matchResult[0] });
    }
    catch (error) {
        console.error('경기 조회 오류:', error);
        res.status(500).json({ error: '경기 조회에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=match.js.map