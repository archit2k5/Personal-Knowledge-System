import { Router } from 'express';
import authRoutes from './auth.routes.js';
import chatRoutes from './chat.routes.js';
import messageRoutes from './message.routes.js';
import documentRoutes from './document.routes.js';
import searchRoutes from './search.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use('/', healthRoutes);
router.use('/', authRoutes);
router.use('/', chatRoutes);
router.use('/', messageRoutes);
router.use('/', documentRoutes);
router.use('/', searchRoutes);

export default router;

