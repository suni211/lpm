"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAchievementProgress = updateAchievementProgress;
exports.checkAchievements = checkAchievements;
const express_1 = __importDefault(require("express"));
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 모든 업적 조회 (진행도 포함)
router.get('/', auth_1.isAuthenticated, async (req, res) => {
    try {
        const userId = req.user?.id;
        const teamResult = await (0, db_1.query)('SELECT id FROM teams WHERE user_id = ?', [userId]);
        const teamId = teamResult[0].id;
        // 모든 업적 조회
        const achievementsResult = await (0, db_1.query)(`
      SELECT
        a.*,
        ua.is_claimed,
        ua.claimed_at,
        ua.progress
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.team_id = ?
      ORDER BY a.category, a.id
    `, [teamId]);
        // 카테고리별로 그룹화
        const grouped = achievementsResult.reduce((acc, achievement) => {
            if (!acc[achievement.category]) {
                acc[achievement.category] = [];
            }
            acc[achievement.category].push({
                ...achievement,
                is_completed: achievement.progress >= achievement.requirement,
                is_claimed: achievement.is_claimed || false,
            });
            return acc;
        }, {});
        res.json({ achievements: grouped });
    }
    catch (error) {
        console.error('업적 조회 실패:', error);
        res.status(500).json({ error: '업적 조회에 실패했습니다' });
    }
});
// 업적 보상 수령
router.post('/claim/:achievementId', auth_1.isAuthenticated, async (req, res) => {
    const client = await (0, db_1.getConnection)();
    try {
        const userId = req.user?.id;
        const { achievementId } = req.params;
        await client.beginTransaction();
        // 팀 정보 조회
        const [teamResult] = await client.query('SELECT id FROM teams WHERE user_id = ?', [userId]);
        const teamId = teamResult[0].id;
        // 업적 정보 조회
        const [achievementResult] = await client.query('SELECT * FROM achievements WHERE id = ?', [achievementId]);
        if (achievementResult.length === 0) {
            await client.rollback();
            return res.status(404).json({ error: '업적을 찾을 수 없습니다' });
        }
        const achievement = achievementResult[0];
        // 사용자 업적 진행도 조회
        const [userAchievementResult] = await client.query('SELECT * FROM user_achievements WHERE team_id = ? AND achievement_id = ?', [teamId, achievementId]);
        if (userAchievementResult.length === 0) {
            await client.rollback();
            return res.status(400).json({ error: '업적이 완료되지 않았습니다' });
        }
        const userAchievement = userAchievementResult[0];
        // 이미 수령했는지 확인
        if (userAchievement.is_claimed) {
            await client.rollback();
            return res.status(400).json({ error: '이미 보상을 수령했습니다' });
        }
        // 완료 여부 확인
        if (userAchievement.progress < achievement.requirement) {
            await client.rollback();
            return res.status(400).json({ error: '업적이 완료되지 않았습니다' });
        }
        // 보상 지급
        await client.query('UPDATE teams SET balance = balance + ? WHERE id = ?', [achievement.reward_money, teamId]);
        // 명성도 지급
        if (achievement.reward_reputation) {
            await client.query('UPDATE teams SET reputation = reputation + ? WHERE id = ?', [achievement.reward_reputation, teamId]);
        }
        // 업적 수령 표시
        await client.query('UPDATE user_achievements SET is_claimed = true, claimed_at = NOW() WHERE team_id = ? AND achievement_id = ?', [teamId, achievementId]);
        await client.commit();
        res.json({
            message: '보상을 수령했습니다!',
            rewards: {
                money: achievement.reward_money,
                reputation: achievement.reward_reputation,
            },
        });
    }
    catch (error) {
        await client.rollback();
        console.error('보상 수령 실패:', error);
        res.status(500).json({ error: '보상 수령에 실패했습니다' });
    }
    finally {
        client.release();
    }
});
// 업적 진행도 업데이트 (내부 사용)
async function updateAchievementProgress(teamId, achievementId, progress) {
    const client = await (0, db_1.getConnection)();
    try {
        await client.beginTransaction();
        // 기존 진행도 확인
        const [existingResult] = await client.query('SELECT * FROM user_achievements WHERE team_id = ? AND achievement_id = ?', [teamId, achievementId]);
        if (existingResult.length === 0) {
            // 새로 생성
            await client.query('INSERT INTO user_achievements (team_id, achievement_id, progress) VALUES (?, ?, ?)', [teamId, achievementId, progress]);
        }
        else {
            // 진행도 업데이트 (최대값만)
            await client.query('UPDATE user_achievements SET progress = GREATEST(progress, ?) WHERE team_id = ? AND achievement_id = ?', [progress, teamId, achievementId]);
        }
        await client.commit();
    }
    catch (error) {
        await client.rollback();
        console.error('업적 진행도 업데이트 실패:', error);
    }
    finally {
        client.release();
    }
}
// 여러 업적 진행도 체크 (내부 사용)
async function checkAchievements(teamId, type, value) {
    try {
        // 해당 타입의 모든 업적 조회
        const achievementsResult = await (0, db_1.query)('SELECT * FROM achievements WHERE category = ?', [type]);
        // 각 업적의 진행도 업데이트
        for (const achievement of achievementsResult) {
            await updateAchievementProgress(teamId, achievement.id, value);
        }
    }
    catch (error) {
        console.error('업적 체크 실패:', error);
    }
}
// 통계 조회
router.get('/stats', auth_1.isAuthenticated, async (req, res) => {
    try {
        const userId = req.user?.id;
        const teamResult = await (0, db_1.query)('SELECT id FROM teams WHERE user_id = ?', [userId]);
        const teamId = teamResult[0].id;
        // 총 업적 수
        const totalResult = await (0, db_1.query)('SELECT COUNT(*) as total FROM achievements');
        const total = parseInt(totalResult[0].total);
        // 완료한 업적 수
        const completedResult = await (0, db_1.query)(`
      SELECT COUNT(*) as completed
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.team_id = ? AND ua.progress >= a.requirement
    `, [teamId]);
        const completed = parseInt(completedResult[0].completed);
        // 수령한 보상 합계
        const rewardsResult = await (0, db_1.query)(`
      SELECT
        SUM(a.reward_money) as total_money,
        SUM(a.reward_reputation) as total_reputation
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.team_id = ? AND ua.is_claimed = true
    `, [teamId]);
        res.json({
            total,
            completed,
            claimed: completedResult[0].completed,
            percentage: Math.round((completed / total) * 100),
            rewards: {
                money: parseInt(rewardsResult[0].total_money) || 0,
                reputation: parseInt(rewardsResult[0].total_reputation) || 0,
            },
        });
    }
    catch (error) {
        console.error('업적 통계 조회 실패:', error);
        res.status(500).json({ error: '통계 조회에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=achievements.js.map