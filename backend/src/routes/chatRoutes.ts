import { Router } from 'express';
import { chatController } from '../controllers/chatController.js';

const router = Router();

router.post('/', chatController.handleMessage);

export default router;
