import { Router } from 'express';
import { impactController } from '../controllers/impactController.js';

const router = Router();

router.post('/', impactController.analyzeImpact);

export default router;
