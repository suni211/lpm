import express from "express";
import { query } from "../database/db";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();

// 시설 정보 조회
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // 팀 정보 조회
    const teamResult = await query(
      "SELECT id, balance FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    // 시설 정보 조회
    let facilities = await query(
      "SELECT * FROM facilities WHERE team_id = ?",
      [team.id]
    );

    // 시설이 없으면 생성
    if (!facilities || facilities.length === 0) {
      await query(
        `INSERT INTO facilities (team_id, tactic_lab_level, tactic_lab_next_cost,
         skill_lab_level, skill_lab_next_cost, training_center_level, training_center_next_cost)
         VALUES (?, 0, 500000000, 0, 1000000000, 0, 10000000000)`,
        [team.id]
      );

      facilities = await query(
        "SELECT * FROM facilities WHERE team_id = ?",
        [team.id]
      );
    }

    res.json({
      team: {
        id: team.id,
        balance: team.balance,
      },
      facilities: facilities[0],
    });
  } catch (error) {
    console.error("시설 정보 조회 실패:", error);
    res.status(500).json({ error: "시설 정보 조회에 실패했습니다" });
  }
});

// 작전 연구소 업그레이드
router.post("/upgrade/tactic-lab", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // 팀 정보 조회
    const teamResult = await query(
      "SELECT id, balance FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    // 시설 정보 조회
    const facilitiesResult = await query(
      "SELECT * FROM facilities WHERE team_id = ?",
      [team.id]
    );

    if (!facilitiesResult || facilitiesResult.length === 0) {
      return res.status(404).json({ error: "시설 정보를 찾을 수 없습니다" });
    }

    const facilities = facilitiesResult[0];

    // 최대 레벨 체크
    if (facilities.tactic_lab_level >= 5) {
      return res.status(400).json({ error: "이미 최대 레벨입니다" });
    }

    // 업그레이드 비용 계산
    const upgradeCosts = [500000000, 1000000000, 1500000000, 2000000000, 5000000000]; // 5억, 10억, 15억, 20억, 50억
    const cost = upgradeCosts[facilities.tactic_lab_level];

    // 잔액 체크
    if (team.balance < cost) {
      return res.status(400).json({ error: "자금이 부족합니다" });
    }

    // 다음 레벨 비용 계산
    const nextLevel = facilities.tactic_lab_level + 1;
    const nextCost = nextLevel < 5 ? upgradeCosts[nextLevel] : 0;

    // 업그레이드 실행
    await query(
      "UPDATE facilities SET tactic_lab_level = ?, tactic_lab_next_cost = ? WHERE team_id = ?",
      [nextLevel, nextCost, team.id]
    );

    // 자금 차감
    await query(
      "UPDATE teams SET balance = balance - ? WHERE id = ?",
      [cost, team.id]
    );

    res.json({
      message: "작전 연구소 업그레이드 완료",
      newLevel: nextLevel,
      cost,
      nextCost,
      newBalance: team.balance - cost,
    });
  } catch (error) {
    console.error("작전 연구소 업그레이드 실패:", error);
    res.status(500).json({ error: "업그레이드에 실패했습니다" });
  }
});

// 스킬 연구소 업그레이드
router.post("/upgrade/skill-lab", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const teamResult = await query(
      "SELECT id, balance FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    const facilitiesResult = await query(
      "SELECT * FROM facilities WHERE team_id = ?",
      [team.id]
    );

    if (!facilitiesResult || facilitiesResult.length === 0) {
      return res.status(404).json({ error: "시설 정보를 찾을 수 없습니다" });
    }

    const facilities = facilitiesResult[0];

    if (facilities.skill_lab_level >= 5) {
      return res.status(400).json({ error: "이미 최대 레벨입니다" });
    }

    const upgradeCosts = [1000000000, 2000000000, 3000000000, 4000000000, 5000000000]; // 10억, 20억, 30억, 40억, 50억
    const cost = upgradeCosts[facilities.skill_lab_level];

    if (team.balance < cost) {
      return res.status(400).json({ error: "자금이 부족합니다" });
    }

    const nextLevel = facilities.skill_lab_level + 1;
    const nextCost = nextLevel < 5 ? upgradeCosts[nextLevel] : 0;

    await query(
      "UPDATE facilities SET skill_lab_level = ?, skill_lab_next_cost = ? WHERE team_id = ?",
      [nextLevel, nextCost, team.id]
    );

    await query(
      "UPDATE teams SET balance = balance - ? WHERE id = ?",
      [cost, team.id]
    );

    res.json({
      message: "스킬 연구소 업그레이드 완료",
      newLevel: nextLevel,
      cost,
      nextCost,
      newBalance: team.balance - cost,
    });
  } catch (error) {
    console.error("스킬 연구소 업그레이드 실패:", error);
    res.status(500).json({ error: "업그레이드에 실패했습니다" });
  }
});

// 집중 훈련소 업그레이드
router.post("/upgrade/training-center", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const teamResult = await query(
      "SELECT id, balance FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    const facilitiesResult = await query(
      "SELECT * FROM facilities WHERE team_id = ?",
      [team.id]
    );

    if (!facilitiesResult || facilitiesResult.length === 0) {
      return res.status(404).json({ error: "시설 정보를 찾을 수 없습니다" });
    }

    const facilities = facilitiesResult[0];

    if (facilities.training_center_level >= 1) {
      return res.status(400).json({ error: "이미 최대 레벨입니다" });
    }

    const cost = 10000000000; // 100억

    if (team.balance < cost) {
      return res.status(400).json({ error: "자금이 부족합니다" });
    }

    await query(
      "UPDATE facilities SET training_center_level = 1, training_center_next_cost = 0 WHERE team_id = ?",
      [team.id]
    );

    await query(
      "UPDATE teams SET balance = balance - ? WHERE id = ?",
      [cost, team.id]
    );

    res.json({
      message: "집중 훈련소 업그레이드 완료",
      newLevel: 1,
      cost,
      nextCost: 0,
      newBalance: team.balance - cost,
    });
  } catch (error) {
    console.error("집중 훈련소 업그레이드 실패:", error);
    res.status(500).json({ error: "업그레이드에 실패했습니다" });
  }
});

// 스킬 카드 획득 가능 여부 확인
router.get("/skill-lab/claim-status", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const teamResult = await query(
      "SELECT id FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    const facilitiesResult = await query(
      "SELECT skill_lab_level, skill_lab_last_claim FROM facilities WHERE team_id = ?",
      [team.id]
    );

    if (!facilitiesResult || facilitiesResult.length === 0) {
      return res.json({ canClaim: false, daysRemaining: 7 });
    }

    const facilities = facilitiesResult[0];

    if (facilities.skill_lab_level === 0) {
      return res.json({ canClaim: false, message: "스킬 연구소가 없습니다" });
    }

    // 레벨당 1일 단축 (7일 - 레벨)
    const claimCooldown = Math.max(1, 7 - facilities.skill_lab_level);
    const lastClaim = facilities.skill_lab_last_claim
      ? new Date(facilities.skill_lab_last_claim)
      : null;

    if (!lastClaim) {
      return res.json({ canClaim: true, daysRemaining: 0 });
    }

    const now = new Date();
    const timeDiff = now.getTime() - lastClaim.getTime();
    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    const canClaim = daysPassed >= claimCooldown;
    const daysRemaining = canClaim ? 0 : claimCooldown - daysPassed;

    res.json({ canClaim, daysRemaining, claimCooldown });
  } catch (error) {
    console.error("스킬 카드 획득 가능 여부 확인 실패:", error);
    res.status(500).json({ error: "확인에 실패했습니다" });
  }
});

// 스킬 카드 획득
router.post("/skill-lab/claim", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const teamResult = await query(
      "SELECT id FROM teams WHERE user_id = ?",
      [userId]
    );

    if (!teamResult || teamResult.length === 0) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다" });
    }

    const team = teamResult[0];

    const facilitiesResult = await query(
      "SELECT skill_lab_level, skill_lab_last_claim FROM facilities WHERE team_id = ?",
      [team.id]
    );

    if (!facilitiesResult || facilitiesResult.length === 0) {
      return res.status(404).json({ error: "시설 정보를 찾을 수 없습니다" });
    }

    const facilities = facilitiesResult[0];

    if (facilities.skill_lab_level === 0) {
      return res.status(400).json({ error: "스킬 연구소가 없습니다" });
    }

    // 쿨다운 체크
    const claimCooldown = Math.max(1, 7 - facilities.skill_lab_level);
    const lastClaim = facilities.skill_lab_last_claim
      ? new Date(facilities.skill_lab_last_claim)
      : null;

    if (lastClaim) {
      const now = new Date();
      const timeDiff = now.getTime() - lastClaim.getTime();
      const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      if (daysPassed < claimCooldown) {
        return res.status(400).json({
          error: `아직 획득할 수 없습니다. ${claimCooldown - daysPassed}일 후에 다시 시도하세요.`,
        });
      }
    }

    // 랜덤 작전 카드 선택
    const tacticCards = await query(
      "SELECT id FROM tactic_cards ORDER BY RAND() LIMIT 1"
    );

    if (!tacticCards || tacticCards.length === 0) {
      return res.status(404).json({ error: "작전 카드를 찾을 수 없습니다" });
    }

    const tacticCard = tacticCards[0];

    // 카드 추가 또는 수량 증가
    const existingCard = await query(
      "SELECT id, quantity FROM user_tactic_cards WHERE user_id = ? AND tactic_card_id = ?",
      [userId, tacticCard.id]
    );

    if (existingCard && existingCard.length > 0) {
      await query(
        "UPDATE user_tactic_cards SET quantity = quantity + 1 WHERE id = ?",
        [existingCard[0].id]
      );
    } else {
      await query(
        "INSERT INTO user_tactic_cards (user_id, tactic_card_id, quantity) VALUES (?, ?, 1)",
        [userId, tacticCard.id]
      );
    }

    // 마지막 획득 시간 업데이트
    await query(
      "UPDATE facilities SET skill_lab_last_claim = NOW() WHERE team_id = ?",
      [team.id]
    );

    // 획득한 카드 정보 조회
    const cardInfo = await query(
      "SELECT * FROM tactic_cards WHERE id = ?",
      [tacticCard.id]
    );

    res.json({
      message: "스킬 카드를 획득했습니다",
      card: cardInfo[0],
    });
  } catch (error) {
    console.error("스킬 카드 획득 실패:", error);
    res.status(500).json({ error: "스킬 카드 획득에 실패했습니다" });
  }
});

export default router;
