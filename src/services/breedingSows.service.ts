import { Prisma } from "@prisma/client";
import prisma from "../prismaClient";
import ApiError from "../utils/apiError";

type ExistsResult = {
  exists: boolean;
};

const DUPLICATE_SOW_TAG_NUMBER_MESSAGE =
  "Cannot create breeding sow: a record with the same sow_tag_number already exists";

class BreedingSowsService {
  private normalizeSowTagNumber(sowTagNumber: string) {
    return sowTagNumber.replace(/\s+/g, "").toLowerCase();
  }

  /**
   * Checks whether any sow already exists with a tag number equivalent to the provided one.
   * The comparison ignores spaces and letter casing so the validation rule is consistent
   * between the explicit availability check and the create flow.
   */
  private async hasSowWithSameTagNumber(sowTagNumber: string): Promise<boolean> {
    const normalizedSowTagNumber = this.normalizeSowTagNumber(sowTagNumber);

    const [result] = await prisma.$queryRaw<ExistsResult[]>`
      SELECT EXISTS (
        SELECT 1
        FROM breedingsows
        WHERE regexp_replace(lower(sow_tag_number), '[[:space:]]+', '', 'g') = ${normalizedSowTagNumber}
      ) AS "exists"
    `;

    return result?.exists ?? false;
  }

  /**
   * Prevents creating duplicated breeding sows and returns a business-level error message
   * instead of relying on the generic database unique-constraint response.
   */
  private async ensureSowTagNumberIsAvailable(sowTagNumber: string) {
    const sowAlreadyExists = await this.hasSowWithSameTagNumber(sowTagNumber);

    if (sowAlreadyExists) {
      throw ApiError.conflict(DUPLICATE_SOW_TAG_NUMBER_MESSAGE);
    }
  }

  async getAll() {
    return await prisma.breedingsows.findMany({
      include: { breed: true },
    });
  }

  async getById(id: number) {
    return await prisma.breedingsows.findUnique({
      where: { sow_id: id },
      include: { breed: true },
    });
  }

  /**
   * Checks whether a sow already exists with the provided tag number.
   * The comparison normalizes both the stored value and the received value by
   * removing spaces and ignoring letter casing.
   * Returns `true` if a normalized match is found; otherwise, `false`.
   */
  async checkSowTagNumberExists(sowTagNumber: string): Promise<boolean> {
    return await this.hasSowWithSameTagNumber(sowTagNumber);
  }

  async create(data: Prisma.breedingsowsUncheckedCreateInput) {
    await this.ensureSowTagNumberIsAvailable(data.sow_tag_number);
    try {
      return await prisma.breedingsows.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw ApiError.conflict(DUPLICATE_SOW_TAG_NUMBER_MESSAGE);
      }

      throw error;
    }
  }

  async update(id: number, data: Prisma.breedingsowsUncheckedUpdateInput) {
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

  async getAllByStatus(status: string) {
    return await prisma.breedingsows.findMany({
      where: { status },
    });
  }

  // async countFarrowingsBySow(sowId: number) {
  //   return await prisma.farrowings.count({
  //     where: { sow_id: sowId },
  //   });
  // }
}

export default new BreedingSowsService();
