import prisma from "../prismaClient";

class BreedingSowsService {
  async getAll() {
    return await prisma.breedingsows.findMany({
      include: { status: true, breed: true },
    });
  }

  async getById(id: number) {
    return await prisma.breedingsows.findUnique({
      where: { sow_id: id },
      include: { status: true, breed: true },
    });
  }

  /**
   * Checks whether a sow already exists with the provided tag number.
   * The comparison normalizes both the stored value and the received value by
   * removing spaces and ignoring letter casing.
   * Returns `true` if a normalized match is found; otherwise, `false`.
   */
  async checkSowTagNumberExists(sowTagNumber: string): Promise<boolean> {
    const normalizedSowTagNumber = sowTagNumber.replace(/\s+/g, "").toLowerCase();

    const [result] = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM breedingsows
        WHERE regexp_replace(lower(sow_tag_number), '[[:space:]]+', '', 'g') = ${normalizedSowTagNumber}
      ) AS "exists"
    `;
    return result?.exists ?? false;
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

  // async countFarrowingsBySow(sowId: number) {
  //   return await prisma.farrowings.count({
  //     where: { sow_id: sowId },
  //   });
  // }
}

export default new BreedingSowsService();
