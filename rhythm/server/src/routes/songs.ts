import express from 'express';
import * as songController from '../controllers/songController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/', requireAuth, requireAdmin, songController.upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), songController.createSong);

router.get('/', songController.getSongs);
router.get('/:id', songController.getSong);
router.put('/:id', requireAuth, requireAdmin, songController.updateSong);
router.delete('/:id', requireAuth, requireAdmin, songController.deleteSong);

export default router;
