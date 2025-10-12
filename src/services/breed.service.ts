import prisma from "../prismaClient";

class BreedService {
  async getAll() {
    return await prisma.breeds.findMany();
  }

  async getById(id: number) {
    return await prisma.breeds.findUnique({
      where: { breed_id: id },
    });
  }

  async create(data: any) {
    return await prisma.breeds.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return await prisma.breeds.update({
      where: { breed_id: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.breeds.delete({
      where: { breed_id: id },
    });
  }
}

export default new BreedService();