import express from 'express';
import * as beatmapController from '../controllers/beatmapController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/', requireAuth, requireAdmin, beatmapController.createBeatmap);
router.get('/:id', beatmapController.getBeatmap);
router.get('/song/:song_id', beatmapController.getBeatmapsBySong);
router.put('/:id', requireAuth, requireAdmin, beatmapController.updateBeatmap);
router.delete('/:id', requireAuth, requireAdmin, beatmapController.deleteBeatmap);

export default router;
