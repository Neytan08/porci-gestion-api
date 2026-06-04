import prisma from "../prismaClient";

class BoarsService {
  async getAll() {
    return await prisma.boars.findMany({
      include: { breeds: true },
    });
  }
  async getById(id: number) {
    return await prisma.boars.findUnique({
      where: { boar_id: id },
      include: { breeds: true },
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

  /**
   * Checks whether a sow already exists with the provided tag number.
   * The comparison normalizes both the stored value and the received value by
   * removing spaces and ignoring letter casing.
   * Returns `true` if a normalized match is found; otherwise, `false`.
   */
  async checkBoarTagNumberExists(boarTagNumber: string): Promise<boolean> {
    const normalizedBoarTagNumber = boarTagNumber.replace(/\s+/g, "").toLowerCase();
    
    const [result] = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM boars
        WHERE regexp_replace(Lower(boar_tag_number), '[[:space:]]+', '', 'g') = ${normalizedBoarTagNumber}
      ) AS "exists"
    `;
    return result?.exists ?? false;
  }
}

export default new BoarsService();
