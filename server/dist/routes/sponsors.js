"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payBonusIfConditionMet = payBonusIfConditionMet;
const express_1 = __importDefault(require("express"));
const db_1 = require("../database/db");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// 사용 가능한 스폰서 목록 조회
router.get('/available', auth_1.isAuthenticated, async (req, res) => {
    try {
        const userId = req.user?.id;
        // 팀 정보 조회
        const teamResult = await (0, db_1.query)('SELECT id, current_tier, reputation FROM teams WHERE user_id = ?', [userId]);
        const team = teamResult[0];
        // 현재 계약 중인 스폰서 확인
        const currentSponsorResult = await (0, db_1.query)(`
      SELECT sponsor_id
      FROM team_sponsors
      WHERE team_id = ? AND contract_end_date > NOW()
    `, [team.id]);
        const currentSponsorIds = currentSponsorResult.map(row => row.sponsor_id);
        // 팀 티어와 명성에 맞는 스폰서 조회
        const sponsorsResult = await (0, db_1.query)(`
      SELECT *
      FROM sponsors
      WHERE required_tier <= ?
        AND required_reputation <= ?
      ORDER BY tier_level DESC, monthly_payment DESC
    `, [getTierLevel(team.current_tier), team.reputation]);
        const sponsors = sponsorsResult.map(sponsor => ({
            ...sponsor,
            is_contracted: currentSponsorIds.includes(sponsor.id),
        }));
        res.json({ sponsors });
    }
    catch (error) {
        console.error('스폰서 목록 조회 실패:', error);
        res.status(500).json({ error: '스폰서 목록 조회에 실패했습니다' });
    }
});
// 현재 계약 중인 스폰서 조회
router.get('/current', auth_1.isAuthenticated, async (req, res) => {
    try {
        const userId = req.user?.id;
        const teamResult = await (0, db_1.query)('SELECT id FROM teams WHERE user_id = ?', [userId]);
        const teamId = teamResult[0].id;
        const result = await (0, db_1.query)(`
      SELECT
        ts.*,
        s.sponsor_name,
        s.sponsor_type,
        s.monthly_payment,
        s.bonus_condition,
        s.bonus_amount,
        s.logo_url
      FROM team_sponsors ts
      JOIN sponsors s ON ts.sponsor_id = s.id
      WHERE ts.team_id = ? AND ts.contract_end_date > NOW()
      ORDER BY ts.contract_start_date DESC
    `, [teamId]);
        res.json({ sponsors: result });
    }
    catch (error) {
        console.error('계약 스폰서 조회 실패:', error);
        res.status(500).json({ error: '스폰서 조회에 실패했습니다' });
    }
});
// 스폰서 계약
router.post('/contract/:sponsorId', auth_1.isAuthenticated, async (req, res) => {
    const client = await (0, db_1.getConnection)();
    try {
        const userId = req.user?.id;
        const { sponsorId } = req.params;
        const { durationMonths } = req.body; // 계약 기간 (개월)
        await client.beginTransaction();
        // 팀 정보 조회
        const [teamResult] = await client.query('SELECT id, current_tier, reputation FROM teams WHERE user_id = ?', [userId]);
        const team = teamResult[0];
        // 스폰서 정보 조회
        const [sponsorResult] = await client.query('SELECT * FROM sponsors WHERE id = ?', [sponsorId]);
        if (sponsorResult.length === 0) {
            await client.rollback();
            return res.status(404).json({ error: '스폰서를 찾을 수 없습니다' });
        }
        const sponsor = sponsorResult[0];
        // 자격 조건 확인
        if (getTierLevel(team.current_tier) < sponsor.required_tier) {
            await client.rollback();
            return res.status(400).json({ error: '티어 조건을 만족하지 못했습니다' });
        }
        if (team.reputation < sponsor.required_reputation) {
            await client.rollback();
            return res.status(400).json({ error: '명성도 조건을 만족하지 못했습니다' });
        }
        // 이미 계약 중인지 확인
        const [existingResult] = await client.query('SELECT * FROM team_sponsors WHERE team_id = ? AND sponsor_id = ? AND contract_end_date > NOW()', [team.id, sponsorId]);
        if (existingResult.length > 0) {
            await client.rollback();
            return res.status(400).json({ error: '이미 계약 중인 스폰서입니다' });
        }
        // 같은 타입의 스폰서가 있는지 확인
        const [sameTypeResult] = await client.query(`
      SELECT ts.*
      FROM team_sponsors ts
      JOIN sponsors s ON ts.sponsor_id = s.id
      WHERE ts.team_id = ?
        AND s.sponsor_type = ?
        AND ts.contract_end_date > NOW()
    `, [team.id, sponsor.sponsor_type]);
        if (sameTypeResult.length > 0) {
            await client.rollback();
            return res.status(400).json({ error: '같은 타입의 스폰서가 이미 계약되어 있습니다' });
        }
        // 계약 생성
        const contractEndDate = new Date();
        contractEndDate.setMonth(contractEndDate.getMonth() + (durationMonths || 3));
        await client.query(`
      INSERT INTO team_sponsors (
        team_id,
        sponsor_id,
        contract_start_date,
        contract_end_date,
        monthly_payment,
        bonus_received
      ) VALUES (?, ?, NOW(), ?, ?, 0)
    `, [team.id, sponsorId, contractEndDate, sponsor.monthly_payment]);
        await client.commit();
        res.json({
            message: '스폰서 계약이 완료되었습니다!',
            sponsor: sponsor.sponsor_name,
            monthlyPayment: sponsor.monthly_payment,
            contractEndDate,
        });
    }
    catch (error) {
        await client.rollback();
        console.error('스폰서 계약 실패:', error);
        res.status(500).json({ error: '스폰서 계약에 실패했습니다' });
    }
    finally {
        client.release();
    }
});
// 스폰서 계약 해지
router.post('/cancel/:contractId', auth_1.isAuthenticated, async (req, res) => {
    const client = await (0, db_1.getConnection)();
    try {
        const userId = req.user?.id;
        const { contractId } = req.params;
        await client.beginTransaction();
        // 팀 정보 조회
        const [teamResult] = await client.query('SELECT id FROM teams WHERE user_id = ?', [userId]);
        const teamId = teamResult[0].id;
        // 계약 정보 조회
        const [contractResult] = await client.query('SELECT * FROM team_sponsors WHERE id = ? AND team_id = ?', [contractId, teamId]);
        if (contractResult.length === 0) {
            await client.rollback();
            return res.status(404).json({ error: '계약을 찾을 수 없습니다' });
        }
        // 계약 해지 (즉시 종료)
        await client.query('UPDATE team_sponsors SET contract_end_date = NOW() WHERE id = ?', [contractId]);
        await client.commit();
        res.json({ message: '스폰서 계약이 해지되었습니다' });
    }
    catch (error) {
        await client.rollback();
        console.error('계약 해지 실패:', error);
        res.status(500).json({ error: '계약 해지에 실패했습니다' });
    }
    finally {
        client.release();
    }
});
// 월별 스폰서 수익 정산 (크론잡으로 실행)
router.post('/monthly-payment', auth_1.isAuthenticated, async (req, res) => {
    const client = await (0, db_1.getConnection)();
    try {
        await client.beginTransaction();
        // 활성 계약 모두 조회
        const [contractsResult] = await client.query(`
      SELECT ts.*, t.id as team_id
      FROM team_sponsors ts
      JOIN teams t ON ts.team_id = t.id
      WHERE ts.contract_end_date > NOW()
        AND ts.last_payment_date < DATE_FORMAT(NOW(), '%Y-%m-01')
    `);
        let totalPaid = 0;
        for (const contract of contractsResult) {
            // 월별 금액 지급
            await client.query('UPDATE teams SET balance = balance + ? WHERE id = ?', [contract.monthly_payment, contract.team_id]);
            // 마지막 지급일 업데이트
            await client.query('UPDATE team_sponsors SET last_payment_date = NOW() WHERE id = ?', [contract.id]);
            totalPaid += contract.monthly_payment;
        }
        await client.commit();
        res.json({
            message: '월별 스폰서 수익이 정산되었습니다',
            totalContracts: contractsResult.length,
            totalPaid,
        });
    }
    catch (error) {
        await client.rollback();
        console.error('월별 정산 실패:', error);
        res.status(500).json({ error: '정산에 실패했습니다' });
    }
    finally {
        client.release();
    }
});
// 보너스 지급 (특정 조건 달성 시)
async function payBonusIfConditionMet(teamId, condition, value) {
    const client = await (0, db_1.getConnection)();
    try {
        await client.beginTransaction();
        // 해당 팀의 활성 스폰서 계약 조회
        const [contractsResult] = await client.query(`
      SELECT ts.*, s.bonus_condition, s.bonus_amount
      FROM team_sponsors ts
      JOIN sponsors s ON ts.sponsor_id = s.id
      WHERE ts.team_id = ?
        AND ts.contract_end_date > NOW()
        AND s.bonus_condition = ?
    `, [teamId, condition]);
        for (const contract of contractsResult) {
            // 보너스 지급
            await client.query('UPDATE teams SET balance = balance + ? WHERE id = ?', [contract.bonus_amount, teamId]);
            // 보너스 수령 기록
            await client.query('UPDATE team_sponsors SET bonus_received = bonus_received + ? WHERE id = ?', [contract.bonus_amount, contract.id]);
        }
        await client.commit();
    }
    catch (error) {
        await client.rollback();
        console.error('보너스 지급 실패:', error);
    }
    finally {
        client.release();
    }
}
// 티어 레벨 변환 함수
function getTierLevel(tier) {
    const tierMap = {
        'BRONZE': 1,
        'SILVER': 2,
        'GOLD': 3,
        'PLATINUM': 4,
        'DIAMOND': 5,
        'MASTER': 6,
        'GRANDMASTER': 7,
        'CHALLENGER': 8,
    };
    return tierMap[tier] || 1;
}
exports.default = router;
//# sourceMappingURL=sponsors.js.map