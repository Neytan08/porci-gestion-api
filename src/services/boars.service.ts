import prisma from "../prismaClient";

class BoarsService {
  async getAll() {
    return await prisma.boars.findMany();
  }
    async getById(id: number) { 
    return await prisma.boars.findUnique({
      where: { boar_id: id },
    });
  }
    async create(data: any) {  
    return await prisma.boars.create({
      data,
    });
  }

    async update(id: number, data: any) {
    return await prisma.boars.update({
      where: { boar_id: id },
      data,
    });
  }
    async delete(id: number) {
    return await prisma.boars.delete({
      where: { boar_id: id },
    });
  }
}

export default new BoarsService();