import prisma from "../prismaClient";

class MatingEventsService {

    async getAll() {
        return await prisma.matingevents.findMany();
    }

    async getById(id: number) {
        return await prisma.matingevents.findUnique({
            where: { mating_id: id },
        });
    }

    async create(data: any) {
        return await prisma.matingevents.create({
            data,
        });
    }

    async update(id: number, data: any) {
        return await prisma.matingevents.update({
            where: { mating_id: id },
            data,
        });
    }

    async delete(id: number) {
        return await prisma.matingevents.delete({
            where: { mating_id: id },
        });
    }
}

export default new MatingEventsService();