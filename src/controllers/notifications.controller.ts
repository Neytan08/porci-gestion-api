import { Request, Response } from "express";
import NotificationsService from "../services/notifications.service";
import logger from '../utils/logger';

class NotificationsController {

    async getAll(_: Request, res: Response) {
        logger.info("Fetching all notifications");
        const notifications = await NotificationsService.getAll();
        logger.info(`Found ${notifications.length} notifications`);
        res.json(notifications);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Fetching notification with id: ${id}`);
        const notification = await NotificationsService.getById(id);
        if (!notification) {
            logger.warn(`Notification with id ${id} not found`);
            return res.status(404).json({ message: "Notification not found" });
        }
        logger.info(`Notification found: ${JSON.stringify(notification)}`);
        return res.json(notification);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        logger.info(`Creating notification with data: ${JSON.stringify(data)}`);
        const newNotification = await NotificationsService.create(data);
        logger.info(`Notification created: ${JSON.stringify(newNotification)}`);
        res.status(201).json(newNotification);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        logger.info(`Updating notification id ${id} with data: ${JSON.stringify(data)}`);
        const updatedNotification = await NotificationsService.update(id, data);
        logger.info(`Notification updated: ${JSON.stringify(updatedNotification)}`);
        res.json(updatedNotification);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Deleting notification with id: ${id}`);
        await NotificationsService.delete(id);
        logger.info(`Notification with id ${id} deleted`);
        res.status(204).send();
    }
}

export default new NotificationsController();