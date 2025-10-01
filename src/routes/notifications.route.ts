import { Router } from 'express';
import NotificationsController from '../controllers/notifications.controller';
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get('/', asyncHandler(NotificationsController.getAll.bind(NotificationsController)));
router.get('/:id', asyncHandler(NotificationsController.getById.bind(NotificationsController)));
router.post('/', asyncHandler(NotificationsController.create.bind(NotificationsController)));
router.put('/:id', asyncHandler(NotificationsController.update.bind(NotificationsController)));
router.delete('/:id', asyncHandler(NotificationsController.delete.bind(NotificationsController)));

export default router;