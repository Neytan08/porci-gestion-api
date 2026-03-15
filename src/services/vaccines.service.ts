import prisma from "../prismaClient";

class VaccinesService {
  async getAll() {
    return await prisma.vaccines.findMany();
  }

  async getById(id: number) {
    return await prisma.vaccines.findUnique({
      where: { vaccination_id: id },
    });
  }

  async create(data: any) {
    return await prisma.vaccines.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return await prisma.vaccines.update({
      where: { vaccination_id: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.vaccines.delete({
      where: { vaccination_id: id },
    });
  }

  async getVaccinesByCowId(sowId: number) {
    return await prisma.vaccines.findMany({
      where: { sow_id: sowId },
    });
  }

  async getVaccinesByBoarId(boarId: number) {
    return await prisma.vaccines.findMany({
      where: { boar_id: boarId },
    });
  }
}

export default new VaccinesService();
