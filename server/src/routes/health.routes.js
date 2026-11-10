import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/health', asyncHandler(healthController.getHealth.bind(healthController)));
router.get('/health/deps', asyncHandler(healthController.getHealthDeps.bind(healthController)));

export default router;

