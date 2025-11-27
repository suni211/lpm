import express from 'express';
import * as scoreController from '../controllers/scoreController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.post('/', requireAuth, scoreController.submitScore);
router.get('/leaderboard', scoreController.getLeaderboard);
router.get('/personal-best/:beatmap_id', requireAuth, scoreController.getPersonalBest);
router.get('/recent', scoreController.getRecentPlays);
router.get('/ranking', scoreController.getGlobalRanking);

export default router;
