import { Router } from 'express';
import { graphController } from '../controllers/graphController.js';

const router = Router();

router.get('/', graphController.getGraph);

export default router;
