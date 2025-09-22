import { Router } from 'express';
import airQualityRoutes from './airQuality';
import trafficRoutes from './traffic';
import dengueRoutes from './dengue';
import locationRoutes from './location';

import food from './food';
import personalization from './personalization';
import aiRoutes from './ai';

const router = Router();

// API Routes
router.use('/air-quality', airQualityRoutes);
router.use('/traffic', trafficRoutes);
router.use('/dengue', dengueRoutes);
router.use('/location', locationRoutes);
router.use('/food', food);
router.use('/personalization', personalization);
router.use('/ai', aiRoutes);

// General health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Digital Twin Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
