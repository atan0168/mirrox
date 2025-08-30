import { Router } from 'express';
import airQualityRoutes from './airQuality';
import trafficRoutes from './traffic';

const router = Router();

// API Routes
router.use('/air-quality', airQualityRoutes);
router.use('/traffic', trafficRoutes);

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
