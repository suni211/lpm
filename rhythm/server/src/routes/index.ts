import express from 'express';
import authRoutes from './auth';
import songRoutes from './songs';
import beatmapRoutes from './beatmaps';
import scoreRoutes from './scores';
import matchRoutes from './matches';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/songs', songRoutes);
router.use('/beatmaps', beatmapRoutes);
router.use('/scores', scoreRoutes);
router.use('/matches', matchRoutes);

export default router;
