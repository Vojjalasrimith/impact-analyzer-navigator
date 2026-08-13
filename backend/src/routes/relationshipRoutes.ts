import { Router } from 'express';
import { relationshipController } from '../controllers/relationshipController.js';

const router = Router();

router.get('/', relationshipController.listRelationships);
router.post('/', relationshipController.createRelationship);
router.delete('/:id', relationshipController.deleteRelationship);

export default router;
