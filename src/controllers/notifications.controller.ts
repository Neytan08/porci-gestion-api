// import { Request, Response } from "express";
// import NotificationsService from "../services/notifications.service";
// import logger from '../utils/logger';
// import ApiError from "../utils/apiError";
// import { notificationsSchema, notificationUpdateSchema } from "../schemas_validations/notificacions.schema";

// class NotificationsController {

//     async getAll(_: Request, res: Response) {
//         const notifications = await NotificationsService.getAll();
//         logger.info(`Found ${notifications.length} notifications`);
//         res.json(notifications);
//     }

//     async getById(req: Request, res: Response) {
//         const id = Number(req.params.id);
//         const notification = await NotificationsService.getById(id);
//         if (!notification) {
//             logger.warn(`Notification with id ${id} not found`);
//             throw ApiError.notFound("Notification not found");
//         }
//         logger.info(`Notification found: ${JSON.stringify(notification)}`);
//         return res.json(notification);
//     }

//     async create(req: Request, res: Response) {
//         const parseResult = notificationsSchema.safeParse(req.body);
//         if (!parseResult.success) {
//             logger.warn("Validation error on create notification");
//             throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
//         }
//         const newNotification = await NotificationsService.create(parseResult.data);
//         logger.info(`Notification created: ${JSON.stringify(newNotification)}`);
//         res.status(201).json(newNotification);
//     }

//     async update(req: Request, res: Response) {
//         const parseResult = notificationUpdateSchema.safeParse(req.body);
//         if (!parseResult.success) {
//             logger.warn("Validation error on update notification");
//             throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
//         }
//         const id = Number(req.params.id);
//         const updatedNotification = await NotificationsService.update(id, parseResult.data);
//         logger.info(`Notification updated: ${JSON.stringify(updatedNotification)}`);
//         res.json(updatedNotification);
//     }

//     async delete(req: Request, res: Response) {
//         const id = Number(req.params.id);
//         const deleted = await NotificationsService.delete(id);
//         if (!deleted) {
//             logger.warn(`Notification with id ${id} not found for delete`);
//             throw ApiError.notFound(`Notification with id ${id} not found`);
//         }
//         logger.info(`Notification with id ${id} deleted`);
//         res.status(204).send();
//     }
// }

// export default new NotificationsController();
