import express from 'express';
import { getDashboardStats, getAnalytics, getAlerts } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/alerts', getAlerts);

export default router;
