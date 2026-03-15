// import { Router } from 'express';
// import NotificationsController from '../controllers/notifications.controller';
// import { asyncHandler } from "../middlewares/asyncHandler";

// const router = Router();

// /**
//  * @swagger
//  * tags:
//  *   name: Notifications
//  *   description: Operations related to user notifications
//  */

// /**
//  * @swagger
//  * /notifications:
//  *   get:
//  *     summary: Get all notifications
//  *     tags: [Notifications]
//  *     responses:
//  *       200:
//  *         description: List of all notifications
//  */
// router.get('/', asyncHandler(NotificationsController.getAll.bind(NotificationsController)));

// /**
//  * @swagger
//  * /notifications/{id}:
//  *   get:
//  *     summary: Get a notification by ID
//  *     tags: [Notifications]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: ID of the notification
//  *     responses:
//  *       200:
//  *         description: Notification found
//  *       404:
//  *         description: Notification not found
//  */
// router.get('/:id', asyncHandler(NotificationsController.getById.bind(NotificationsController)));

// /**
//  * @swagger
//  * /notifications:
//  *   post:
//  *     summary: Create a new notification
//  *     tags: [Notifications]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               title:
//  *                 type: string
//  *                 example: "System Update"
//  *               message:
//  *                 type: string
//  *                 example: "System will be down for maintenance at 2 AM"
//  *               user_id:
//  *                 type: integer
//  *                 example: 5
//  *     responses:
//  *       201:
//  *         description: Notification created successfully
//  *       400:
//  *         description: Validation error
//  */
// router.post('/', asyncHandler(NotificationsController.create.bind(NotificationsController)));

// /**
//  * @swagger
//  * /notifications/{id}:
//  *   put:
//  *     summary: Update an existing notification
//  *     tags: [Notifications]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: ID of the notification to update
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               title:
//  *                 type: string
//  *                 example: "Updated Title"
//  *               message:
//  *                 type: string
//  *                 example: "Message content updated"
//  *     responses:
//  *       200:
//  *         description: Notification updated successfully
//  *       404:
//  *         description: Notification not found
//  */
// router.put('/:id', asyncHandler(NotificationsController.update.bind(NotificationsController)));

// /**
//  * @swagger
//  * /notifications/{id}:
//  *   delete:
//  *     summary: Delete a notification by ID
//  *     tags: [Notifications]
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: ID of the notification to delete
//  *     responses:
//  *       204:
//  *         description: Notification deleted successfully
//  *       404:
//  *         description: Notification not found
//  */
// router.delete('/:id', asyncHandler(NotificationsController.delete.bind(NotificationsController)));

// export default router;
