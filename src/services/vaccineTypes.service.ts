import prisma from "../prismaClient";

class VaccineTypesService {

    async getAll() {
        return await prisma.vaccinetypes.findMany();
    }

    async getById(id: number) {
        return await prisma.vaccinetypes.findUnique({
            where: { vaccine_id: id },
        });
    }

    async create(data: any) {
        return await prisma.vaccinetypes.create({
            data,
        });
    }

    async update(id: number, data: any) {
        return await prisma.vaccinetypes.update({
            where: { vaccine_id: id },
            data,
        });
    }

    async delete(id: number) {
        return await prisma.vaccinetypes.delete({
            where: { vaccine_id: id },
        });
    }
}

export default new VaccineTypesService();