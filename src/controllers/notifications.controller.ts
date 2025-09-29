import { Request, Response } from "express";
import NotificationsService from "../services/notifications.service";

class NotificationsController {

    async getAll(_: Request, res: Response) {
        const notifications = await NotificationsService.getAll();
        res.json(notifications);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const notification = await NotificationsService.getById(id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        return res.json(notification);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newNotification = await NotificationsService.create(data);
        res.status(201).json(newNotification);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updatedNotification = await NotificationsService.update(id, data);
        res.json(updatedNotification);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await NotificationsService.delete(id);
        res.status(204).send();
    }
}

export default new NotificationsController();