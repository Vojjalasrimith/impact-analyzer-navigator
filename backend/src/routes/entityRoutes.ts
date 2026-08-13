import { Router } from 'express';
import { entityController } from '../controllers/entityController.js';

const router = Router();

router.get('/', entityController.listEntities);
router.post('/', entityController.createEntity);
router.get('/:id', entityController.getEntity);
router.patch('/:id', entityController.updateEntity);
router.delete('/:id', entityController.deleteEntity);

export default router;
