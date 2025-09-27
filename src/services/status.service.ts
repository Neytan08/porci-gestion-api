import prisma from "../prismaClient";

class StatusService {
  async getAll() {
    return await prisma.status.findMany();
  }

  async getById(id: number) {
    return await prisma.status.findUnique({
      where: { status_id: id },
    });
  }

  async create(status_name: string) {
    return await prisma.status.create({
      data: { status_name },
    });
  }

  async update(id: number, status_name: string) {
    return await prisma.status.update({
      where: { status_id: id },
      data: { status_name },
    });
  }

  async delete(id: number) {
    return await prisma.status.delete({
      where: { status_id: id },
    });
  }
}

export default new StatusService();