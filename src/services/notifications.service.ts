import prisma from "../prismaClient";

class NotificationsService {

    async getAll() {
        return await prisma.notifications.findMany();
    }

    async getById(id: number) {
        return await prisma.notifications.findUnique({
            where: { notification_id: id },
        });
    }

    async create(data: any) {
        return await prisma.notifications.create({
            data,
        });
    }

    async update(id: number, data: any) {
        return await prisma.notifications.update({
            where: { notification_id: id },
            data,
        });
    }

    async delete(id: number) {
        return await prisma.notifications.delete({
            where: { notification_id: id },
        });
    }
}

export default new NotificationsService();
