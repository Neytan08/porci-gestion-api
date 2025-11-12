import prisma from "../prismaClient";

class BreedService {
  async getAll() {
    return await prisma.breed.findMany();
  }

  async getById(id: number) {
    return await prisma.breed.findUnique({
      where: { breed_id: id },
    });
  }

  async create(data: any) {
    return await prisma.breed.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return await prisma.breed.update({
      where: { breed_id: id },
      data,
    });
  }

  async delete(id: number) {
    return await prisma.breed.delete({
      where: { breed_id: id },
    });
  }
}

export default new BreedService();