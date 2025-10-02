import prisma from "../prismaClient";

class BreedingSowsService {
  async getAll() {
    return await prisma.breedingsows.findMany({
      include: { status: true },
    });
  }

  async getById(id: number) {
    return await prisma.breedingsows.findUnique({
      where: { sow_id: id },
      include: { status: true },
    });
  }

  async create(data: any) {
    return await prisma.breedingsows.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return await prisma.breedingsows.update({
      where: { sow_id: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.breedingsows.delete({
      where: { sow_id: id },
    });
  }

  async getAllByStatusId(statusId: number) {
  return await prisma.breedingsows.findMany({
    where: { status_id: statusId },
    // include: { status: true }, // optional, if you want to include status details
  });
  }

  async countFarrowingsBySow(sowId: number) {
    return await prisma.farrowings.count({
      where: { sow_id: sowId },
    });
  }
}

export default new BreedingSowsService();