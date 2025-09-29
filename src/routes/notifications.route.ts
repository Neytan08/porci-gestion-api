import { Router } from 'express';
import NotificationsController from '../controllers/notifications.controller';

const router = Router();

router.get('/', NotificationsController.getAll);
router.get('/:id', NotificationsController.getById);
router.post('/', NotificationsController.create);
router.put('/:id', NotificationsController.update);
router.delete('/:id', NotificationsController.delete);

export default router;